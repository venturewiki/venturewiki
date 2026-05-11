import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getVentureIssue, updateVentureIssue, addVentureIssueComment } from '@/lib/db'
import { getUserOctokit } from '@/lib/github'

export const dynamic = 'force-dynamic'

function parseNumber(raw: string): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string; number: string } },
) {
  const number = parseNumber(params.number)
  if (number === null) return NextResponse.json({ error: 'Invalid issue number' }, { status: 400 })

  const session = await getServerSession(authOptions)
  const viewerOctokit = session?.accessToken ? getUserOctokit(session.accessToken as string) : undefined

  const issue = await getVentureIssue(params.slug, number, viewerOctokit)
  if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
  return NextResponse.json(issue)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string; number: string } },
) {
  const number = parseNumber(params.number)
  if (number === null) return NextResponse.json({ error: 'Invalid issue number' }, { status: 400 })

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const viewerOctokit = session.accessToken ? getUserOctokit(session.accessToken as string) : undefined
  const body = await req.json().catch(() => ({}))

  try {
    const issue = await updateVentureIssue(params.slug, number, {
      title: body.title,
      body: body.body,
      type: body.type,
      status: body.status,
      assignees: Array.isArray(body.assignees) ? body.assignees : undefined,
    }, viewerOctokit)
    return NextResponse.json(issue)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update issue' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; number: string } },
) {
  const number = parseNumber(params.number)
  if (number === null) return NextResponse.json({ error: 'Invalid issue number' }, { status: 400 })

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const viewerOctokit = session.accessToken ? getUserOctokit(session.accessToken as string) : undefined
  const body = await req.json().catch(() => ({}))

  try {
    const comment = await addVentureIssueComment(params.slug, number, body.body || '', viewerOctokit)
    return NextResponse.json(comment)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to add comment' }, { status: 500 })
  }
}
