import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserOctokit } from '@/lib/github'

export const dynamic = 'force-dynamic'

export interface MyRepo {
  fullName: string         // owner/name
  owner: string
  name: string
  description: string
  visibility: 'public' | 'private'
  isFork: boolean
  htmlUrl: string
  pushedAt: string
  hasVentureWiki: boolean
  hasTopic: boolean        // has the "venturewiki" topic
}

const HARD_LIMIT_REPOS = 200 // cap for safety on first scan

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const octokit = getUserOctokit(session.accessToken)

    // Pull up to HARD_LIMIT_REPOS user-affiliated repos (owner + collaborator + org member)
    const repos: any[] = []
    let page = 1
    while (repos.length < HARD_LIMIT_REPOS) {
      const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        per_page: 100,
        page,
        sort: 'pushed',
        affiliation: 'owner,collaborator,organization_member',
        visibility: 'all',
      })
      repos.push(...data)
      if (data.length < 100) break
      page++
    }

    // Probe each repo for `.venturewiki` folder + topic. Run in parallel with concurrency cap.
    const results: MyRepo[] = []
    const concurrency = 8
    let cursor = 0
    const worker = async () => {
      while (cursor < repos.length) {
        const r = repos[cursor++]
        let hasVW = false
        try {
          await octokit.rest.repos.getContent({ owner: r.owner.login, repo: r.name, path: '.venturewiki' })
          hasVW = true
        } catch {
          hasVW = false
        }
        const topics: string[] = (r.topics as string[] | undefined) || []
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
          hasTopic: topics.includes('venturewiki'),
        })
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker))

    // Sort: onboarded first, then most recently pushed
    results.sort((a, b) => {
      if (a.hasVentureWiki !== b.hasVentureWiki) return a.hasVentureWiki ? -1 : 1
      return (b.pushedAt || '').localeCompare(a.pushedAt || '')
    })

    return NextResponse.json(results)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list repos' }, { status: 500 })
  }
}
