import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getInvestments, expressInvestmentInterest, updateInvestmentStatus } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const investments = await getInvestments(slug)
  return NextResponse.json(investments)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  const body = await req.json()

  if (body.action === 'updateStatus') {
    await updateInvestmentStatus(slug, body.investmentId, body.status)
    return NextResponse.json({ ok: true })
  }

  const investment = await expressInvestmentInterest(slug, {
    ventureId: slug,
    investorId: session.user.id,
    investorLogin: session.user.login || session.user.name || '',
    investorName: session.user.name || '',
    investorImage: session.user.image || undefined,
    amount: body.amount || '',
    terms: body.terms || '',
    message: body.message || '',
  })
  return NextResponse.json(investment)
}
