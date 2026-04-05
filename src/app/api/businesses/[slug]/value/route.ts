import { NextRequest, NextResponse } from 'next/server'
import { getVentureValue } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const value = await getVentureValue(slug)
  return NextResponse.json(value)
}
