import type { Octokit } from 'octokit'
import { getPublicOctokit, getRepoContent, putRepoContent } from '@/lib/github'
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
  path: string
  name: string
  size: number
}

function isSafeName(filePath: string): boolean {
  if (filePath.includes('..') || filePath.includes('/') || filePath.includes('\\')) return false
  if (SYSTEM_FILES.has(filePath)) return false
  return true
}

function validateFilename(filePath: string): void {
  if (!filePath.trim()) throw new Error('Filename is required')
  if (filePath.includes('..') || filePath.includes('/') || filePath.includes('\\')) {
    throw new Error('Filename must not contain path separators')
  }
  if (filePath.startsWith('.')) throw new Error('Filename cannot start with a dot')
  if (SYSTEM_FILES.has(filePath)) throw new Error('That filename is reserved')
  if (filePath.length > 100) throw new Error('Filename is too long')
  if (!/^[A-Za-z0-9 ._-]+$/.test(filePath)) {
    throw new Error('Filename may only contain letters, numbers, spaces, dot, dash, underscore')
  }
  if (filePath !== filePath.trim()) throw new Error('Filename cannot start or end with whitespace')
}

export async function listVentureFiles(slug: string): Promise<VentureFile[]> {
  const cacheKey = `vwfiles:${slug}`
  const cached = getCached<VentureFile[]>(cacheKey)
  if (cached) return cached

  const owner = await resolveBusinessOwner(slug)
  if (!owner) return []

  try {
    const { data } = await getRepoContent(getPublicOctokit(), {
      owner, repo: slug, path: '.venturewiki',
    })
    if (!Array.isArray(data)) return []
    const files = data
      .filter(item => item.type === 'file' && !SYSTEM_FILES.has(item.name))
      .map(item => ({ path: item.name, name: item.name, size: item.size || 0 }))
    setCache(cacheKey, files)
    return files
  } catch {
    return []
  }
}

export async function createVentureFile(
  slug: string,
  filePath: string,
  content: string,
  message: string,
  viewerOctokit?: Octokit,
): Promise<void> {
  validateFilename(filePath)
  const owner = await resolveBusinessOwner(slug)
  if (!owner) throw new Error('Business not found')
  const octokit = pickWriteOctokit(owner, viewerOctokit)
  await putRepoContent(octokit, {
    owner, repo: slug, path: `.venturewiki/${filePath}`,
    message, content: encodeContent(content),
  })
  invalidateCache(`vwfiles:${slug}`)
  invalidateCache(`vwfile:${slug}:${filePath}`)
}

export async function readVentureFile(
  slug: string,
  filePath: string,
): Promise<{ name: string; content: string } | null> {
  if (!isSafeName(filePath)) return null

  const cacheKey = `vwfile:${slug}:${filePath}`
  const cached = getCached<{ name: string; content: string }>(cacheKey)
  if (cached) return cached

  const owner = await resolveBusinessOwner(slug)
  if (!owner) return null

  try {
    const { data } = await getRepoContent(getPublicOctokit(), {
      owner, repo: slug, path: `.venturewiki/${filePath}`,
    })
    if ('content' in data && data.type === 'file') {
      const result = { name: data.name, content: decodeContent(data.content) }
      setCache(cacheKey, result)
      return result
    }
    return null
  } catch {
    return null
  }
}

export async function readVentureFileBuffer(
  slug: string,
  filePath: string,
): Promise<{ name: string; bytes: Buffer } | null> {
  if (!isSafeName(filePath)) return null

  const owner = await resolveBusinessOwner(slug)
  if (!owner) return null

  try {
    const { data } = await getRepoContent(getPublicOctokit(), {
      owner, repo: slug, path: `.venturewiki/${filePath}`,
    })
    if ('content' in data && data.type === 'file') {
      return { name: data.name, bytes: Buffer.from(data.content, 'base64') }
    }
    return null
  } catch {
    return null
  }
}
