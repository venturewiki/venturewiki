import { NextRequest, NextResponse } from 'next/server'
import { getPublicOctokit } from '@/lib/github'

export const dynamic = 'force-dynamic'

export interface GhUserHit {
  login: string
  name?: string
  avatarUrl: string
  htmlUrl: string
}

// Simple in-process cache to avoid hammering the GitHub search API as the
// user types (60-second TTL per query string).
const cache = new Map<string, { ts: number; hits: GhUserHit[] }>()
const TTL_MS = 60_000

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  if (!q) return NextResponse.json([])

  const now = Date.now()
  const cached = cache.get(q.toLowerCase())
  if (cached && now - cached.ts < TTL_MS) return NextResponse.json(cached.hits)

  try {
    const octokit = getPublicOctokit()
    const { data } = await octokit.rest.search.users({
      q: `${q} in:login in:name`,
      per_page: 8,
    })
    const hits: GhUserHit[] = data.items.map(u => ({
      login: u.login,
      avatarUrl: u.avatar_url,
      htmlUrl: u.html_url,
    }))
    cache.set(q.toLowerCase(), { ts: now, hits })
    return NextResponse.json(hits)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Search failed' }, { status: 500 })
  }
}
