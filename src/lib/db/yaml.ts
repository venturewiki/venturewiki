import yaml from 'js-yaml'
import type { Octokit } from 'octokit'
import { getAdminOctokit, getPublicOctokit, getRepoContent, putRepoContent } from '@/lib/github'
import { resolveBusinessOwner, pickWriteOctokit } from './owner'

export function decodeContent(content: string): string {
  return Buffer.from(content, 'base64').toString('utf-8')
}

export function encodeContent(content: string): string {
  return Buffer.from(content, 'utf-8').toString('base64')
}

export function dumpYaml(value: any): string {
  return yaml.dump(value, { lineWidth: -1 })
}

export interface RepoYamlResult<T> {
  data: T | null
  sha: string
  raw: string
  owner: string
  parseError?: string
}

// Generic per-repo YAML store. Reads with the public/admin token (cheap and
// handles public + venturewiki-org private repos), then falls back to the
// viewer's OAuth token for private cross-owner ventures.
//
// Parse errors do NOT throw — `parseError` is set and `data` is null. This
// keeps malformed plan.yaml ventures visible (with a banner) instead of
// vanishing from listings.
export async function readRepoYaml<T>(
  slug: string,
  path: string,
  viewerOctokit?: Octokit,
): Promise<RepoYamlResult<T> | null> {
  const owner = await resolveBusinessOwner(slug, viewerOctokit)
  if (!owner) return null

  const tryRead = async (octokit: Octokit): Promise<RepoYamlResult<T> | null> => {
    const { data } = await getRepoContent(octokit, { owner, repo: slug, path })
    if (!('content' in data) || data.type !== 'file') return null
    const raw = decodeContent(data.content)
    try {
      return { data: yaml.load(raw) as T, sha: data.sha, raw, owner }
    } catch (err: any) {
      return {
        data: null,
        sha: data.sha,
        raw,
        owner,
        parseError: (err?.message || String(err)).split('\n')[0],
      }
    }
  }

  try {
    const result = await tryRead(getPublicOctokit())
    if (result) return result
  } catch { /* fall through */ }

  if (viewerOctokit) {
    try {
      const result = await tryRead(viewerOctokit)
      if (result) return result
    } catch { /* not visible to viewer either */ }
  }
  return null
}

// Read with a soft default — empty list/object if the file doesn't exist yet.
// Used by candidates/validations/investments where the file is created on
// first write.
export async function readRepoYamlOr<T>(
  slug: string,
  path: string,
  fallback: T,
  viewerOctokit?: Octokit,
): Promise<{ data: T; sha: string }> {
  const result = await readRepoYaml<T>(slug, path, viewerOctokit)
  if (result && result.data != null) return { data: result.data, sha: result.sha }
  return { data: fallback, sha: result?.sha || '' }
}

export async function writeRepoYaml(
  slug: string,
  path: string,
  message: string,
  value: any,
  sha?: string,
  viewerOctokit?: Octokit,
): Promise<void> {
  const owner = await resolveBusinessOwner(slug, viewerOctokit)
  if (!owner) throw new Error('Business not found')
  const octokit = pickWriteOctokit(owner, viewerOctokit)
  await putRepoContent(octokit, {
    owner,
    repo: slug,
    path,
    message,
    content: encodeContent(dumpYaml(value)),
    ...(sha ? { sha } : {}),
  })
}

// Write a verbatim string (no YAML round-trip). Used by the in-app raw editor
// when the file is malformed and must be saved exactly as the user typed it.
export async function writeRepoFile(
  slug: string,
  path: string,
  message: string,
  rawContent: string,
  viewerOctokit?: Octokit,
): Promise<void> {
  const owner = await resolveBusinessOwner(slug, viewerOctokit)
  if (!owner) throw new Error('Business not found')
  const octokit = pickWriteOctokit(owner, viewerOctokit)

  let existingSha: string | undefined
  try {
    const { data } = await getRepoContent(octokit, { owner, repo: slug, path })
    if ('sha' in (data as any)) existingSha = (data as any).sha
  } catch { /* file may not exist */ }

  await putRepoContent(octokit, {
    owner,
    repo: slug,
    path,
    message,
    content: encodeContent(rawContent),
    ...(existingSha ? { sha: existingSha } : {}),
  })
}

// Read a file from the venturewiki org meta repo using the admin token only.
// Used by the users registry which lives on the platform side, not per-venture.
export async function readAdminYaml<T>(
  owner: string,
  repo: string,
  path: string,
): Promise<{ data: T | null; sha: string }> {
  try {
    const { data } = await getRepoContent(getAdminOctokit(), { owner, repo, path })
    if ('content' in data && data.type === 'file') {
      return { data: yaml.load(decodeContent(data.content)) as T, sha: data.sha }
    }
  } catch { /* file may not exist yet */ }
  return { data: null, sha: '' }
}

export async function writeAdminYaml(
  owner: string,
  repo: string,
  path: string,
  message: string,
  value: any,
  sha?: string,
): Promise<void> {
  await putRepoContent(getAdminOctokit(), {
    owner,
    repo,
    path,
    message,
    content: encodeContent(dumpYaml(value)),
    ...(sha ? { sha } : {}),
  })
}
