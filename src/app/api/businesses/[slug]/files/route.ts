import { NextRequest, NextResponse } from 'next/server'
import { listVentureFiles, createVentureFile } from '@/lib/db'
import { authorizeVentureWrite } from '@/lib/ventureWriteAuth'

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
  const auth = await authorizeVentureWrite(req, params.slug, { requireRole: true })
  if (auth instanceof NextResponse) return auth

  const { name, content } = await req.json().catch(() => ({}))
  if (typeof name !== 'string' || typeof content !== 'string') {
    return NextResponse.json({ error: 'name and content required' }, { status: 400 })
  }

  const { viewerOctokit } = auth
  try {
    await createVentureFile(params.slug, name, content, `Add ${name} via VentureWiki`, viewerOctokit)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create file' }, { status: 400 })
  }
  return NextResponse.json({ name }, { status: 201 })
}

