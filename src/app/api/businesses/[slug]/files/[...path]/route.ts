import { NextRequest, NextResponse } from 'next/server'
import { readVentureFile } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string; path: string[] } }
) {
  const filePath = params.path?.join('/') ?? ''
  if (!filePath) return NextResponse.json({ error: 'missing path' }, { status: 400 })

  const file = await readVentureFile(params.slug, filePath)
  if (!file) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(file)
}
