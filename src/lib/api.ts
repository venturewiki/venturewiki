// Client-side API module — replaces direct imports from db.ts in 'use client' components.
import type { BusinessPlan, EditRecord, Comment, AdminStats, VWUser, RoleCandidate, Validation, InvestmentInterest, VentureValue } from '@/types'

// ── HTTP helper ────────────────────────────────────────────────────────────
// Single shape for all client → server calls. Surfaces server-supplied error
// messages (`{ error }` JSON) when they exist, falls back to a generic label.

interface FetchOpts {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  /** Generic error label used when the server response doesn't include one. */
  errorLabel?: string
  /** When true, return null on 404 instead of throwing. */
  optional?: boolean
}

async function apiFetch<T>(url: string, opts: FetchOpts = {}): Promise<T> {
  const { method = 'GET', body, errorLabel = 'Request failed', optional = false } = opts
  const init: RequestInit = { method }
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  const res = await fetch(url, init)
  if (optional && res.status === 404) return null as T
  if (!res.ok) {
    const err = await res.json().catch(() => null) as { error?: string } | null
    throw new Error(err?.error || errorLabel)
  }
  // Some routes return 204/empty body. Tolerate both.
  const text = await res.text()
  return (text ? JSON.parse(text) : (undefined as unknown)) as T
}

const enc = encodeURIComponent

// ── Businesses ─────────────────────────────────────────────────────────────

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
  return apiFetch<BusinessPlan[]>(`/api/businesses?${params}`, { errorLabel: 'Failed to fetch businesses' })
}

export function subscribeBusinesses(callback: (businesses: BusinessPlan[]) => void): () => void {
  let cancelled = false
  const fetchAll = async () => {
    if (cancelled) return
    try {
      callback(await fetchBusinesses({ pageSize: 50 }))
    } catch (err) {
      console.error('Failed to fetch businesses', err)
      if (!cancelled) callback([])
    }
  }
  fetchAll()
  const interval = setInterval(fetchAll, 120_000)
  return () => { cancelled = true; clearInterval(interval) }
}

export async function fetchBusiness(slug: string): Promise<BusinessPlan | null> {
  return apiFetch<BusinessPlan | null>(`/api/businesses/${enc(slug)}`, {
    optional: true, errorLabel: 'Failed to fetch business',
  })
}

export type CreateBusinessTarget =
  | { type: 'user'; login: string }
  | { type: 'org'; login: string }

export async function createBusiness(
  data: Omit<BusinessPlan, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'viewCount' | 'editCount'>,
  target?: CreateBusinessTarget,
): Promise<{ slug: string; owner: string }> {
  return apiFetch('/api/businesses', { method: 'POST', body: { ...data, target }, errorLabel: 'Failed to create business' })
}

export async function updateBusiness(id: string, data: Partial<BusinessPlan>, editSummary: string): Promise<void> {
  await apiFetch(`/api/businesses/${enc(id)}`, { method: 'PUT', body: { data, editSummary }, errorLabel: 'Failed to update business' })
}

// Writes the verbatim plan.yaml content. Used by the in-app raw-YAML editor
// (when the file is malformed) and the per-section subtree editor.
export async function updatePlanYaml(id: string, rawYaml: string, editSummary: string): Promise<void> {
  await apiFetch(`/api/businesses/${enc(id)}/plan-yaml`, { method: 'PUT', body: { rawYaml, editSummary }, errorLabel: 'Failed to update plan.yaml' })
}

// ── Comments ───────────────────────────────────────────────────────────────

export async function fetchComments(slug: string): Promise<Comment[]> {
  try { return await apiFetch<Comment[]>(`/api/businesses/${enc(slug)}/comments`) } catch { return [] }
}

export async function postComment(slug: string, content: string, section?: string): Promise<string> {
  const { id } = await apiFetch<{ id: string }>(`/api/businesses/${enc(slug)}/comments`, {
    method: 'POST', body: { content, section }, errorLabel: 'Failed to post comment',
  })
  return id
}

// ── Edit History ───────────────────────────────────────────────────────────

export async function fetchEditHistory(slug: string): Promise<EditRecord[]> {
  try { return await apiFetch<EditRecord[]>(`/api/businesses/${enc(slug)}/history`) } catch { return [] }
}

// ── Admin ──────────────────────────────────────────────────────────────────

export async function toggleFeatured(id: string, featured: boolean): Promise<void> {
  await apiFetch(`/api/businesses/${enc(id)}/featured`, { method: 'POST', body: { featured }, errorLabel: 'Failed to toggle featured' })
}

export async function archiveBusiness(id: string): Promise<void> {
  await apiFetch(`/api/businesses/${enc(id)}/archive`, { method: 'POST', errorLabel: 'Failed to archive business' })
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return apiFetch('/api/admin/stats', { errorLabel: 'Failed to fetch admin stats' })
}

export async function fetchAllUsers(): Promise<VWUser[]> {
  return apiFetch('/api/admin/users', { errorLabel: 'Failed to fetch users' })
}

