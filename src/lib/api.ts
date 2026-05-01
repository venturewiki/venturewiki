// Client-side API module — replaces direct imports from db.ts in 'use client' components
import type { BusinessPlan, EditRecord, Comment, AdminStats, VWUser, RoleCandidate, Validation, InvestmentInterest, VentureValue } from '@/types'

// ── Businesses ────────────────────────────────────────────────────────────────

export async function fetchBusinesses(opts: {
  pageSize?: number
  stage?: string
  type?: string
  search?: string
  featuredOnly?: boolean
} = {}): Promise<BusinessPlan[]> {
  const params = new URLSearchParams()
  if (opts.pageSize) params.set('pageSize', String(opts.pageSize))
  if (opts.stage) params.set('stage', opts.stage)
  if (opts.type) params.set('type', opts.type)
  if (opts.search) params.set('search', opts.search)
  if (opts.featuredOnly) params.set('featuredOnly', 'true')

  const res = await fetch(`/api/businesses?${params}`)
  if (!res.ok) throw new Error('Failed to fetch businesses')
  return res.json()
}

export function subscribeBusinesses(
  callback: (businesses: BusinessPlan[]) => void
): () => void {
  let cancelled = false

  async function fetchAll() {
    if (cancelled) return
    try {
      const businesses = await fetchBusinesses({ pageSize: 50 })
      if (!cancelled) callback(businesses)
    } catch (err) {
      console.error('Failed to fetch businesses', err)
      if (!cancelled) callback([])
    }
  }

  fetchAll()
  const interval = setInterval(fetchAll, 120_000)

  return () => {
    cancelled = true
    clearInterval(interval)
  }
}

export async function fetchBusiness(slug: string): Promise<BusinessPlan | null> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch business')
  return res.json()
}

export type CreateBusinessTarget =
  | { type: 'user'; login: string }
  | { type: 'org'; login: string }

export async function createBusiness(
  data: Omit<BusinessPlan, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'viewCount' | 'editCount'>,
  target?: CreateBusinessTarget,
): Promise<{ slug: string; owner: string }> {
  const res = await fetch('/api/businesses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, target }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create business' }))
    throw new Error(err.error)
  }
  return res.json()
}

export async function updateBusiness(
  id: string, data: Partial<BusinessPlan>, editSummary: string
): Promise<void> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, editSummary }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update business' }))
    throw new Error(err.error)
  }
}

// Write the verbatim plan.yaml content to the venture's repo. Used by the
// in-app raw-YAML editor (when the file is malformed) and the per-section
// subtree editor.
export async function updatePlanYaml(
  id: string, rawYaml: string, editSummary: string,
): Promise<void> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(id)}/plan-yaml`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawYaml, editSummary }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update plan.yaml' }))
    throw new Error(err.error)
  }
}

// ── Comments ──────────────────────────────────────────────────────────────────

export async function fetchComments(slug: string): Promise<Comment[]> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/comments`)
  if (!res.ok) return []
  return res.json()
}

export async function postComment(slug: string, content: string, section?: string): Promise<string> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, section }),
  })
  if (!res.ok) throw new Error('Failed to post comment')
  const { id } = await res.json()
  return id
}

// ── Edit History ──────────────────────────────────────────────────────────────

export async function fetchEditHistory(slug: string): Promise<EditRecord[]> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/history`)
  if (!res.ok) return []
  return res.json()
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function toggleFeatured(id: string, featured: boolean): Promise<void> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(id)}/featured`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ featured }),
  })
  if (!res.ok) throw new Error('Failed to toggle featured')
}

export async function archiveBusiness(id: string): Promise<void> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Failed to archive business')
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch('/api/admin/stats')
  if (!res.ok) throw new Error('Failed to fetch admin stats')
  return res.json()
}

export async function fetchAllUsers(): Promise<VWUser[]> {
  const res = await fetch('/api/admin/users')
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

export async function updateUserRole(userId: string, role: VWUser['role']): Promise<void> {
  const res = await fetch('/api/admin/users', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, role }),
  })
  if (!res.ok) throw new Error('Failed to update role')
}

// ── No-ops (view count is derived from repo watchers) ─────────────────────────

export async function incrementViewCount(_id: string): Promise<void> {
  // View count derived from repo watchers — no API call needed
}

// ── Role Candidates ───────────────────────────────────────────────────────────

