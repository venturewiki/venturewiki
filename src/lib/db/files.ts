import type { Octokit } from 'octokit'
import { getPublicOctokit, getRepoContent, putRepoContent, deleteRepoContent } from '@/lib/github'
import { getCached, setCache, invalidateCache } from '@/lib/cache'
import { resolveBusinessOwner, pickWriteOctokit } from './owner'
import { decodeContent, encodeContent } from './yaml'

// System files surfaced via dedicated tabs/APIs — excluded from the generic
// file list so they don't appear twice in the venture detail page sidebar.
const SYSTEM_FILES = new Set([
  'plan.yaml',
  'candidates.yaml',
  'validations.yaml',
  'investments.yaml',
  'value.yaml',
])

export interface VentureFile {
  path: string   // relative to .venturewiki, e.g. "docs/readme.md"
  name: string   // basename e.g. "readme.md"
  size: number
  type: 'file' | 'dir'
}

// ── Validation helpers ────────────────────────────────────────────────────────

/** Validates a single path segment (file or folder name). */
function validateSegment(seg: string): void {
  if (!seg.trim()) throw new Error('Name is required')
  if (seg.startsWith('.')) throw new Error('Name cannot start with a dot')
  if (seg.length > 100) throw new Error('Name is too long')
  if (!/^[A-Za-z0-9 ._-]+$/.test(seg)) {
    throw new Error('Name may only contain letters, numbers, spaces, dot, dash, underscore')
  }
  if (seg !== seg.trim()) throw new Error('Name cannot start or end with whitespace')
}

/** Validates a full file path (may include slashes for subfolders). */
export function validateFilePath(filePath: string): void {
  if (!filePath.trim()) throw new Error('Filename is required')
  if (filePath.includes('..')) throw new Error('Path cannot contain ".."')
  if (filePath.includes('\\')) throw new Error('Path cannot contain backslashes')
  const segments = filePath.split('/').filter(Boolean)
  if (segments.length === 0) throw new Error('Filename is required')
  for (const seg of segments) validateSegment(seg)
  const basename = segments[segments.length - 1]
  if (SYSTEM_FILES.has(basename)) throw new Error('That filename is reserved')
}

/** Validates a folder name (single segment, no slashes). */
function validateFolderName(name: string): void {
  if (name.includes('/') || name.includes('\\')) {
    throw new Error('Folder name cannot contain slashes')
  }
  validateSegment(name)
}

function isSafePath(filePath: string): boolean {
  if (filePath.includes('..') || filePath.includes('\\')) return false
  const basename = filePath.split('/').pop() || ''
  if (SYSTEM_FILES.has(basename)) return false
  return true
}

// ── List (recursive, returns flat list with type) ────────────────────────────

async function listDirRecursive(
  octokit: Octokit,
  owner: string,
  repo: string,
  dirPath: string,
  prefix: string,
): Promise<VentureFile[]> {
  try {
    const { data } = await getRepoContent(octokit, { owner, repo, path: dirPath })
    if (!Array.isArray(data)) return []

    const results: VentureFile[] = []
    for (const item of data) {
      if (SYSTEM_FILES.has(item.name)) continue
      const relPath = prefix ? `${prefix}/${item.name}` : item.name
      if (item.type === 'dir') {
        results.push({ path: relPath, name: item.name, size: 0, type: 'dir' })
        const children = await listDirRecursive(octokit, owner, repo, `${dirPath}/${item.name}`, relPath)
        results.push(...children)
      } else if (item.type === 'file') {
        results.push({ path: relPath, name: item.name, size: item.size || 0, type: 'file' })
      }
    }
    return results
  } catch {
    return []
  }
}

export async function listVentureFiles(slug: string): Promise<VentureFile[]> {
  const cacheKey = `vwfiles:${slug}`
  const cached = getCached<VentureFile[]>(cacheKey)
  if (cached) return cached

  const owner = await resolveBusinessOwner(slug)
  if (!owner) return []

  const files = await listDirRecursive(getPublicOctokit(), owner, slug, '.venturewiki', '')
  setCache(cacheKey, files)
  return files
}

// ── Create file ──────────────────────────────────────────────────────────────

