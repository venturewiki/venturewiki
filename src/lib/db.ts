import yaml from 'js-yaml'
import type { Octokit } from 'octokit'
import { getPublicOctokit, getAdminOctokit, GITHUB_ORG } from './github'
import { generatePagesWorkflow, enableGitHubPages } from './pages-template'
import type { BusinessPlan, VWUser, EditRecord, Comment, AdminStats, BusinessStage, ProductType, RoleCandidate, Validation, InvestmentInterest, VentureValue } from '@/types'

// ── In-memory cache (reduces GitHub API calls) ──────────────────────────────

const cache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = 60_000 // 60 seconds

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T
  return undefined
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, ts: Date.now() })
}

function invalidateCache(prefix: string): void {
  Array.from(cache.keys()).forEach(key => {
    if (key.startsWith(prefix)) cache.delete(key)
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function decodeContent(content: string): string {
  return Buffer.from(content, 'base64').toString('utf-8')
}

function encodeContent(content: string): string {
  return Buffer.from(content, 'utf-8').toString('base64')
}

// Phase 2: ventures may live under any GitHub owner. resolveBusinessOwner maps
// a slug → the owner login. Cached so we don't re-search GitHub on every call.
export async function resolveBusinessOwner(slug: string): Promise<string | null> {
  const cacheKey = `owner:${slug}`
  const cached = getCached<string | null>(cacheKey)
  if (cached !== undefined) return cached

  const octokit = getPublicOctokit()

  // Fast path: the venturewiki org. Covers all legacy ventures and the platform default.
  try {
    await octokit.rest.repos.get({ owner: GITHUB_ORG, repo: slug })
    setCache(cacheKey, GITHUB_ORG)
    return GITHUB_ORG
  } catch { /* fall through */ }

  // Public search: any repo on GitHub named `slug` carrying the `venturewiki` topic.
  // Note: this only finds public repos. Private cross-owner repos are intentionally
  // not resolvable via this path — they can only be reached by their owner via the
  // "Your GitHub" panel, which uses the viewer's OAuth token.
  try {
    const { data } = await octokit.rest.search.repos({
      q: `${slug} in:name topic:venturewiki`,
      per_page: 5,
    })
    const match = data.items.find(r => r.name === slug)
    if (match) {
      const owner = match.owner!.login
      setCache(cacheKey, owner)
      return owner
    }
  } catch { /* ignore */ }

  setCache(cacheKey, null as any)
  return null
}

async function readPlanYaml(slug: string): Promise<{ data: any; sha: string; owner: string } | null> {
  const cacheKey = `plan:${slug}`
  const cached = getCached<{ data: any; sha: string; owner: string }>(cacheKey)
  if (cached) return cached

  const owner = await resolveBusinessOwner(slug)
  if (!owner) return null

  try {
    const octokit = getPublicOctokit()
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: slug,
      path: '.venturewiki/plan.yaml',
    })
    if ('content' in data && data.type === 'file') {
      const result = { data: yaml.load(decodeContent(data.content)), sha: data.sha, owner }
      setCache(cacheKey, result)
      return result
    }
    return null
  } catch {
    return null
  }
}

// Picks the right Octokit for a write. The platform admin token can write
// to repos in the venturewiki org; for any other owner the caller must pass
// the viewer's OAuth-issued Octokit so GitHub's permission system enforces
// who is allowed to commit.
function pickWriteOctokit(owner: string, viewerOctokit?: Octokit): Octokit {
  if (owner === GITHUB_ORG) return getAdminOctokit()
  if (viewerOctokit) return viewerOctokit
  throw new Error(`Sign in to edit ventures owned by ${owner}`)
}

async function writePlanYaml(
  slug: string, plan: any, message: string, existingSha?: string, viewerOctokit?: Octokit,
): Promise<void> {
  const owner = await resolveBusinessOwner(slug)
  if (!owner) throw new Error('Business not found')
  const octokit = pickWriteOctokit(owner, viewerOctokit)
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo: slug,
    path: '.venturewiki/plan.yaml',
    message,
    content: encodeContent(yaml.dump(plan, { lineWidth: -1 })),
    ...(existingSha ? { sha: existingSha } : {}),
  })
  invalidateCache(`plan:${slug}`)
}

