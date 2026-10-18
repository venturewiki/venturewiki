import { NextRequest, NextResponse } from 'next/server'
import { createVentureFolder, renameVentureFolder, deleteVentureFolder } from '@/lib/db'
import { authorizeVentureWrite } from '@/lib/ventureWriteAuth'

export const dynamic = 'force-dynamic'

// POST — create folder
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const auth = await authorizeVentureWrite(req, params.slug, { requireRole: true })
  if (auth instanceof NextResponse) return auth

  const { name } = await req.json().catch(() => ({}))
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
  }

  const { viewerOctokit } = auth
  try {
    await createVentureFolder(params.slug, name.trim(), `Create folder ${name} via VentureWiki`, viewerOctokit)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create folder' }, { status: 400 })
  }
  return NextResponse.json({ name: name.trim() }, { status: 201 })
}

// PUT — rename folder
export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const auth = await authorizeVentureWrite(req, params.slug, { requireRole: true })
  if (auth instanceof NextResponse) return auth

  const { oldPath, newPath } = await req.json().catch(() => ({}))
  if (typeof oldPath !== 'string' || typeof newPath !== 'string') {
    return NextResponse.json({ error: 'oldPath and newPath required' }, { status: 400 })
  }

  const { viewerOctokit } = auth
  try {
    await renameVentureFolder(params.slug, oldPath.trim(), newPath.trim(), `Rename folder ${oldPath} → ${newPath} via VentureWiki`, viewerOctokit)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to rename folder' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}

// DELETE — delete folder
export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const auth = await authorizeVentureWrite(req, params.slug, { requireRole: true })
  if (auth instanceof NextResponse) return auth

  const { path } = await req.json().catch(() => ({}))
  if (typeof path !== 'string' || !path.trim()) {
    return NextResponse.json({ error: 'Folder path is required' }, { status: 400 })
  }

  const { viewerOctokit } = auth
  try {
    await deleteVentureFolder(params.slug, path.trim(), `Delete folder ${path} via VentureWiki`, viewerOctokit)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete folder' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
