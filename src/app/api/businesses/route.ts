import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBusinesses, createBusiness, type CreateBusinessTarget } from '@/lib/db'
import { getUserOctokit } from '@/lib/github'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const opts = {
    pageSize: Number(searchParams.get('pageSize')) || 50,
    stage: searchParams.get('stage') || undefined,
    type: searchParams.get('type') || undefined,
    search: searchParams.get('search') || undefined,
    featuredOnly: searchParams.get('featuredOnly') === 'true',
  }

  const { businesses } = await getBusinesses(opts)

  // Privacy: filter out private repos unless user is creator/contributor
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  const visible = businesses.filter(b => {
    if (b.isPublic) return true
    if (!userId) return false
    return b.createdBy === userId || b.contributors?.includes(userId)
  })

  return NextResponse.json(visible)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { target, ...data } = body as { target?: CreateBusinessTarget } & any

  // Default to creating under the user's personal account if no target is given
  const resolvedTarget: CreateBusinessTarget = target ?? {
    type: 'user',
    login: session.user.login || session.user.name || '',
  }
  if (!resolvedTarget.login) {
    return NextResponse.json({ error: 'No GitHub login on session' }, { status: 400 })
  }

  try {
    const octokit = getUserOctokit(session.accessToken)
    const { slug, owner } = await createBusiness(data, session.user.id, resolvedTarget, octokit)
    return NextResponse.json({ slug, owner })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create business' }, { status: 500 })
  }
}