function generateReadme(plan: BusinessPlan): string {
  const c = plan.cover
  const p = plan.problemSolution
  const f = plan.financials
  return `# ${c.logoEmoji || '🚀'} ${c.companyName}

> ${c.tagline}

**Stage:** ${c.stage} · **Type:** ${c.productType} · **Funding:** ${c.fundingStage}
${c.headquarters ? `**HQ:** ${c.headquarters}` : ''}${c.websiteUrl ? ` · [Website](${c.websiteUrl})` : ''}

---

## Mission
${c.mission}

## Vision
${c.vision}

## The Problem
${p.corePainPoint}

## Our Solution
${p.solutionOneLiner}

## Market
| | Size | Source |
|---|---|---|
| **TAM** | ${p.market.tamSize} | ${p.market.tamSource} |
| **SAM** | ${p.market.samSize} | ${p.market.samSource} |
| **SOM** | ${p.market.somSize} | ${p.market.somSource} |

## Financials
| Metric | Value |
|---|---|
| Revenue Model | ${f.revenueModel} |
| Gross Margin | ${f.grossMargin} |
| Burn Rate | ${f.burnRate} |
| Runway | ${f.runway} |

${f.projections.length > 0 ? `### Projections
| Year | Revenue | EBITDA | Users |
|---|---|---|---|
${f.projections.map(p => `| ${p.year} | ${p.revenue} | ${p.ebitda} | ${p.users} |`).join('\n')}` : ''}

---

*Powered by [VentureWiki](https://venturewiki.io) — The open wiki for digital business plans*
`
}

function planToTopics(plan: BusinessPlan): string[] {
  const topics = ['venturewiki']
  if (plan.cover.stage) topics.push(`stage-${plan.cover.stage}`)
  if (plan.cover.productType) topics.push(`type-${plan.cover.productType}`)
  if (plan.cover.fundingStage) topics.push(`funding-${plan.cover.fundingStage}`)
  if (plan.isFeatured) topics.push('venturewiki-featured')
  if (plan.cover.industryVertical) {
    topics.push(slugify(plan.cover.industryVertical))
  }
  return topics.slice(0, 20)
}

function repoToPlan(repo: any, planData: any): BusinessPlan {
  return {
    ...planData,
    id: repo.name,
    slug: repo.name,
    owner: repo.owner?.login,
    createdAt: repo.created_at,
    updatedAt: repo.pushed_at || repo.updated_at,
    viewCount: repo.watchers_count || 0,
    isArchived: repo.archived || false,
    isPublic: !repo.private,
    isFeatured: (repo.topics || []).includes('venturewiki-featured'),
  }
}

// ── Business Plans ────────────────────────────────────────────────────────────

export type CreateBusinessTarget =
  | { type: 'user'; login: string }
  | { type: 'org'; login: string }

export async function createBusiness(
  data: Omit<BusinessPlan, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'viewCount' | 'editCount'>,
  userId: string,
  target: CreateBusinessTarget,
  viewerOctokit: Octokit,
): Promise<{ slug: string; owner: string }> {
  const slug = slugify(data.cover.companyName) + '-' + Date.now().toString(36)
  const owner = target.login
  const isPublic = data.isPublic !== false

  if (target.type === 'org') {
    await viewerOctokit.rest.repos.createInOrg({
      org: target.login,
      name: slug,
      description: `${data.cover.logoEmoji || '🚀'} ${data.cover.companyName} — ${data.cover.tagline}`,
      visibility: isPublic ? 'public' : 'private',
      has_issues: true,
      auto_init: false,
    })
  } else {
    await viewerOctokit.rest.repos.createForAuthenticatedUser({
      name: slug,
      description: `${data.cover.logoEmoji || '🚀'} ${data.cover.companyName} — ${data.cover.tagline}`,
      private: !isPublic,
      has_issues: true,
      auto_init: false,
    })
  }

  const plan: any = {
    ...data,
    id: slug,
    slug,
    createdBy: userId,
    contributors: [userId],
    viewCount: 0,
    editCount: 0,
    isPublic,
    isArchived: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await viewerOctokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo: slug,
    path: '.venturewiki/plan.yaml',
    message: `✨ Create business plan: ${data.cover.companyName}`,
    content: encodeContent(yaml.dump(plan, { lineWidth: -1 })),
  })

  await viewerOctokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo: slug,
    path: 'README.md',
    message: 'Add README',
    content: encodeContent(generateReadme(plan as BusinessPlan)),
  })

  // GitHub Pages workflow + enable Pages — best-effort. May fail on personal
  // free accounts for private repos; we don't want that to block creation.
  try {
    await viewerOctokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo: slug,
      path: '.github/workflows/pages.yml',
      message: '🌐 Add GitHub Pages workflow',
      content: encodeContent(generatePagesWorkflow()),
    })
    await enableGitHubPages(viewerOctokit, owner, slug)
  } catch { /* best-effort */ }

  try {
    await viewerOctokit.rest.repos.replaceAllTopics({
      owner,
      repo: slug,
      names: planToTopics(plan as BusinessPlan),
    })
  } catch {}

  invalidateCache(`plan:${slug}`)
  return { slug, owner }
}

