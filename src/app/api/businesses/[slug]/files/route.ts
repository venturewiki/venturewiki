import { NextRequest, NextResponse } from 'next/server'
import { listVentureFiles } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const files = await listVentureFiles(params.slug)
  return NextResponse.json(files)
}
