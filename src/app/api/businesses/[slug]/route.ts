import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBusinessBySlug, updateBusiness, resolveBusinessOwner } from '@/lib/db'
import { GITHUB_ORG } from '@/lib/github'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const business = await getBusinessBySlug(params.slug)
  if (!business) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Privacy: if private, only creator/contributors can view
  if (!business.isPublic) {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId || (business.createdBy !== userId && !business.contributors?.includes(userId))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  return NextResponse.json(business)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions)
  const { data, editSummary } = await req.json()

  let userId: string
  if (session?.user?.id) {
    userId = session.user.id
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
    await updateBusiness(params.slug, data, userId, editSummary || 'Update business')
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
