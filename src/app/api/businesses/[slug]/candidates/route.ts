import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCandidates, applyForRole, endorseCandidate, updateCandidateStatus } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const candidates = await getCandidates(slug)
  return NextResponse.json(candidates)
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

  if (body.action === 'endorse') {
    await endorseCandidate(slug, body.candidateId, session.user.id)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'updateStatus') {
    await updateCandidateStatus(slug, body.candidateId, body.status)
    return NextResponse.json({ ok: true })
  }

  // Default: apply for role
  const candidate = await applyForRole(slug, {
    ventureId: slug,
    role: body.role,
    userId: session.user.id,
    userLogin: session.user.login || session.user.name || '',
    userName: session.user.name || '',
    userImage: session.user.image || undefined,
    pitch: body.pitch || '',
  })
  return NextResponse.json(candidate)
}