export async function getBusiness(id: string): Promise<BusinessPlan | null> {
  return getBusinessBySlug(id)
}

export async function getBusinessBySlug(slug: string): Promise<BusinessPlan | null> {
  try {
    const owner = await resolveBusinessOwner(slug)
    if (!owner) return null
    const octokit = getPublicOctokit()
    const { data: repo } = await octokit.rest.repos.get({ owner, repo: slug })
    const planResult = await readPlanYaml(slug)
    if (!planResult) return null
    return repoToPlan(repo, planResult.data)
  } catch {
    return null
  }
}

export async function updateBusiness(
  id: string, data: Partial<BusinessPlan>, userId: string, editSummary: string, viewerOctokit?: Octokit,
): Promise<void> {
  const existing = await readPlanYaml(id)
  if (!existing) throw new Error('Business not found')

  const updated = {
    ...existing.data,
    ...data,
    updatedAt: new Date().toISOString(),
    editCount: (existing.data.editCount || 0) + 1,
  }

  if (!updated.contributors?.includes(userId)) {
    updated.contributors = [...(updated.contributors || []), userId]
  }

  await writePlanYaml(id, updated, `📝 ${editSummary}`, existing.sha, viewerOctokit)

  const owner = existing.owner
  const octokit = pickWriteOctokit(owner, viewerOctokit)
  try {
    const { data: readmeFile } = await octokit.rest.repos.getContent({
      owner,
      repo: id,
      path: 'README.md',
    })
    if ('sha' in readmeFile) {
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo: id,
        path: 'README.md',
        message: '📄 Update README',
        content: encodeContent(generateReadme(updated as BusinessPlan)),
        sha: readmeFile.sha,
      })
    }
  } catch {}

  try {
    await octokit.rest.repos.replaceAllTopics({
      owner,
      repo: id,
      names: planToTopics(updated as BusinessPlan),
    })
  } catch {}
}

export async function getBusinesses(opts: {
  pageSize?: number
  stage?: string
  type?: string
  search?: string
  featuredOnly?: boolean
} = {}): Promise<{ businesses: BusinessPlan[]; lastDoc: null }> {
  const octokit = getPublicOctokit()

  // Phase 2: ventures may live under any GitHub owner. Scope by topic, not org.
  let searchQuery = `topic:venturewiki`
  if (opts.stage) searchQuery += ` topic:stage-${opts.stage}`
  if (opts.type) searchQuery += ` topic:type-${opts.type}`
  if (opts.featuredOnly) searchQuery += ` topic:venturewiki-featured`
  if (opts.search) searchQuery += ` ${opts.search} in:name,description`
  searchQuery += ' archived:false'

  const { data: searchResult } = await octokit.rest.search.repos({
    q: searchQuery,
    sort: 'updated',
    order: 'desc',
    per_page: opts.pageSize ?? 20,
  })

  const businesses = await Promise.all(
    searchResult.items.map(async (repo) => {
      // Prime owner cache so readPlanYaml doesn't re-search GitHub
      setCache(`owner:${repo.name}`, repo.owner!.login)
      const planResult = await readPlanYaml(repo.name)
      if (!planResult) return null
      return repoToPlan(repo, planResult.data)
    })
  )

  return {
    businesses: businesses.filter((b): b is BusinessPlan => b !== null),
    lastDoc: null,
  }
}

