import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not set — Stripe features disabled')
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' })
  : (null as unknown as Stripe)

// ── Price IDs (set in env or defaults) ───────────────────────────────────────
export const PRICES = {
  pro_monthly:  process.env.STRIPE_PRICE_PRO_MONTHLY  || '',
  pro_yearly:   process.env.STRIPE_PRICE_PRO_YEARLY   || '',
} as const

export function isStripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}
