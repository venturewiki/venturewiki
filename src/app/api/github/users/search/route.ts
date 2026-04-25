import { NextRequest, NextResponse } from 'next/server'
import { getPublicOctokit } from '@/lib/github'

export const dynamic = 'force-dynamic'

export interface GhUserHit {
  login: string
  name?: string
  avatarUrl: string
  htmlUrl: string
}

// Tiny LRU-ish in-process cache for search hits (queries repeat as the user types).
const cache = new Map<string, { ts: number; hits: GhUserHit[] }>()
const TTL_MS = 60_000

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  if (!q || q.length < 1) return NextResponse.json([])

  const now = Date.now()
  const hit = cache.get(q.toLowerCase())
  if (hit && now - hit.ts < TTL_MS) return NextResponse.json(hit.hits)

  try {
    const octokit = getPublicOctokit()
    const { data } = await octokit.rest.search.users({
      q: `${q} in:login in:name`,
      per_page: 8,
    })
    // Hydrate name/avatar by hitting `users.getByUsername` is overkill; the
    // search endpoint already returns login/avatar_url/html_url, but `name` is
    // null. We can still surface what we have.
    const hits: GhUserHit[] = data.items.map(u => ({
      login: u.login,
      avatarUrl: u.avatar_url,
      htmlUrl: u.html_url,
      name: undefined,
    }))
    cache.set(q.toLowerCase(), { ts: now, hits })
    return NextResponse.json(hits)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Search failed' }, { status: 500 })
  }
}
