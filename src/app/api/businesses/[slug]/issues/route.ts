import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listVentureIssues, createVentureIssue } from '@/lib/db'
import { getUserOctokit } from '@/lib/github'
import type { VentureIssueType } from '@/types'

export const dynamic = 'force-dynamic'

const STATES = ['open', 'closed', 'all'] as const

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const session = await getServerSession(authOptions)
  const viewerOctokit = session?.accessToken ? getUserOctokit(session.accessToken as string) : undefined

  const url = new URL(req.url)
  const stateParam = url.searchParams.get('state')
  const state = (STATES as readonly string[]).includes(stateParam || '') ? (stateParam as typeof STATES[number]) : 'all'
  const type = (url.searchParams.get('type') || undefined) as VentureIssueType | undefined

  const issues = await listVentureIssues(params.slug, { state, type, viewerOctokit })
  return NextResponse.json(issues)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const viewerOctokit = session.accessToken ? getUserOctokit(session.accessToken as string) : undefined
  const body = await req.json().catch(() => ({}))

  try {
    const issue = await createVentureIssue(params.slug, {
      title: body.title,
      body: body.body,
      type: body.type,
      assignees: Array.isArray(body.assignees) ? body.assignees : undefined,
    }, viewerOctokit)
    return NextResponse.json(issue)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create issue' }, { status: 500 })
  }
}
