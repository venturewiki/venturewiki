import { NextRequest, NextResponse } from 'next/server'
import { getEditHistory } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const history = await getEditHistory(params.slug)
  return NextResponse.json(history)
}
