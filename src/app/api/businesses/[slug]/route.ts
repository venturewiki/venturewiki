import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBusinessBySlug, updateBusiness, resolveBusinessOwner } from '@/lib/db'
import { GITHUB_ORG, getUserOctokit } from '@/lib/github'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions)
  const viewerOctokit = session?.accessToken ? getUserOctokit(session.accessToken) : undefined

  const business = await getBusinessBySlug(params.slug, viewerOctokit)
  if (!business) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Privacy: if private, only signed-in viewers whose token surfaced the repo
  // can see it. The viewer-token fallback in getBusinessBySlug already enforces
  // GitHub's permission model, so reaching this point means access is granted.
  if (!business.isPublic && !session?.user?.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(business, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions)
  const { data, editSummary } = await req.json()

  let userId: string
  let viewerOctokit
  if (session?.user?.id) {
    userId = session.user.id
    if (session.accessToken) viewerOctokit = getUserOctokit(session.accessToken)
  } else {
    // Anonymous edits are only permitted on venturewiki-org repos (where the
    // admin token has rights). All other ventures require sign-in. Rate-limited.
    const owner = await resolveBusinessOwner(params.slug)
    if (owner !== GITHUB_ORG) {
      return NextResponse.json(
        { error: 'Sign in to edit ventures outside the venturewiki org' },
        { status: 401 },
      )
    }
    const ip = getClientIp(req.headers)
    const rl = checkRateLimit(`anon-edit:${ip}`, 10, 60 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many anonymous edits. Try again in ${rl.retryAfter}s, or sign in.` },
        { status: 429 },
      )
    }
    userId = 'anonymous'
  }

  try {
    await updateBusiness(params.slug, data, userId, editSummary || 'Update business', viewerOctokit)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
