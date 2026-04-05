import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBusinesses, createBusiness } from '@/lib/db'

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
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await req.json()
  const slug = await createBusiness(data, session.user.id)
  return NextResponse.json({ slug })
}
