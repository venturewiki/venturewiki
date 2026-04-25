import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listVentureFiles, createVentureFile } from '@/lib/db'
import { getUserOctokit } from '@/lib/github'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const files = await listVentureFiles(params.slug)
  return NextResponse.json(files)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin' && session.user.role !== 'editor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, content } = await req.json().catch(() => ({}))
  if (typeof name !== 'string' || typeof content !== 'string') {
    return NextResponse.json({ error: 'name and content required' }, { status: 400 })
  }

  const viewerOctokit = session.accessToken ? getUserOctokit(session.accessToken) : undefined
  try {
    await createVentureFile(params.slug, name, content, `Add ${name} via VentureWiki`, viewerOctokit)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create file' }, { status: 400 })
  }
  return NextResponse.json({ name }, { status: 201 })
}