export async function createVentureFile(
  slug: string,
  filePath: string,
  content: string,
  message: string,
  viewerOctokit?: Octokit,
): Promise<void> {
  validateFilePath(filePath)
  const owner = await resolveBusinessOwner(slug)
  if (!owner) throw new Error('Business not found')
  const octokit = pickWriteOctokit(owner, viewerOctokit)
  await putRepoContent(octokit, {
    owner, repo: slug, path: `.venturewiki/${filePath}`,
    message, content: encodeContent(content),
  })
  invalidateCache(`vwfiles:${slug}`)
  invalidateCache(`vwfile:${slug}:`)
}

// ── Read file (text) ─────────────────────────────────────────────────────────

export async function readVentureFile(
  slug: string,
  filePath: string,
  viewerOctokit?: Octokit,
): Promise<{ name: string; content: string } | null> {
  if (!isSafePath(filePath)) return null

  const cacheKey = `vwfile:${slug}:${filePath}`
  // Only use the in-process cache for public (admin-token) reads; a viewer
  // token may surface a private file that the public octokit can't reach.
  if (!viewerOctokit) {
    const cached = getCached<{ name: string; content: string }>(cacheKey)
    if (cached) return cached
  }

  const owner = await resolveBusinessOwner(slug, viewerOctokit)
  if (!owner) return null

  try {
    const { data } = await getRepoContent(viewerOctokit ?? getPublicOctokit(), {
      owner, repo: slug, path: `.venturewiki/${filePath}`,
    })
    if ('content' in data && data.type === 'file') {
      const result = { name: data.name, content: decodeContent(data.content) }
      if (!viewerOctokit) setCache(cacheKey, result)
      return result
    }
    return null
  } catch {
    return null
  }
}

// ── Read file (binary buffer) ────────────────────────────────────────────────

export async function readVentureFileBuffer(
  slug: string,
  filePath: string,
  viewerOctokit?: Octokit,
): Promise<{ name: string; bytes: Buffer } | null> {
  if (!isSafePath(filePath)) return null

  const owner = await resolveBusinessOwner(slug, viewerOctokit)
  if (!owner) return null

  try {
    const { data } = await getRepoContent(viewerOctokit ?? getPublicOctokit(), {
      owner, repo: slug, path: `.venturewiki/${filePath}`,
    })
    if (!('content' in data && data.type === 'file')) return null

    // GitHub API only returns inline base64 content for files ≤ 1 MB.
    // For larger files it returns content: "" with encoding: "none" but
    // provides a download_url (which includes a temp token for private repos).
    const fileData = data as typeof data & { download_url?: string | null }
    if (data.content) {
      return { name: data.name, bytes: Buffer.from(data.content, 'base64') }
    }
    if (fileData.download_url) {
      const res = await fetch(fileData.download_url)
      if (!res.ok) return null
      return { name: data.name, bytes: Buffer.from(await res.arrayBuffer()) }
    }
    return null
  } catch {
    return null
  }
}

// ── Move / rename file ──────────────────────────────────────────────────────

export async function moveVentureFile(
  slug: string,
  srcPath: string,
  destPath: string,
  message: string,
  viewerOctokit?: Octokit,
): Promise<void> {
  validateFilePath(destPath)
  if (!isSafePath(srcPath)) throw new Error('Invalid source path')
  if (srcPath === destPath) return

  const owner = await resolveBusinessOwner(slug)
  if (!owner) throw new Error('Business not found')
  const octokit = pickWriteOctokit(owner, viewerOctokit)

  // Read source
  const { data: srcData } = await getRepoContent(octokit, {
    owner, repo: slug, path: `.venturewiki/${srcPath}`,
  })
  if (!('content' in srcData) || srcData.type !== 'file') {
    throw new Error('Source file not found')
  }

  // Create at destination (raw base64, no re-encode)
  await putRepoContent(octokit, {
    owner, repo: slug, path: `.venturewiki/${destPath}`,
    message, content: srcData.content,
  })

  // Delete source
  await deleteRepoContent(octokit, {
    owner, repo: slug, path: `.venturewiki/${srcPath}`,
    message: `Remove ${srcPath} (moved to ${destPath})`,
    sha: srcData.sha,
  })

  invalidateCache(`vwfiles:${slug}`)
  invalidateCache(`vwfile:${slug}:`)
}

// ── Folder operations ───────────────────────────────────────────────────────
// GitHub doesn't have a concept of empty directories. We create a `.gitkeep`
// placeholder to materialise the folder.

