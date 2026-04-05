import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe, PRICES, isStripeEnabled } from '@/lib/stripe'
import { getUser } from '@/lib/db'

export async function POST(req: NextRequest) {
  if (!isStripeEnabled()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { plan } = await req.json()
  const priceId = plan === 'yearly' ? PRICES.pro_yearly : PRICES.pro_monthly
  if (!priceId) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 500 })
  }

  const user = await getUser(session.user.id)
  const customerEmail = user?.email || session.user.email

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/profile?subscribed=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/profile?canceled=true`,
    client_reference_id: session.user.id,
    customer_email: user?.stripeCustomerId ? undefined : customerEmail,
    customer: user?.stripeCustomerId || undefined,
    metadata: {
      userId: session.user.id,
      login: session.user.login,
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