export async function updateUserRole(userId: string, role: VWUser['role']): Promise<void> {
  await apiFetch('/api/admin/users', { method: 'PUT', body: { userId, role }, errorLabel: 'Failed to update role' })
}

// ── Role Candidates ────────────────────────────────────────────────────────

export async function fetchCandidates(slug: string): Promise<RoleCandidate[]> {
  try { return await apiFetch<RoleCandidate[]>(`/api/businesses/${enc(slug)}/candidates`) } catch { return [] }
}

export async function applyForRole(slug: string, role: string, pitch: string): Promise<RoleCandidate> {
  return apiFetch(`/api/businesses/${enc(slug)}/candidates`, {
    method: 'POST', body: { role, pitch }, errorLabel: 'Failed to apply for role',
  })
}

export async function endorseCandidate(slug: string, candidateId: string): Promise<void> {
  await apiFetch(`/api/businesses/${enc(slug)}/candidates`, {
    method: 'POST', body: { action: 'endorse', candidateId }, errorLabel: 'Failed to endorse',
  })
}

export async function updateCandidateStatus(slug: string, candidateId: string, status: string): Promise<void> {
  await apiFetch(`/api/businesses/${enc(slug)}/candidates`, {
    method: 'POST', body: { action: 'updateStatus', candidateId, status }, errorLabel: 'Failed to update status',
  })
}

// ── Validations ────────────────────────────────────────────────────────────

export async function fetchValidations(slug: string): Promise<Validation[]> {
  try { return await apiFetch<Validation[]>(`/api/businesses/${enc(slug)}/validations`) } catch { return [] }
}

export async function addValidation(slug: string, section: string, status: 'validated' | 'disputed', evidence: string, field?: string): Promise<Validation> {
  return apiFetch(`/api/businesses/${enc(slug)}/validations`, {
    method: 'POST', body: { section, status, evidence, field }, errorLabel: 'Failed to add validation',
  })
}

// ── Investment Interest ────────────────────────────────────────────────────

export async function fetchInvestments(slug: string): Promise<InvestmentInterest[]> {
  try { return await apiFetch<InvestmentInterest[]>(`/api/businesses/${enc(slug)}/invest`) } catch { return [] }
}

export async function expressInvestmentInterest(slug: string, amount: string, terms: string, message: string): Promise<InvestmentInterest> {
  return apiFetch(`/api/businesses/${enc(slug)}/invest`, {
    method: 'POST', body: { amount, terms, message }, errorLabel: 'Failed to express investment interest',
  })
}

// ── Venture Value ──────────────────────────────────────────────────────────

export async function fetchVentureValue(slug: string): Promise<VentureValue> {
  return apiFetch(`/api/businesses/${enc(slug)}/value`, { errorLabel: 'Failed to fetch venture value' })
}

// ── .venturewiki Files ─────────────────────────────────────────────────────

export interface VentureFile { path: string; name: string; size: number }

export async function fetchVentureFiles(slug: string): Promise<VentureFile[]> {
  try { return await apiFetch<VentureFile[]>(`/api/businesses/${enc(slug)}/files`) } catch { return [] }
}

export async function fetchVentureFile(slug: string, path: string): Promise<{ name: string; content: string } | null> {
  return apiFetch(
    `/api/businesses/${enc(slug)}/files/${path.split('/').map(enc).join('/')}`,
    { optional: true, errorLabel: 'Failed to fetch file' },
  )
}

export async function createVentureFile(slug: string, name: string, content: string): Promise<string> {
  const data = await apiFetch<{ name: string }>(`/api/businesses/${enc(slug)}/files`, {
    method: 'POST', body: { name, content }, errorLabel: 'Failed to create file',
  })
  return data.name
}

// ── My GitHub (orgs + repos + onboard) ─────────────────────────────────────

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
export interface MyReposResponse {
  scopes: string[]
  missingScopes: string[]
  truncated: boolean
  repos: MyRepo[]
}

export async function fetchMyOrgs(): Promise<MyOrg[]> {
  try { return await apiFetch<MyOrg[]>('/api/me/orgs') } catch { return [] }
}

export async function fetchMyRepos(): Promise<MyReposResponse> {
  try { return await apiFetch<MyReposResponse>('/api/me/repos') }
  catch { return { scopes: [], missingScopes: [], truncated: false, repos: [] } }
}

export async function onboardRepoToVentureWiki(
  owner: string, name: string,
): Promise<{ ok: boolean; editUrl: string; repoUrl: string }> {
  return apiFetch('/api/me/repos/onboard', {
    method: 'POST', body: { owner, name }, errorLabel: 'Failed to onboard repo',
  })
}

// ── Stripe ─────────────────────────────────────────────────────────────────

export async function createCheckoutSession(plan: 'monthly' | 'yearly'): Promise<string> {
  const { url } = await apiFetch<{ url: string }>('/api/stripe/checkout', {
    method: 'POST', body: { plan }, errorLabel: 'Failed to create checkout session',
  })
  return url
}

export async function createPortalSession(): Promise<string> {
  const { url } = await apiFetch<{ url: string }>('/api/stripe/portal', {
    method: 'POST', errorLabel: 'Failed to create portal session',
  })
  return url
}

