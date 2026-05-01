import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserOctokit, getPublicOctokit } from '@/lib/github'
import { getBusinesses } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Temporary diagnostic — remove after we confirm the private-repo path works.
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  const hasSession = !!session
  const userId = session?.user?.id
  const login = session?.user?.login
  const hasAccessToken = !!session?.accessToken
  const tokenPreview = session?.accessToken
    ? `${(session.accessToken as string).slice(0, 4)}…${(session.accessToken as string).slice(-3)}`
    : null

  const viewerOctokit = session?.accessToken
    ? getUserOctokit(session.accessToken as string)
    : undefined
  const publicOctokit = getPublicOctokit()

  const q = 'topic:venturewiki archived:false'

  let publicResult: any = null
  let viewerResult: any = null

  try {
    const r = await publicOctokit.rest.search.repos({ q, sort: 'updated', order: 'desc', per_page: 20 })
    publicResult = {
      total: r.data.total_count,
      items: r.data.items.map(it => `${it.owner?.login}/${it.name} private=${it.private}`),
    }
  } catch (e: any) {
    publicResult = { error: e?.message || String(e), status: e?.status }
  }

  if (viewerOctokit) {
    try {
      const r = await viewerOctokit.rest.search.repos({ q, sort: 'updated', order: 'desc', per_page: 20 })
      viewerResult = {
        total: r.data.total_count,
        items: r.data.items.map(it => `${it.owner?.login}/${it.name} private=${it.private}`),
      }
    } catch (e: any) {
      viewerResult = { error: e?.message || String(e), status: e?.status }
    }
  } else {
    viewerResult = { skipped: 'no viewer octokit' }
  }

  // Direct repo content reads — exercises the same path as readPlanYaml.
  const targets = [
    { owner: 'ABFS-Inc', repo: 'phones-pros' },
    { owner: 'venturewiki', repo: 'matchmaking-concierge-ai-mnlby0ks' },
    { owner: 'venturewiki', repo: 'venturewiki' },
  ]
  const directReads: any[] = []
  for (const t of targets) {
    const tries: any = { target: `${t.owner}/${t.repo}` }
    try {
      const { data } = await publicOctokit.rest.repos.getContent({
        owner: t.owner,
        repo: t.repo,
        path: '.venturewiki/plan.yaml',
      })
      tries.public = {
        type: (data as any).type,
        hasContent: 'content' in (data as any),
        size: (data as any).size,
      }
    } catch (e: any) {
      tries.public = { error: e?.message || String(e), status: e?.status }
    }
    if (viewerOctokit) {
      try {
        const { data } = await viewerOctokit.rest.repos.getContent({
          owner: t.owner,
          repo: t.repo,
          path: '.venturewiki/plan.yaml',
        })
        tries.viewer = {
          type: (data as any).type,
          hasContent: 'content' in (data as any),
          size: (data as any).size,
        }
      } catch (e: any) {
        tries.viewer = { error: e?.message || String(e), status: e?.status }
      }
    }
    directReads.push(tries)
  }

  // Full getBusinesses path — what the real /api/businesses uses.
  let getBusinessesResult: any = null
  try {
    const { businesses } = await getBusinesses({ pageSize: 50, viewerOctokit })
    getBusinessesResult = businesses.map((b: any) => ({
      slug: b.slug,
      owner: b.owner,
      isPublic: b.isPublic,
      hasCover: !!b.cover,
    }))
  } catch (e: any) {
    getBusinessesResult = { error: e?.message || String(e), status: e?.status, stack: e?.stack?.split('\n').slice(0, 5) }
  }

  return NextResponse.json({
    hasSession, userId, login, hasAccessToken, tokenPreview,
    query: q,
    publicResult,
    viewerResult,
    directReads,
    getBusinessesResult,
  })
}
