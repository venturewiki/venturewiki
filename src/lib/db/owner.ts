import type { Octokit } from 'octokit'
import { getAdminOctokit, getPublicOctokit, GITHUB_ORG } from '@/lib/github'
import { getCached, setCache } from '@/lib/cache'

// Phase 2: ventures may live under any GitHub owner. This maps a slug → owner
// login. Misses are not cached so a later call carrying a viewer token can
// still resolve a private repo it wasn't allowed to see before.
export async function resolveBusinessOwner(
  slug: string,
  viewerOctokit?: Octokit,
): Promise<string | null> {
  const cacheKey = `owner:${slug}`
  const cached = getCached<string | null>(cacheKey)
  if (cached !== undefined && cached !== null) return cached

  const publicOctokit = getPublicOctokit()

  // Fast path: the platform org. Covers all legacy ventures.
  try {
    await publicOctokit.rest.repos.get({ owner: GITHUB_ORG, repo: slug })
    setCache(cacheKey, GITHUB_ORG)
    return GITHUB_ORG
  } catch { /* fall through */ }

  const tryRepoSearch = async (octokit: Octokit) => {
    const { data } = await octokit.rest.search.repos({
      q: `${slug} in:name topic:venturewiki`,
      per_page: 5,
    })
    return data.items.find(r => r.name === slug)?.owner?.login ?? null
  }

  try {
    const owner = await tryRepoSearch(publicOctokit)
    if (owner) { setCache(cacheKey, owner); return owner }
  } catch { /* ignore */ }

  if (viewerOctokit) {
    try {
      const owner = await tryRepoSearch(viewerOctokit)
      if (owner) { setCache(cacheKey, owner); return owner }
    } catch { /* ignore */ }
  }
  return null
}

// Picks the right Octokit for a write. The platform admin token can write to
// repos in the venturewiki org; for any other owner the caller must pass the
// viewer's OAuth-issued Octokit so GitHub's permission system enforces who is
// allowed to commit.
export function pickWriteOctokit(owner: string, viewerOctokit?: Octokit): Octokit {
  if (owner === GITHUB_ORG) return getAdminOctokit()
  if (viewerOctokit) return viewerOctokit
  throw new Error(`Sign in to edit ventures owned by ${owner}`)
}
