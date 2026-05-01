import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserOctokit, getPublicOctokit } from '@/lib/github'

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

  return NextResponse.json({
    hasSession, userId, login, hasAccessToken, tokenPreview,
    query: q,
    publicResult,
    viewerResult,
  })
}
