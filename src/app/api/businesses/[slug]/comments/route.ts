import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getComments, addComment } from '@/lib/db'
import { getUserOctokit } from '@/lib/github'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const comments = await getComments(params.slug)
  return NextResponse.json(comments)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const viewerOctokit = session.accessToken ? getUserOctokit(session.accessToken) : undefined
  try {
    const id = await addComment({
      businessId: params.slug,
      userId: session.user.id,
      userName: session.user.name || '',
      userImage: session.user.image || '',
      content: body.content,
      section: body.section,
    }, viewerOctokit)
    return NextResponse.json({ id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to post comment' }, { status: 500 })
  }
}
