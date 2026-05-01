// Tiny in-memory key-value cache with TTL. Keyed by string, prefix-invalidated.
// Used to cut redundant GitHub API calls within a single server process.

const TTL = 60_000

const store = new Map<string, { data: any; ts: number }>()

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key)
  if (entry && Date.now() - entry.ts < TTL) return entry.data as T
  return undefined
}

export function setCache(key: string, data: any): void {
  store.set(key, { data, ts: Date.now() })
}

export function invalidateCache(prefix: string): void {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
