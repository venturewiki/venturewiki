import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserOctokit, getRepoContent } from '@/lib/github'

export const dynamic = 'force-dynamic'

export interface MyRepo {
  fullName: string
  owner: string
  name: string
  description: string
  visibility: 'public' | 'private'
  isFork: boolean
  htmlUrl: string
  pushedAt: string
  hasVentureWiki: boolean
  hasTopic: boolean
}

export interface MyReposResponse {
  scopes: string[]              // granted OAuth scopes
  missingScopes: string[]       // scopes we need but the token lacks
  truncated: boolean            // true if we hit the safety cap
  repos: MyRepo[]
}

const REQUIRED_SCOPES = ['repo', 'read:org']
const HARD_LIMIT_REPOS = 1000

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const octokit = getUserOctokit(session.accessToken)

    // Detect granted scopes from the X-OAuth-Scopes header on a tiny call
    const me = await octokit.rest.users.getAuthenticated()
    const grantedHeader = (me.headers['x-oauth-scopes'] as string | undefined) || ''
    const scopes = grantedHeader.split(',').map(s => s.trim()).filter(Boolean)
    const grantedSet = new Set(scopes)
    const missingScopes = REQUIRED_SCOPES.filter(s => {
      // 'repo' implies 'public_repo'; 'admin:org' or 'write:org' imply 'read:org'.
      if (s === 'repo') return !grantedSet.has('repo')
      if (s === 'read:org') return !grantedSet.has('read:org') && !grantedSet.has('admin:org') && !grantedSet.has('write:org')
      return !grantedSet.has(s)
    })

    // Paginate all affiliated repos
    const all = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
      per_page: 100,
      sort: 'pushed',
      affiliation: 'owner,collaborator,organization_member',
      visibility: 'all',
    })
    const truncated = all.length > HARD_LIMIT_REPOS
    const repos = all.slice(0, HARD_LIMIT_REPOS)

    // Probe `.venturewiki` per repo with bounded concurrency
    const results: MyRepo[] = []
    const concurrency = 10
    let cursor = 0
    const worker = async () => {
      while (cursor < repos.length) {
        const r = repos[cursor++]
        const topics: string[] = (r.topics as string[] | undefined) || []
        const hasTopic = topics.includes('venturewiki')
        // If the repo already has the venturewiki topic, trust it — skip the
        // expensive content probe. Only probe repos without the topic.
        let hasVW = hasTopic
        if (!hasTopic) {
          try {
            await getRepoContent(octokit, { owner: r.owner.login, repo: r.name, path: '.venturewiki' })
            hasVW = true
          } catch {
            hasVW = false
          }
        }
        results.push({
          fullName: r.full_name,
          owner: r.owner.login,
          name: r.name,
          description: r.description || '',
          visibility: r.private ? 'private' : 'public',
          isFork: !!r.fork,
          htmlUrl: r.html_url,
          pushedAt: r.pushed_at || r.updated_at || '',
          hasVentureWiki: hasVW,
          hasTopic,
        })
        // Auto-heal: if .venturewiki exists but the topic is missing, add it
        // so the "All Ventures" directory picks up this repo.
        if (hasVW && !hasTopic) {
          octokit.rest.repos.replaceAllTopics({
            owner: r.owner.login, repo: r.name,
            names: [...topics, 'venturewiki'],
          }).catch(() => {}) // fire-and-forget, best-effort
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker))

    results.sort((a, b) => {
      if (a.hasVentureWiki !== b.hasVentureWiki) return a.hasVentureWiki ? -1 : 1
      return (b.pushedAt || '').localeCompare(a.pushedAt || '')
    })

    const payload: MyReposResponse = { scopes, missingScopes, truncated, repos: results }
    return NextResponse.json(payload)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list repos' }, { status: 500 })
  }
}
