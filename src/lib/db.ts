import yaml from 'js-yaml'
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

async function readPlanYaml(slug: string): Promise<{ data: any; sha: string } | null> {
  const cacheKey = `plan:${slug}`
  const cached = getCached<{ data: any; sha: string }>(cacheKey)
  if (cached) return cached

  try {
    const octokit = getPublicOctokit()
    const { data } = await octokit.rest.repos.getContent({
      owner: GITHUB_ORG,
      repo: slug,
      path: '.venturewiki/plan.yaml',
    })
    if ('content' in data && data.type === 'file') {
      const result = { data: yaml.load(decodeContent(data.content)), sha: data.sha }
      setCache(cacheKey, result)
      return result
    }
    return null
  } catch {
    return null
  }
}

async function writePlanYaml(
  slug: string, plan: any, message: string, existingSha?: string
): Promise<void> {
  const octokit = getAdminOctokit()
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: GITHUB_ORG,
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
    createdAt: repo.created_at,
    updatedAt: repo.pushed_at || repo.updated_at,
    viewCount: repo.watchers_count || 0,
    isArchived: repo.archived || false,
    isPublic: !repo.private,
    isFeatured: (repo.topics || []).includes('venturewiki-featured'),
  }
}

// ── Business Plans ────────────────────────────────────────────────────────────

export async function createBusiness(
  data: Omit<BusinessPlan, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'viewCount' | 'editCount'>,
  userId: string
): Promise<string> {
  const slug = slugify(data.cover.companyName) + '-' + Date.now().toString(36)
  const octokit = getAdminOctokit()

  const isPublic = data.isPublic !== false // default to public if not specified

  await octokit.rest.repos.createInOrg({
    org: GITHUB_ORG,
    name: slug,
    description: `${data.cover.logoEmoji || '🚀'} ${data.cover.companyName} — ${data.cover.tagline}`,
    visibility: isPublic ? 'public' : 'private',
    has_issues: true,
    auto_init: false,
  })

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

  await writePlanYaml(slug, plan, `✨ Create business plan: ${data.cover.companyName}`)

  await octokit.rest.repos.createOrUpdateFileContents({
    owner: GITHUB_ORG,
    repo: slug,
    path: 'README.md',
    message: 'Add README',
    content: encodeContent(generateReadme(plan as BusinessPlan)),
  })

  // Add GitHub Actions workflow for GitHub Pages
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: GITHUB_ORG,
    repo: slug,
    path: '.github/workflows/pages.yml',
    message: '🌐 Add GitHub Pages workflow',
    content: encodeContent(generatePagesWorkflow()),
  })

  // Enable GitHub Pages (source: GitHub Actions)
  await enableGitHubPages(octokit, GITHUB_ORG, slug)

  try {
    await octokit.rest.repos.replaceAllTopics({
      owner: GITHUB_ORG,
      repo: slug,
      names: planToTopics(plan as BusinessPlan),
    })
  } catch {}

  return slug
}

export async function getBusiness(id: string): Promise<BusinessPlan | null> {
  return getBusinessBySlug(id)
}

export async function getBusinessBySlug(slug: string): Promise<BusinessPlan | null> {
  try {
    const octokit = getPublicOctokit()
    const { data: repo } = await octokit.rest.repos.get({
      owner: GITHUB_ORG,
      repo: slug,
    })
    const planResult = await readPlanYaml(slug)
    if (!planResult) return null
    return repoToPlan(repo, planResult.data)
  } catch {
    return null
  }
}