export function subscribeBusinesses(
  callback: (businesses: BusinessPlan[]) => void
): () => void {
  let cancelled = false

  async function fetchAll() {
    if (cancelled) return
    try {
      const { businesses } = await getBusinesses({ pageSize: 50 })
      if (!cancelled) callback(businesses)
    } catch (err) {
      console.error('Failed to fetch businesses', err)
      if (!cancelled) callback([])
    }
  }

  fetchAll()
  const interval = setInterval(fetchAll, 30_000)

  return () => {
    cancelled = true
    clearInterval(interval)
  }
}

export async function incrementViewCount(id: string) {
  // View count derived from repo watchers — no manual counter needed
}

export async function toggleFeatured(id: string, featured: boolean) {
  const owner = await resolveBusinessOwner(id)
  if (!owner) throw new Error('Business not found')
  const octokit = getAdminOctokit()
  const { data: repo } = await octokit.rest.repos.get({ owner, repo: id })
  let topics = repo.topics || []
  if (featured && !topics.includes('venturewiki-featured')) {
    topics.push('venturewiki-featured')
  } else if (!featured) {
    topics = topics.filter((t: string) => t !== 'venturewiki-featured')
  }
  await octokit.rest.repos.replaceAllTopics({ owner, repo: id, names: topics })
}

export async function archiveBusiness(id: string) {
  const owner = await resolveBusinessOwner(id)
  if (!owner) throw new Error('Business not found')
  const octokit = getAdminOctokit()
  await octokit.rest.repos.update({ owner, repo: id, archived: true })
}

// ── Users (registry stored in .venturewiki meta repo) ─────────────────────────

const USERS_REPO = '.venturewiki'

async function readUsersRegistry(): Promise<{ users: VWUser[]; sha: string }> {
  const cacheKey = 'users:registry'
  const cached = getCached<{ users: VWUser[]; sha: string }>(cacheKey)
  if (cached) return cached

  try {
    const octokit = getAdminOctokit()
    const { data } = await octokit.rest.repos.getContent({
      owner: GITHUB_ORG,
      repo: USERS_REPO,
      path: 'users.yaml',
    })
    if ('content' in data && data.type === 'file') {
      const result = { users: (yaml.load(decodeContent(data.content)) as VWUser[]) || [], sha: data.sha }
      setCache(cacheKey, result)
      return result
    }
  } catch {}
  return { users: [], sha: '' }
}

async function writeUsersRegistry(users: VWUser[], sha: string): Promise<void> {
  const octokit = getAdminOctokit()
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: GITHUB_ORG,
    repo: USERS_REPO,
    path: 'users.yaml',
    message: '👤 Update users registry',
    content: encodeContent(yaml.dump(users, { lineWidth: -1 })),
    ...(sha ? { sha } : {}),
  })
  invalidateCache('users:')
}

export async function getUser(id: string): Promise<VWUser | null> {
  const { users } = await readUsersRegistry()
  return users.find(u => u.id === id || u.login === id) ?? null
}

export async function getAllUsers(): Promise<VWUser[]> {
  const { users } = await readUsersRegistry()
  return users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function upsertUser(user: Partial<VWUser> & { id: string; login: string }): Promise<VWUser> {
  const { users, sha } = await readUsersRegistry()
  const existing = users.find(u => u.id === user.id)
  if (existing) {
    Object.assign(existing, { ...user, lastActiveAt: new Date().toISOString() })
    await writeUsersRegistry(users, sha)
    return existing
  }

  const isFirstUser = users.length === 0
  const newUser: VWUser = {
    id: user.id,
    login: user.login,
    email: user.email || '',
    name: user.name || user.login,
    image: user.image,
    role: isFirstUser ? 'admin' : 'editor',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    businessesCreated: 0,
    editsCount: 0,
    subscriptionTier: 'free',
    subscriptionStatus: 'none',
  }
  users.push(newUser)
  await writeUsersRegistry(users, sha)
  return newUser
}

export async function updateUserRole(id: string, role: VWUser['role']) {
  const { users, sha } = await readUsersRegistry()
  const user = users.find(u => u.id === id)
  if (user) {
    user.role = role
    await writeUsersRegistry(users, sha)
  }
}

export async function updateUserSubscription(
  id: string,
  sub: {
    stripeCustomerId?: string
    subscriptionTier: VWUser['subscriptionTier']
    subscriptionStatus: VWUser['subscriptionStatus']
    subscriptionId?: string
    subscriptionExpiresAt?: string
  }
) {
  const { users, sha } = await readUsersRegistry()
  const user = users.find(u => u.id === id)
  if (user) {
    Object.assign(user, sub)
    await writeUsersRegistry(users, sha)
  }
}

export async function getUserByStripeCustomerId(customerId: string): Promise<VWUser | null> {
  const { users } = await readUsersRegistry()
  return users.find(u => u.stripeCustomerId === customerId) || null
}

// ── Edit History (from git commits on plan.yaml) ─────────────────────────────

export async function getEditHistory(businessId: string): Promise<EditRecord[]> {
  try {
    const owner = await resolveBusinessOwner(businessId)
    if (!owner) return []
    const octokit = getPublicOctokit()
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo: businessId,
      path: '.venturewiki/plan.yaml',
      per_page: 50,
    })
    return commits.map(c => ({
      id: c.sha,
      businessId,
      userId: c.author?.login || c.commit.author?.name || '',
      userName: c.commit.author?.name || c.author?.login || '',
      userImage: c.author?.avatar_url,
      timestamp: c.commit.author?.date || '',
      section: c.commit.message.split('\n')[0],
      summary: c.commit.message,
    }))
  } catch {
    return []
  }
}

