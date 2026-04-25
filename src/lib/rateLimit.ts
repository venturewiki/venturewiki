// Tiny in-memory sliding-window rate limiter.
// Keyed by an arbitrary string (typically `${action}:${ip}`).
// Process-local — fine for single-instance Railway, naive on horizontal scale.

const buckets = new Map<string, number[]>()

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const cutoff = now - windowMs
  const prior = (buckets.get(key) || []).filter(t => t > cutoff)
  if (prior.length >= max) {
    const retryAfterMs = prior[0] + windowMs - now
    return { allowed: false, retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
  }
  prior.push(now)
  buckets.set(key, prior)
  return { allowed: true, retryAfter: 0 }
}

export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return headers.get('x-real-ip') || 'unknown'
}
