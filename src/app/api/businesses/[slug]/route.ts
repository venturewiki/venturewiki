import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBusinessBySlug, updateBusiness } from '@/lib/db'

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
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, editSummary } = await req.json()
  await updateBusiness(params.slug, data, session.user.id, editSummary || 'Update business')
  return NextResponse.json({ ok: true })
}