// ── Comments (GitHub Issues as discussion threads) ───────────────────────────

async function getOrCreateDiscussionIssue(repoSlug: string, viewerOctokit?: Octokit): Promise<{ owner: string; issueNumber: number }> {
  const owner = await resolveBusinessOwner(repoSlug)
  if (!owner) throw new Error('Business not found')
  // Read-side: prefer admin token for venturewiki org, else viewer token if
  // we have it, else fall back to admin (which will 404 for private cross-owner
  // repos — that's fine, it just means no comments visible).
  const reader = owner === GITHUB_ORG
    ? getAdminOctokit()
    : (viewerOctokit ?? getAdminOctokit())
  const { data: issues } = await reader.rest.issues.listForRepo({
    owner,
    repo: repoSlug,
    labels: 'discussion',
    state: 'open',
    per_page: 1,
  })
  if (issues.length > 0) return { owner, issueNumber: issues[0].number }

  // Write-side: pick the right token strictly.
  const writer = pickWriteOctokit(owner, viewerOctokit)
  const { data: issue } = await writer.rest.issues.create({
    owner,
    repo: repoSlug,
    title: '💬 Discussion — Leave your feedback',
    body: 'This is the community discussion thread for this business plan. Share feedback, ask questions, or suggest edits!',
    labels: ['discussion'],
  })
  return { owner, issueNumber: issue.number }
}

export async function addComment(data: Omit<Comment, 'id' | 'createdAt'>, viewerOctokit?: Octokit): Promise<string> {
  const { owner, issueNumber } = await getOrCreateDiscussionIssue(data.businessId, viewerOctokit)
  const octokit = pickWriteOctokit(owner, viewerOctokit)
  const body = data.section
    ? `**Re: ${data.section}**\n\n${data.content}`
    : data.content

  const { data: comment } = await octokit.rest.issues.createComment({
    owner,
    repo: data.businessId,
    issue_number: issueNumber,
    body,
  })
  return comment.id.toString()
}

export async function getComments(businessId: string): Promise<Comment[]> {
  try {
    const octokit = getPublicOctokit()
    const { owner, issueNumber } = await getOrCreateDiscussionIssue(businessId)
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo: businessId,
      issue_number: issueNumber,
      per_page: 100,
    })
    return comments.map(c => ({
      id: c.id.toString(),
      businessId,
      userId: c.user?.login || '',
      userName: c.user?.login || '',
      userImage: c.user?.avatar_url,
      content: c.body || '',
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }))
  } catch {
    return []
  }
}

export async function deleteComment(id: string) {
  // GitHub Issue comments are managed on GitHub — no-op in this layer
}

