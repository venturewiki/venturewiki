import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserOctokit, getPublicOctokit, getRepoContent } from '@/lib/github'
import { getBusinesses } from '@/lib/db'
import yaml from 'js-yaml'

export const dynamic = 'force-dynamic'

// Temporary diagnostic — pinpoints why ABFS-Inc/phones-pros doesn't surface
// in /api/businesses on production even though both searches return it.
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  const viewerOctokit = session?.accessToken
    ? getUserOctokit(session.accessToken as string)
    : undefined
  const publicOctokit = getPublicOctokit()

  const owner = 'ABFS-Inc'
  const repo = 'phones-pros'
  const path = '.venturewiki/plan.yaml'

  const probe = async (label: string, octokit: any) => {
    if (!octokit) return { label, skipped: 'no octokit' }
    try {
      const { data, status, headers } = await getRepoContent(octokit, { owner, repo, path })
      const out: any = {
        label,
        status,
        deprecation: (headers as any).deprecation || null,
        sunset: (headers as any).sunset || null,
        type: (data as any).type,
        hasContent: 'content' in (data as any),
        size: (data as any).size,
      }
      if ((data as any).type === 'file' && 'content' in (data as any)) {
        try {
          const decoded = Buffer.from((data as any).content, 'base64').toString('utf-8')
          const parsed = yaml.load(decoded) as any
          out.parseOk = true
          out.companyName = parsed?.cover?.companyName || null
          out.topLevelKeys = parsed && typeof parsed === 'object' ? Object.keys(parsed).slice(0, 15) : null
          out.contentBytes = decoded.length
        } catch (e: any) {
          out.parseOk = false
          out.parseError = e?.message || String(e)
        }
      }
      return out
    } catch (e: any) {
      return {
        label,
        error: e?.message || String(e),
        status: e?.status,
        responseData: e?.response?.data ? JSON.stringify(e.response.data).slice(0, 200) : null,
      }
    }
  }

  const directReads = {
    public: await probe('public/admin token', publicOctokit),
    viewer: await probe('viewer OAuth token', viewerOctokit),
  }

  // Replay the actual getBusinesses path
  let listing: any
  try {
    const { businesses } = await getBusinesses({ pageSize: 50, viewerOctokit })
    listing = {
      count: businesses.length,
      slugs: businesses.map((b: any) => `${b.owner}/${b.slug} pub=${b.isPublic} name=${b.cover?.companyName ?? '∅'}`),
    }
  } catch (e: any) {
    listing = { error: e?.message || String(e), stack: e?.stack?.split('\n').slice(0, 5) }
  }

  return NextResponse.json({
    target: `${owner}/${repo}/${path}`,
    hasViewerOctokit: !!viewerOctokit,
    sessionLogin: session?.user?.login,
    directReads,
    listing,
  })
}
