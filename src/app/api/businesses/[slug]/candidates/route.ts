import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCandidates, applyForRole, endorseCandidate, updateCandidateStatus } from '@/lib/db'
import { getUserOctokit } from '@/lib/github'

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
  const viewerOctokit = session.accessToken ? getUserOctokit(session.accessToken) : undefined

  try {
    if (body.action === 'endorse') {
      await endorseCandidate(slug, body.candidateId, session.user.id, viewerOctokit)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'updateStatus') {
      await updateCandidateStatus(slug, body.candidateId, body.status, viewerOctokit)
      return NextResponse.json({ ok: true })
    }
    const candidate = await applyForRole(slug, {
      ventureId: slug,
      role: body.role,
      userId: session.user.id,
      userLogin: session.user.login || session.user.name || '',
      userName: session.user.name || '',
      userImage: session.user.image || undefined,
      pitch: body.pitch || '',
    }, viewerOctokit)
    return NextResponse.json(candidate)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to write candidate' }, { status: 500 })
  }
}