// ── Admin Stats ─────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  const [{ businesses }, users] = await Promise.all([
    getBusinesses({ pageSize: 100 }),
    getAllUsers(),
  ])

  const byStage: Record<string, number> = {}
  const byType: Record<string, number> = {}
  let totalViews = 0
  let totalEdits = 0

  businesses.forEach(b => {
    const stage = b.cover?.stage ?? 'idea'
    const type = b.cover?.productType ?? 'other'
    byStage[stage] = (byStage[stage] ?? 0) + 1
    byType[type] = (byType[type] ?? 0) + 1
    totalViews += b.viewCount ?? 0
    totalEdits += b.editCount ?? 0
  })

  const recentActivity: AdminStats['recentActivity'] = []
  for (const biz of businesses.slice(0, 5)) {
    try {
      const history = await getEditHistory(biz.slug)
      history.slice(0, 3).forEach(h => {
        recentActivity.push({
          type: 'edit',
          userId: h.userId,
          userName: h.userName,
          userImage: h.userImage,
          businessId: biz.id,
          businessName: biz.cover.companyName,
          timestamp: h.timestamp,
        })
      })
    } catch {}
  }

  recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const topContributors = users
    .sort((a, b) => (b.editsCount ?? 0) - (a.editsCount ?? 0))
    .slice(0, 5)
    .map(u => ({
      userId: u.id,
      userName: u.name || u.login,
      userImage: u.image,
      editsCount: u.editsCount ?? 0,
    }))

  return {
    totalBusinesses: businesses.length,
    totalUsers: users.length,
    totalEdits,
    totalViews,
    businessesByStage: byStage as Record<BusinessStage, number>,
    businessesByType: byType as Record<ProductType, number>,
    recentActivity: recentActivity.slice(0, 10),
    topContributors,
    monthlyGrowth: [],
  }
}

// ── Role Candidates (stored in .venturewiki/candidates.yaml per repo) ────────

async function readCandidatesYaml(slug: string): Promise<{ data: RoleCandidate[]; sha: string }> {
  const owner = await resolveBusinessOwner(slug)
  if (!owner) return { data: [], sha: '' }
  try {
    const octokit = getAdminOctokit()
    const { data } = await octokit.rest.repos.getContent({
      owner, repo: slug, path: '.venturewiki/candidates.yaml',
    })
    if ('content' in data && data.type === 'file') {
      return { data: (yaml.load(decodeContent(data.content)) as RoleCandidate[]) || [], sha: data.sha }
    }
  } catch {}
  return { data: [], sha: '' }
}

async function writeCandidatesYaml(slug: string, candidates: RoleCandidate[], sha: string, viewerOctokit?: Octokit): Promise<void> {
  const owner = await resolveBusinessOwner(slug)
  if (!owner) throw new Error('Business not found')
  const octokit = pickWriteOctokit(owner, viewerOctokit)
  await octokit.rest.repos.createOrUpdateFileContents({
    owner, repo: slug, path: '.venturewiki/candidates.yaml',
    message: '👤 Update role candidates',
    content: encodeContent(yaml.dump(candidates, { lineWidth: -1 })),
    ...(sha ? { sha } : {}),
  })
}

export async function getCandidates(slug: string): Promise<RoleCandidate[]> {
  const { data } = await readCandidatesYaml(slug)
  return data
}

export async function applyForRole(slug: string, candidate: Omit<RoleCandidate, 'id' | 'appliedAt' | 'status' | 'endorsements'>, viewerOctokit?: Octokit): Promise<RoleCandidate> {
  const { data: candidates, sha } = await readCandidatesYaml(slug)
  const entry: RoleCandidate = {
    ...candidate,
    id: `${candidate.userId}-${Date.now().toString(36)}`,
    appliedAt: new Date().toISOString(),
    status: 'pending',
    endorsements: [],
  }
  candidates.push(entry)
  await writeCandidatesYaml(slug, candidates, sha, viewerOctokit)
  return entry
}

export async function endorseCandidate(slug: string, candidateId: string, endorserId: string, viewerOctokit?: Octokit): Promise<void> {
  const { data: candidates, sha } = await readCandidatesYaml(slug)
  const c = candidates.find(x => x.id === candidateId)
  if (c && !c.endorsements.includes(endorserId)) {
    c.endorsements.push(endorserId)
    await writeCandidatesYaml(slug, candidates, sha, viewerOctokit)
  }
}

export async function updateCandidateStatus(slug: string, candidateId: string, status: RoleCandidate['status'], viewerOctokit?: Octokit): Promise<void> {
  const { data: candidates, sha } = await readCandidatesYaml(slug)
  const c = candidates.find(x => x.id === candidateId)
  if (c) {
    c.status = status
    await writeCandidatesYaml(slug, candidates, sha, viewerOctokit)
  }
}

// ── Validations (stored in .venturewiki/validations.yaml per repo) ───────────

