import { NextRequest, NextResponse } from 'next/server'
import { moveVentureFile } from '@/lib/db'
import { authorizeVentureWrite } from '@/lib/ventureWriteAuth'

export const dynamic = 'force-dynamic'

// POST — move/rename a file
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const auth = await authorizeVentureWrite(req, params.slug, { requireRole: true })
  if (auth instanceof NextResponse) return auth

  const { srcPath, destPath } = await req.json().catch(() => ({}))
  if (typeof srcPath !== 'string' || typeof destPath !== 'string') {
    return NextResponse.json({ error: 'srcPath and destPath required' }, { status: 400 })
  }

  const { viewerOctokit } = auth
  try {
    await moveVentureFile(params.slug, srcPath.trim(), destPath.trim(), `Move ${srcPath} → ${destPath} via VentureWiki`, viewerOctokit)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to move file' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