export async function updateBusiness(
  id: string, data: Partial<BusinessPlan>, userId: string, editSummary: string
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

  await writePlanYaml(id, updated, `📝 ${editSummary}`, existing.sha)

  const octokit = getAdminOctokit()
  try {
    const { data: readmeFile } = await octokit.rest.repos.getContent({
      owner: GITHUB_ORG,
      repo: id,
      path: 'README.md',
    })
    if ('sha' in readmeFile) {
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: GITHUB_ORG,
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
      owner: GITHUB_ORG,
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

  let searchQuery = `org:${GITHUB_ORG} topic:venturewiki`
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
  const octokit = getAdminOctokit()
  const { data: repo } = await octokit.rest.repos.get({ owner: GITHUB_ORG, repo: id })
  let topics = repo.topics || []
  if (featured && !topics.includes('venturewiki-featured')) {
    topics.push('venturewiki-featured')
  } else if (!featured) {
    topics = topics.filter((t: string) => t !== 'venturewiki-featured')
  }
  await octokit.rest.repos.replaceAllTopics({ owner: GITHUB_ORG, repo: id, names: topics })
}

export async function archiveBusiness(id: string) {
  const octokit = getAdminOctokit()
  await octokit.rest.repos.update({ owner: GITHUB_ORG, repo: id, archived: true })
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

// ── Edit History (from git commits on plan.yaml) ─────────────────────────────

export async function getEditHistory(businessId: string): Promise<EditRecord[]> {
  try {
    const octokit = getPublicOctokit()
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner: GITHUB_ORG,
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

async function getOrCreateDiscussionIssue(repoSlug: string): Promise<number> {
  const octokit = getAdminOctokit()
  const { data: issues } = await octokit.rest.issues.listForRepo({
    owner: GITHUB_ORG,
    repo: repoSlug,
    labels: 'discussion',
    state: 'open',
    per_page: 1,
  })
  if (issues.length > 0) return issues[0].number

  const { data: issue } = await octokit.rest.issues.create({
    owner: GITHUB_ORG,
    repo: repoSlug,
    title: '💬 Discussion — Leave your feedback',
    body: 'This is the community discussion thread for this business plan. Share feedback, ask questions, or suggest edits!',
    labels: ['discussion'],
  })
  return issue.number
}

export async function addComment(data: Omit<Comment, 'id' | 'createdAt'>): Promise<string> {
  const octokit = getAdminOctokit()
  const issueNumber = await getOrCreateDiscussionIssue(data.businessId)
  const body = data.section
    ? `**Re: ${data.section}**\n\n${data.content}`
    : data.content

  const { data: comment } = await octokit.rest.issues.createComment({
    owner: GITHUB_ORG,
    repo: data.businessId,
    issue_number: issueNumber,
    body,
  })
  return comment.id.toString()
}

export async function getComments(businessId: string): Promise<Comment[]> {
  try {
    const octokit = getPublicOctokit()
    const issueNumber = await getOrCreateDiscussionIssue(businessId)
    const { data: comments } = await octokit.rest.issues.listComments({
      owner: GITHUB_ORG,
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
  try {
    const octokit = getAdminOctokit()
    const { data } = await octokit.rest.repos.getContent({
      owner: GITHUB_ORG, repo: slug, path: '.venturewiki/candidates.yaml',
    })
    if ('content' in data && data.type === 'file') {
      return { data: (yaml.load(decodeContent(data.content)) as RoleCandidate[]) || [], sha: data.sha }
    }
  } catch {}
  return { data: [], sha: '' }
}

async function writeCandidatesYaml(slug: string, candidates: RoleCandidate[], sha: string): Promise<void> {
  const octokit = getAdminOctokit()
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: GITHUB_ORG, repo: slug, path: '.venturewiki/candidates.yaml',
    message: '👤 Update role candidates',
    content: encodeContent(yaml.dump(candidates, { lineWidth: -1 })),
    ...(sha ? { sha } : {}),
  })
}

export async function getCandidates(slug: string): Promise<RoleCandidate[]> {
  const { data } = await readCandidatesYaml(slug)
  return data
}

export async function applyForRole(slug: string, candidate: Omit<RoleCandidate, 'id' | 'appliedAt' | 'status' | 'endorsements'>): Promise<RoleCandidate> {
  const { data: candidates, sha } = await readCandidatesYaml(slug)
  const entry: RoleCandidate = {
    ...candidate,
    id: `${candidate.userId}-${Date.now().toString(36)}`,
    appliedAt: new Date().toISOString(),
    status: 'pending',
    endorsements: [],
  }
  candidates.push(entry)
  await writeCandidatesYaml(slug, candidates, sha)
  return entry
}

export async function endorseCandidate(slug: string, candidateId: string, endorserId: string): Promise<void> {
  const { data: candidates, sha } = await readCandidatesYaml(slug)
  const c = candidates.find(x => x.id === candidateId)
  if (c && !c.endorsements.includes(endorserId)) {
    c.endorsements.push(endorserId)
    await writeCandidatesYaml(slug, candidates, sha)
  }
}

export async function updateCandidateStatus(slug: string, candidateId: string, status: RoleCandidate['status']): Promise<void> {
  const { data: candidates, sha } = await readCandidatesYaml(slug)
  const c = candidates.find(x => x.id === candidateId)
  if (c) {
    c.status = status
    await writeCandidatesYaml(slug, candidates, sha)
  }
}

// ── Validations (stored in .venturewiki/validations.yaml per repo) ───────────

async function readValidationsYaml(slug: string): Promise<{ data: Validation[]; sha: string }> {
  try {
    const octokit = getAdminOctokit()
    const { data } = await octokit.rest.repos.getContent({
      owner: GITHUB_ORG, repo: slug, path: '.venturewiki/validations.yaml',
    })
    if ('content' in data && data.type === 'file') {
      return { data: (yaml.load(decodeContent(data.content)) as Validation[]) || [], sha: data.sha }
    }
  } catch {}
  return { data: [], sha: '' }
}

async function writeValidationsYaml(slug: string, validations: Validation[], sha: string): Promise<void> {
  const octokit = getAdminOctokit()
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: GITHUB_ORG, repo: slug, path: '.venturewiki/validations.yaml',
    message: '✅ Update validations',
    content: encodeContent(yaml.dump(validations, { lineWidth: -1 })),
    ...(sha ? { sha } : {}),
  })
}

export async function getValidations(slug: string): Promise<Validation[]> {
  const { data } = await readValidationsYaml(slug)
  return data
}

export async function addValidation(slug: string, validation: Omit<Validation, 'id' | 'createdAt'>): Promise<Validation> {
  const { data: validations, sha } = await readValidationsYaml(slug)
  const entry: Validation = {
    ...validation,
    id: `${validation.userId}-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  }
  validations.push(entry)
  await writeValidationsYaml(slug, validations, sha)
  return entry
}

// ── Investment Interest (stored in .venturewiki/investments.yaml per repo) ───

async function readInvestmentsYaml(slug: string): Promise<{ data: InvestmentInterest[]; sha: string }> {
  try {
    const octokit = getAdminOctokit()
    const { data } = await octokit.rest.repos.getContent({
      owner: GITHUB_ORG, repo: slug, path: '.venturewiki/investments.yaml',
    })
    if ('content' in data && data.type === 'file') {
      return { data: (yaml.load(decodeContent(data.content)) as InvestmentInterest[]) || [], sha: data.sha }
    }
  } catch {}
  return { data: [], sha: '' }
}

async function writeInvestmentsYaml(slug: string, investments: InvestmentInterest[], sha: string): Promise<void> {
  const octokit = getAdminOctokit()
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: GITHUB_ORG, repo: slug, path: '.venturewiki/investments.yaml',
    message: '💰 Update investment interest',
    content: encodeContent(yaml.dump(investments, { lineWidth: -1 })),
    ...(sha ? { sha } : {}),
  })
}

export async function getInvestments(slug: string): Promise<InvestmentInterest[]> {
  const { data } = await readInvestmentsYaml(slug)
  return data
}

export async function expressInvestmentInterest(slug: string, investment: Omit<InvestmentInterest, 'id' | 'createdAt' | 'status'>): Promise<InvestmentInterest> {
  const { data: investments, sha } = await readInvestmentsYaml(slug)
  const entry: InvestmentInterest = {
    ...investment,
    id: `${investment.investorId}-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    status: 'expressed',
  }
  investments.push(entry)
  await writeInvestmentsYaml(slug, investments, sha)
  return entry
}

export async function updateInvestmentStatus(slug: string, investmentId: string, status: InvestmentInterest['status']): Promise<void> {
  const { data: investments, sha } = await readInvestmentsYaml(slug)
  const inv = investments.find(x => x.id === investmentId)
  if (inv) {
    inv.status = status
    await writeInvestmentsYaml(slug, investments, sha)
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