async function readValidationsYaml(slug: string): Promise<{ data: Validation[]; sha: string }> {
  const owner = await resolveBusinessOwner(slug)
  if (!owner) return { data: [], sha: '' }
  try {
    const octokit = getAdminOctokit()
    const { data } = await octokit.rest.repos.getContent({
      owner, repo: slug, path: '.venturewiki/validations.yaml',
    })
    if ('content' in data && data.type === 'file') {
      return { data: (yaml.load(decodeContent(data.content)) as Validation[]) || [], sha: data.sha }
    }
  } catch {}
  return { data: [], sha: '' }
}

async function writeValidationsYaml(slug: string, validations: Validation[], sha: string, viewerOctokit?: Octokit): Promise<void> {
  const owner = await resolveBusinessOwner(slug)
  if (!owner) throw new Error('Business not found')
  const octokit = pickWriteOctokit(owner, viewerOctokit)
  await octokit.rest.repos.createOrUpdateFileContents({
    owner, repo: slug, path: '.venturewiki/validations.yaml',
    message: '✅ Update validations',
    content: encodeContent(yaml.dump(validations, { lineWidth: -1 })),
    ...(sha ? { sha } : {}),
  })
}

export async function getValidations(slug: string): Promise<Validation[]> {
  const { data } = await readValidationsYaml(slug)
  return data
}

export async function addValidation(slug: string, validation: Omit<Validation, 'id' | 'createdAt'>, viewerOctokit?: Octokit): Promise<Validation> {
  const { data: validations, sha } = await readValidationsYaml(slug)
  const entry: Validation = {
    ...validation,
    id: `${validation.userId}-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  }
  validations.push(entry)
  await writeValidationsYaml(slug, validations, sha, viewerOctokit)
  return entry
}

// ── Investment Interest (stored in .venturewiki/investments.yaml per repo) ───

async function readInvestmentsYaml(slug: string): Promise<{ data: InvestmentInterest[]; sha: string }> {
  const owner = await resolveBusinessOwner(slug)
  if (!owner) return { data: [], sha: '' }
  try {
    const octokit = getAdminOctokit()
    const { data } = await octokit.rest.repos.getContent({
      owner, repo: slug, path: '.venturewiki/investments.yaml',
    })
    if ('content' in data && data.type === 'file') {
      return { data: (yaml.load(decodeContent(data.content)) as InvestmentInterest[]) || [], sha: data.sha }
    }
  } catch {}
  return { data: [], sha: '' }
}

async function writeInvestmentsYaml(slug: string, investments: InvestmentInterest[], sha: string, viewerOctokit?: Octokit): Promise<void> {
  const owner = await resolveBusinessOwner(slug)
  if (!owner) throw new Error('Business not found')
  const octokit = pickWriteOctokit(owner, viewerOctokit)
  await octokit.rest.repos.createOrUpdateFileContents({
    owner, repo: slug, path: '.venturewiki/investments.yaml',
    message: '💰 Update investment interest',
    content: encodeContent(yaml.dump(investments, { lineWidth: -1 })),
    ...(sha ? { sha } : {}),
  })
}

export async function getInvestments(slug: string): Promise<InvestmentInterest[]> {
  const { data } = await readInvestmentsYaml(slug)
  return data
}

export async function expressInvestmentInterest(slug: string, investment: Omit<InvestmentInterest, 'id' | 'createdAt' | 'status'>, viewerOctokit?: Octokit): Promise<InvestmentInterest> {
  const { data: investments, sha } = await readInvestmentsYaml(slug)
  const entry: InvestmentInterest = {
    ...investment,
    id: `${investment.investorId}-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    status: 'expressed',
  }
  investments.push(entry)
  await writeInvestmentsYaml(slug, investments, sha, viewerOctokit)
  return entry
}

export async function updateInvestmentStatus(slug: string, investmentId: string, status: InvestmentInterest['status'], viewerOctokit?: Octokit): Promise<void> {
  const { data: investments, sha } = await readInvestmentsYaml(slug)
  const inv = investments.find(x => x.id === investmentId)
  if (inv) {
    inv.status = status
    await writeInvestmentsYaml(slug, investments, sha, viewerOctokit)
  }
}

// ── Venture Value / Worthiness ───────────────────────────────────────────────

