import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getValidations, addValidation } from '@/lib/db'
import { getUserOctokit } from '@/lib/github'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const validations = await getValidations(slug)
  return NextResponse.json(validations)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  const body = await req.json()

  const viewerOctokit = session.accessToken ? getUserOctokit(session.accessToken) : undefined
  try {
    const validation = await addValidation(slug, {
      ventureId: slug,
      section: body.section,
      field: body.field,
      userId: session.user.id,
      userLogin: session.user.login || session.user.name || '',
      userName: session.user.name || '',
      userImage: session.user.image || undefined,
      status: body.status || 'validated',
      evidence: body.evidence || '',
    }, viewerOctokit)
    return NextResponse.json(validation)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to add validation' }, { status: 500 })
  }
}
