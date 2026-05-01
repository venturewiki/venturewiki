import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBusinesses, createBusiness, type CreateBusinessTarget } from '@/lib/db'
import { getUserOctokit, getAdminOctokit, GITHUB_ORG } from '@/lib/github'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const viewerOctokit = session?.accessToken ? getUserOctokit(session.accessToken) : undefined

  const opts = {
    pageSize: Number(searchParams.get('pageSize')) || 50,
    stage: searchParams.get('stage') || undefined,
    type: searchParams.get('type') || undefined,
    search: searchParams.get('search') || undefined,
    featuredOnly: searchParams.get('featuredOnly') === 'true',
    viewerOctokit,
  }

  const { businesses } = await getBusinesses(opts)

  // Privacy: anonymous viewers only see public repos. Signed-in viewers see
  // public repos plus any private repo that surfaced via their own GitHub
  // token — by definition they have access to those.
  const visible = businesses.filter(b => {
    if (b.isPublic) return true
    return !!userId
  })

  return NextResponse.json(visible)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const body = await req.json()
  const { target: requestedTarget, ...data } = body as { target?: CreateBusinessTarget } & any

  let octokit, userId, target: CreateBusinessTarget, isAnonymous = false

  if (session?.user?.id && session.accessToken) {
    octokit = getUserOctokit(session.accessToken)
    userId = session.user.id
    target = requestedTarget ?? {
      type: 'user',
      login: session.user.login || session.user.name || '',
    }
  } else {
    // Anonymous: forced to the venturewiki org via the platform admin token,
    // attributed to a placeholder user, and rate-limited per IP.
    const ip = getClientIp(req.headers)
    const rl = checkRateLimit(`anon-create:${ip}`, 3, 60 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many anonymous creates. Try again in ${rl.retryAfter}s, or sign in.` },
        { status: 429 },
      )
    }
    octokit = getAdminOctokit()
    userId = 'anonymous'
    target = { type: 'org', login: GITHUB_ORG }
    isAnonymous = true
  }

  if (!target.login) {
    return NextResponse.json({ error: 'No target login resolved' }, { status: 400 })
  }

  try {
    const { slug, owner } = await createBusiness(data, userId, target, octokit)

    // Tag anonymous-created repos so admins can spot/clean them.
    if (isAnonymous) {
      try {
        const admin = getAdminOctokit()
        const { data: repo } = await admin.rest.repos.get({ owner, repo: slug })
        const topics = Array.from(new Set([...(repo.topics || []), 'venturewiki-anonymous']))
        await admin.rest.repos.replaceAllTopics({ owner, repo: slug, names: topics })
      } catch { /* best-effort */ }
    }

    return NextResponse.json({ slug, owner })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create business' }, { status: 500 })
  }
}