export async function getVentureValue(slug: string): Promise<VentureValue> {
  const [candidates, validations, investments, comments] = await Promise.all([
    getCandidates(slug),
    getValidations(slug),
    getInvestments(slug),
    getComments(slug),
  ])

  const validatedCount = validations.filter(v => v.status === 'validated').length
  const disputedCount = validations.filter(v => v.status === 'disputed').length
  const validationScore = validatedCount - disputedCount

  const plan = await readPlanYaml(slug)
  const editCount = plan?.data?.editCount || 0

  const collaborationCount = candidates.length + validations.length + investments.length + comments.length
  const overallScore = (collaborationCount * 2) + (validationScore * 3) + (investments.length * 5) + editCount

  return {
    ventureId: slug,
    collaborationCount,
    validationScore,
    investmentInterest: investments.length,
    candidateCount: candidates.length,
    commentCount: comments.length,
    editCount,
    overallScore,
  }
}

// ── .venturewiki folder file browser ─────────────────────────────────────────
// System files surfaced via dedicated tabs/APIs — excluded from the generic file list.
const VW_SYSTEM_FILES = new Set([
  'plan.yaml',
  'candidates.yaml',
  'validations.yaml',
  'investments.yaml',
  'value.yaml',
])

export interface VentureFile {
  path: string   // path relative to .venturewiki/
  name: string   // file basename
  size: number
}

export async function listVentureFiles(slug: string): Promise<VentureFile[]> {
  const cacheKey = `vwfiles:${slug}`
  const cached = getCached<VentureFile[]>(cacheKey)
  if (cached) return cached

  const owner = await resolveBusinessOwner(slug)
  if (!owner) return []

  try {
    const octokit = getPublicOctokit()
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: slug,
      path: '.venturewiki',
    })
    if (!Array.isArray(data)) return []
    const files = data
      .filter(item => item.type === 'file' && !VW_SYSTEM_FILES.has(item.name))
      .map(item => ({ path: item.name, name: item.name, size: item.size || 0 }))
    setCache(cacheKey, files)
    return files
  } catch {
    return []
  }
}

function validateVentureFilename(filePath: string): void {
  if (!filePath.trim()) throw new Error('Filename is required')
  if (filePath.includes('..') || filePath.includes('/') || filePath.includes('\\')) {
    throw new Error('Filename must not contain path separators')
  }
  if (filePath.startsWith('.')) throw new Error('Filename cannot start with a dot')
  if (VW_SYSTEM_FILES.has(filePath)) throw new Error('That filename is reserved')
  if (filePath.length > 100) throw new Error('Filename is too long')
  if (!/^[A-Za-z0-9 ._-]+$/.test(filePath)) {
    throw new Error('Filename may only contain letters, numbers, spaces, dot, dash, underscore')
  }
  if (filePath !== filePath.trim()) throw new Error('Filename cannot start or end with whitespace')
}

export async function createVentureFile(
  slug: string,
  filePath: string,
  content: string,
  message: string,
  viewerOctokit?: Octokit,
): Promise<void> {
  validateVentureFilename(filePath)
  const owner = await resolveBusinessOwner(slug)
  if (!owner) throw new Error('Business not found')
  const octokit = pickWriteOctokit(owner, viewerOctokit)
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo: slug,
    path: `.venturewiki/${filePath}`,
    message,
    content: encodeContent(content),
  })
  invalidateCache(`vwfiles:${slug}`)
  invalidateCache(`vwfile:${slug}:${filePath}`)
}

export async function readVentureFile(
  slug: string,
  filePath: string,
): Promise<{ name: string; content: string } | null> {
  // Reject traversal / system files; only allow simple names within .venturewiki/
  if (filePath.includes('..') || filePath.includes('/') || filePath.includes('\\')) return null
  if (VW_SYSTEM_FILES.has(filePath)) return null

  const cacheKey = `vwfile:${slug}:${filePath}`
  const cached = getCached<{ name: string; content: string }>(cacheKey)
  if (cached) return cached

  const owner = await resolveBusinessOwner(slug)
  if (!owner) return null

  try {
    const octokit = getPublicOctokit()
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: slug,
      path: `.venturewiki/${filePath}`,
    })
    if ('content' in data && data.type === 'file') {
      const result = { name: data.name, content: decodeContent(data.content) }
      setCache(cacheKey, result)
      return result
    }
    return null
  } catch {
    return null
  }
}
