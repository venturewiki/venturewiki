import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not set — Stripe features disabled')
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' })
  : (null as unknown as Stripe)

export function isStripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

// ── Dynamic price lookup (single source of truth from Stripe) ────────────────
const PRODUCT_ID = 'prod_UHQt8fzFVQa8ts' // VentureWiki Pro

let priceCache: { monthly: string; yearly: string } | null = null
let priceCacheTime = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function getProPrices(): Promise<{ monthly: string; yearly: string }> {
  if (priceCache && Date.now() - priceCacheTime < CACHE_TTL) return priceCache

  const prices = await stripe.prices.list({
    product: PRODUCT_ID,
    active: true,
    type: 'recurring',
  })

  let monthly = ''
  let yearly = ''
  for (const p of prices.data) {
    if (p.recurring?.interval === 'month') monthly = p.id
    if (p.recurring?.interval === 'year') yearly = p.id
  }

  if (!monthly || !yearly) {
    throw new Error('VentureWiki Pro prices not found in Stripe')
  }

  priceCache = { monthly, yearly }
  priceCacheTime = Date.now()
  return priceCache
}
