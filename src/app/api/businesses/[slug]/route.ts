import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBusinessBySlug, updateBusiness } from '@/lib/db'
import { getUserOctokit } from '@/lib/github'
import { authorizeVentureWrite } from '@/lib/ventureWriteAuth'

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
  const auth = await authorizeVentureWrite(req, params.slug)
  if (auth instanceof NextResponse) return auth
  const { userId, viewerOctokit } = auth
  const { data, editSummary } = await req.json()

  try {
    await updateBusiness(params.slug, data, userId, editSummary || 'Update business', viewerOctokit)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