export async function createVentureFolder(
  slug: string,
  folderPath: string,
  message: string,
  viewerOctokit?: Octokit,
): Promise<void> {
  // folderPath is relative to .venturewiki, e.g. "docs" or "assets/images"
  const segments = folderPath.split('/').filter(Boolean)
  for (const seg of segments) validateFolderName(seg)

  const owner = await resolveBusinessOwner(slug)
  if (!owner) throw new Error('Business not found')
  const octokit = pickWriteOctokit(owner, viewerOctokit)

  await putRepoContent(octokit, {
    owner, repo: slug, path: `.venturewiki/${folderPath}/.gitkeep`,
    message, content: encodeContent(''),
  })
  invalidateCache(`vwfiles:${slug}`)
}

export async function renameVentureFolder(
  slug: string,
  oldPath: string,
  newPath: string,
  message: string,
  viewerOctokit?: Octokit,
): Promise<void> {
  const newSegments = newPath.split('/').filter(Boolean)
  for (const seg of newSegments) validateFolderName(seg)
  if (oldPath === newPath) return

  const owner = await resolveBusinessOwner(slug)
  if (!owner) throw new Error('Business not found')
  const octokit = pickWriteOctokit(owner, viewerOctokit)

  // List all files in old folder recursively
  const allItems = await listDirRecursive(octokit, owner, slug, `.venturewiki/${oldPath}`, '')

  const fileItems = allItems.filter(f => f.type === 'file')
  if (fileItems.length === 0) {
    // Empty folder — just move .gitkeep
    try {
      const { data } = await getRepoContent(octokit, {
        owner, repo: slug, path: `.venturewiki/${oldPath}/.gitkeep`,
      })
      if ('sha' in data) {
        await putRepoContent(octokit, {
          owner, repo: slug, path: `.venturewiki/${newPath}/.gitkeep`,
          message, content: encodeContent(''),
        })
        await deleteRepoContent(octokit, {
          owner, repo: slug, path: `.venturewiki/${oldPath}/.gitkeep`,
          message, sha: (data as any).sha,
        })
      }
    } catch { /* no .gitkeep */ }
  } else {
    // Move each file from old → new
    for (const file of fileItems) {
      const srcFull = `${oldPath}/${file.path}`
      const destFull = `${newPath}/${file.path}`
      await moveVentureFile(slug, srcFull, destFull, message, viewerOctokit)
    }
    // Also move .gitkeep if it exists
    try {
      const { data } = await getRepoContent(octokit, {
        owner, repo: slug, path: `.venturewiki/${oldPath}/.gitkeep`,
      })
      if ('sha' in data) {
        await deleteRepoContent(octokit, {
          owner, repo: slug, path: `.venturewiki/${oldPath}/.gitkeep`,
          message, sha: (data as any).sha,
        })
      }
    } catch { /* no gitkeep */ }
  }
  invalidateCache(`vwfiles:${slug}`)
  invalidateCache(`vwfile:${slug}:`)
}

export async function deleteVentureFolder(
  slug: string,
  folderPath: string,
  message: string,
  viewerOctokit?: Octokit,
): Promise<void> {
  const owner = await resolveBusinessOwner(slug)
  if (!owner) throw new Error('Business not found')
  const octokit = pickWriteOctokit(owner, viewerOctokit)

  // List all files recursively inside the folder
  const allItems = await listDirRecursive(octokit, owner, slug, `.venturewiki/${folderPath}`, '')
  const fileItems = allItems.filter(f => f.type === 'file')

  // Delete each file
  for (const file of fileItems) {
    const fullPath = `.venturewiki/${folderPath}/${file.path}`
    try {
      const { data } = await getRepoContent(octokit, { owner, repo: slug, path: fullPath })
      if ('sha' in data) {
        await deleteRepoContent(octokit, {
          owner, repo: slug, path: fullPath, message, sha: (data as any).sha,
        })
      }
    } catch { /* already gone */ }
  }

  // Also remove .gitkeep if present
  try {
    const { data } = await getRepoContent(octokit, {
      owner, repo: slug, path: `.venturewiki/${folderPath}/.gitkeep`,
    })
    if ('sha' in data) {
      await deleteRepoContent(octokit, {
        owner, repo: slug, path: `.venturewiki/${folderPath}/.gitkeep`,
        message, sha: (data as any).sha,
      })
    }
  } catch { /* no gitkeep */ }

  invalidateCache(`vwfiles:${slug}`)
  invalidateCache(`vwfile:${slug}:`)
}
