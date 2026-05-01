import { GITHUB_ORG } from '@/lib/github'
import { getCached, setCache, invalidateCache } from '@/lib/cache'
import type { VWUser } from '@/types'
import { readAdminYaml, writeAdminYaml } from './yaml'

const USERS_REPO = '.venturewiki'
const USERS_PATH = 'users.yaml'

async function readRegistry(): Promise<{ users: VWUser[]; sha: string }> {
  const cacheKey = 'users:registry'
  const cached = getCached<{ users: VWUser[]; sha: string }>(cacheKey)
  if (cached) return cached

  const { data, sha } = await readAdminYaml<VWUser[]>(GITHUB_ORG, USERS_REPO, USERS_PATH)
  const result = { users: data || [], sha }
  setCache(cacheKey, result)
  return result
}

async function writeRegistry(users: VWUser[], sha: string): Promise<void> {
  await writeAdminYaml(GITHUB_ORG, USERS_REPO, USERS_PATH, '👤 Update users registry', users, sha)
  invalidateCache('users:')
}

export async function getUser(id: string): Promise<VWUser | null> {
  const { users } = await readRegistry()
  return users.find(u => u.id === id || u.login === id) ?? null
}

export async function getAllUsers(): Promise<VWUser[]> {
  const { users } = await readRegistry()
  return users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function upsertUser(user: Partial<VWUser> & { id: string; login: string }): Promise<VWUser> {
  const { users, sha } = await readRegistry()
  const existing = users.find(u => u.id === user.id)
  if (existing) {
    Object.assign(existing, { ...user, lastActiveAt: new Date().toISOString() })
    await writeRegistry(users, sha)
    return existing
  }

  const newUser: VWUser = {
    id: user.id,
    login: user.login,
    email: user.email || '',
    name: user.name || user.login,
    image: user.image,
    role: users.length === 0 ? 'admin' : 'editor',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    businessesCreated: 0,
    editsCount: 0,
    subscriptionTier: 'free',
    subscriptionStatus: 'none',
  }
  users.push(newUser)
  await writeRegistry(users, sha)
  return newUser
}

export async function updateUserRole(id: string, role: VWUser['role']) {
  const { users, sha } = await readRegistry()
  const user = users.find(u => u.id === id)
  if (!user) return
  user.role = role
  await writeRegistry(users, sha)
}

export async function updateUserSubscription(
  id: string,
  sub: {
    stripeCustomerId?: string
    subscriptionTier: VWUser['subscriptionTier']
    subscriptionStatus: VWUser['subscriptionStatus']
    subscriptionId?: string
    subscriptionExpiresAt?: string
  },
) {
  const { users, sha } = await readRegistry()
  const user = users.find(u => u.id === id)
  if (!user) return
  Object.assign(user, sub)
  await writeRegistry(users, sha)
}

export async function getUserByStripeCustomerId(customerId: string): Promise<VWUser | null> {
  const { users } = await readRegistry()
  return users.find(u => u.stripeCustomerId === customerId) || null
}
