import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { moveVentureFile } from '@/lib/db'
import { getUserOctokit } from '@/lib/github'

export const dynamic = 'force-dynamic'

// POST — move/rename a file
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

  const { srcPath, destPath } = await req.json().catch(() => ({}))
  if (typeof srcPath !== 'string' || typeof destPath !== 'string') {
    return NextResponse.json({ error: 'srcPath and destPath required' }, { status: 400 })
  }

  const viewerOctokit = session.accessToken ? getUserOctokit(session.accessToken) : undefined
  try {
    await moveVentureFile(params.slug, srcPath.trim(), destPath.trim(), `Move ${srcPath} → ${destPath} via VentureWiki`, viewerOctokit)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to move file' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
