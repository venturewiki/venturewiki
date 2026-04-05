import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUser } from '@/lib/db'
import { generateVenturePlan } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  // Check subscription — admin or pro only
  const user = await getUser(session.user.id)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const isPro = user.role === 'admin' ||
    (user.subscriptionTier === 'pro' && user.subscriptionStatus === 'active') ||
    (user.subscriptionTier === 'pro' && user.subscriptionStatus === 'trialing')

  if (!isPro) {
    return NextResponse.json(
      { error: 'AI venture generation requires a VentureWiki Pro subscription' },
      { status: 403 }
    )
  }

  const { prompt } = await req.json()
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
    return NextResponse.json(
      { error: 'Please provide a venture description (at least 10 characters)' },
      { status: 400 }
    )
  }

  if (prompt.length > 10000) {
    return NextResponse.json(
      { error: 'Description too long (max 10,000 characters)' },
      { status: 400 }
    )
  }

  try {
    const yaml = await generateVenturePlan(prompt.trim())
    return NextResponse.json({ yaml })
  } catch (err: any) {
    console.error('AI generation error:', err)
    return NextResponse.json(
      { error: 'Failed to generate venture plan. Please try again.' },
      { status: 500 }
    )
  }
}
