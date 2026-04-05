import { NextRequest, NextResponse } from 'next/server'
import { stripe, isStripeEnabled } from '@/lib/stripe'
import { updateUserSubscription, getUserByStripeCustomerId, getUser } from '@/lib/db'
import type { SubscriptionTier, SubscriptionStatus } from '@/types'

function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'active': return 'active'
    case 'past_due': return 'past_due'
    case 'canceled':
    case 'unpaid': return 'canceled'
    case 'trialing': return 'trialing'
    default: return 'none'
  }
}

export async function POST(req: NextRequest) {
  if (!isStripeEnabled()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any
      const userId = session.client_reference_id || session.metadata?.userId
      if (!userId) break

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string) as any

      await updateUserSubscription(userId, {
        stripeCustomerId: session.customer as string,
        subscriptionTier: 'pro' as SubscriptionTier,
        subscriptionStatus: mapStripeStatus(subscription.status),
        subscriptionId: subscription.id,
        subscriptionExpiresAt: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any
      const user = await getUserByStripeCustomerId(subscription.customer as string)
      if (!user) break

      const isActive = subscription.status === 'active' || subscription.status === 'trialing'
      await updateUserSubscription(user.id, {
        subscriptionTier: isActive ? 'pro' : 'free',
        subscriptionStatus: mapStripeStatus(subscription.status),
        subscriptionId: subscription.id,
        subscriptionExpiresAt: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as any
      const user = await getUserByStripeCustomerId(invoice.customer as string)
      if (!user) break

      await updateUserSubscription(user.id, {
        subscriptionStatus: 'past_due',
        subscriptionTier: user.subscriptionTier || 'free',
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