export async function fetchCandidates(slug: string): Promise<RoleCandidate[]> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/candidates`)
  if (!res.ok) return []
  return res.json()
}

export async function applyForRole(slug: string, role: string, pitch: string): Promise<RoleCandidate> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/candidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, pitch }),
  })
  if (!res.ok) throw new Error('Failed to apply for role')
  return res.json()
}

export async function endorseCandidate(slug: string, candidateId: string): Promise<void> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/candidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'endorse', candidateId }),
  })
  if (!res.ok) throw new Error('Failed to endorse')
}

export async function updateCandidateStatus(slug: string, candidateId: string, status: string): Promise<void> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/candidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateStatus', candidateId, status }),
  })
  if (!res.ok) throw new Error('Failed to update status')
}

// ── Validations ───────────────────────────────────────────────────────────────

export async function fetchValidations(slug: string): Promise<Validation[]> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/validations`)
  if (!res.ok) return []
  return res.json()
}

export async function addValidation(slug: string, section: string, status: 'validated' | 'disputed', evidence: string, field?: string): Promise<Validation> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/validations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, status, evidence, field }),
  })
  if (!res.ok) throw new Error('Failed to add validation')
  return res.json()
}

// ── Investment Interest ───────────────────────────────────────────────────────

export async function fetchInvestments(slug: string): Promise<InvestmentInterest[]> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/invest`)
  if (!res.ok) return []
  return res.json()
}

export async function expressInvestmentInterest(slug: string, amount: string, terms: string, message: string): Promise<InvestmentInterest> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/invest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, terms, message }),
  })
  if (!res.ok) throw new Error('Failed to express investment interest')
  return res.json()
}

// ── Venture Value ─────────────────────────────────────────────────────────────

export async function fetchVentureValue(slug: string): Promise<VentureValue> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/value`)
  if (!res.ok) throw new Error('Failed to fetch venture value')
  return res.json()
}

// ── .venturewiki Files ───────────────────────────────────────────────────────

export interface VentureFile { path: string; name: string; size: number }

export async function fetchVentureFiles(slug: string): Promise<VentureFile[]> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/files`)
  if (!res.ok) return []
  return res.json()
}

export async function fetchVentureFile(slug: string, path: string): Promise<{ name: string; content: string } | null> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/files/${path.split('/').map(encodeURIComponent).join('/')}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch file')
  return res.json()
}

export async function createVentureFile(slug: string, name: string, content: string): Promise<string> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, content }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create file' }))
    throw new Error(err.error)
  }
  const data = await res.json()
  return data.name
}

// ── GitHub user search + collaborator invite ────────────────────────────────

export interface GhUserHit { login: string; name?: string; avatarUrl: string; htmlUrl: string }

export async function searchGithubUsers(q: string): Promise<GhUserHit[]> {
  const trimmed = q.trim()
  if (!trimmed) return []
  const res = await fetch(`/api/github/users/search?q=${encodeURIComponent(trimmed)}`)
  if (!res.ok) return []
  return res.json()
}

export async function inviteCollaborator(slug: string, username: string, permission: 'pull' | 'push' | 'maintain' | 'admin' | 'triage' = 'push'): Promise<void> {
  const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/collaborators`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, permission }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to invite' }))
    throw new Error(err.error)
  }
}

// ── My GitHub (orgs + repos for the logged-in user) ─────────────────────────

export interface MyOrg { login: string; id: number; avatarUrl: string; description: string }
export interface MyRepo {
  fullName: string
  owner: string
  name: string
  description: string
  visibility: 'public' | 'private'
  isFork: boolean
  htmlUrl: string
  pushedAt: string
  hasVentureWiki: boolean
  hasTopic: boolean
}

export async function fetchMyOrgs(): Promise<MyOrg[]> {
  const res = await fetch('/api/me/orgs')
  if (!res.ok) return []
  return res.json()
}

export interface MyReposResponse {
  scopes: string[]
  missingScopes: string[]
  truncated: boolean
  repos: MyRepo[]
}

export async function fetchMyRepos(): Promise<MyReposResponse> {
  const res = await fetch('/api/me/repos')
  if (!res.ok) return { scopes: [], missingScopes: [], truncated: false, repos: [] }
  return res.json()
}

export async function onboardRepoToVentureWiki(owner: string, name: string): Promise<{ ok: boolean; editUrl: string; repoUrl: string }> {
  const res = await fetch('/api/me/repos/onboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner, name }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to onboard repo' }))
    throw new Error(err.error)
  }
  return res.json()
}

// ── Stripe Subscription ──────────────────────────────────────────────────────

export async function createCheckoutSession(plan: 'monthly' | 'yearly'): Promise<string> {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create checkout session' }))
    throw new Error(err.error)
  }
  const { url } = await res.json()
  return url
}

export async function createPortalSession(): Promise<string> {
  const res = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to create portal session')
  const { url } = await res.json()
  return url
}

// ── AI Venture Generation (Pro only) ─────────────────────────────────────────

export async function generateVenturePlanAI(prompt: string): Promise<string> {
  const res = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'AI generation failed' }))
    throw new Error(err.error)
  }
  const { yaml } = await res.json()
  return yaml
}
