/**
 * Venture CRUD over the GitHub API — a deliberately self-contained slice of
 * what the VentureWiki web app's `src/lib/db` layer does, so this MCP server
 * can be published / deployed independently.
 *
 * TODO: when `@venturewiki/core` is extracted from the web app, replace this
 * file with imports from that package so the two stay in lock-step.
 *
 * A "venture" is a GitHub repo carrying a `.venturewiki/plan.yaml` business
 * plan and the topic `venturewiki`. It can live under any user or org; the
 * canonical public instance is the `venturewiki` org.
 */
import { Octokit } from 'octokit'
import yaml from 'js-yaml'

export const PLAN_PATH = '.venturewiki/plan.yaml'
export const VENTUREWIKI_ORG = process.env.VENTUREWIKI_ORG || 'venturewiki'
export const VENTUREWIKI_TOPIC = 'venturewiki'

export interface Auth {
  /** A GitHub token (OAuth or PAT) with at least `repo` scope. */
  token: string
}

export function octokitFor(auth: Auth): Octokit {
  if (!auth.token) throw new Error('A GitHub token is required (set GITHUB_TOKEN or pass an Authorization: Bearer header).')
  return new Octokit({ auth: auth.token })
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'venture'
}

function decode(content: string): string {
  return Buffer.from(content, 'base64').toString('utf-8')
}
function encode(text: string): string {
  return Buffer.from(text, 'utf-8').toString('base64')
}

// ── Read ───────────────────────────────────────────────────────────────────

export interface VentureRef { owner: string; slug: string }

export interface VentureSummary {
  owner: string
  slug: string
  repoUrl: string
  isPrivate: boolean
  description: string | null
  topics: string[]
  updatedAt: string
  companyName?: string
  tagline?: string
  stage?: string
}

function toSummary(repo: any, cover?: any): VentureSummary {
  return {
    owner: repo.owner?.login ?? repo.full_name?.split('/')[0] ?? '',
    slug: repo.name,
    repoUrl: repo.html_url,
    isPrivate: !!repo.private,
    description: repo.description ?? null,
    topics: repo.topics ?? [],
    updatedAt: repo.updated_at ?? repo.pushed_at ?? '',
    companyName: cover?.companyName,
    tagline: cover?.tagline,
    stage: cover?.stage,
  }
}

/** List the authenticated user's ventures (repos topic-tagged `venturewiki`). */
export async function listMyVentures(auth: Auth): Promise<VentureSummary[]> {
  const octokit = octokitFor(auth)
  const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, { per_page: 100, sort: 'updated' })
  return repos.filter(r => (r.topics ?? []).includes(VENTUREWIKI_TOPIC)).map(r => toSummary(r))
}

/** List ventures owned by a specific user or org. */
export async function listVenturesForOwner(auth: Auth, owner: string): Promise<VentureSummary[]> {
  const octokit = octokitFor(auth)
  // listForUser covers both users and orgs for public repos; for private repos
  // in an org the caller must be a member — GitHub enforces that.
  const repos = await octokit.paginate(octokit.rest.repos.listForUser, { username: owner, per_page: 100, sort: 'updated' })
    .catch(async () => octokit.paginate(octokit.rest.repos.listForOrg, { org: owner, per_page: 100, sort: 'updated' }).catch(() => []))
  return repos.filter(r => (r.topics ?? []).includes(VENTUREWIKI_TOPIC)).map(r => toSummary(r))
}

/** Search across GitHub for ventures matching a free-text query. */
export async function searchVentures(auth: Auth, query: string, limit = 20): Promise<VentureSummary[]> {
  const octokit = octokitFor(auth)
  const q = `${query ? query + ' ' : ''}topic:${VENTUREWIKI_TOPIC}`.trim()
  const { data } = await octokit.rest.search.repos({ q, per_page: Math.min(limit, 50) })
  return data.items.map(r => toSummary(r))
}

export interface VentureDetail {
  owner: string
  slug: string
  repoUrl: string
  isPrivate: boolean
  isArchived: boolean
  topics: string[]
  updatedAt: string
  /** Parsed plan.yaml, or null if the file is missing/malformed. */
  plan: Record<string, any> | null
  /** Verbatim plan.yaml file content (if present). */
  planRaw: string | null
  /** js-yaml parse error message, if the file is malformed. */
  planError?: string
  /** Blob SHA of plan.yaml — needed to update it. */
  planSha?: string
}

async function getRepo(octokit: Octokit, owner: string, slug: string) {
  const { data } = await octokit.rest.repos.get({ owner, repo: slug })
  return data
}

async function getPlanFile(octokit: Octokit, owner: string, slug: string): Promise<{ raw: string; sha: string } | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo: slug, path: PLAN_PATH })
    if (Array.isArray(data) || data.type !== 'file' || !('content' in data) || !data.content) return null
    return { raw: decode(data.content), sha: data.sha }
  } catch {
    return null
  }
}

export async function getVenture(auth: Auth, ref: VentureRef): Promise<VentureDetail> {
  const octokit = octokitFor(auth)
  const repo = await getRepo(octokit, ref.owner, ref.slug)
  const file = await getPlanFile(octokit, ref.owner, ref.slug)
  let plan: Record<string, any> | null = null
  let planError: string | undefined
  if (file) {
    try {
      const parsed = yaml.load(file.raw)
      plan = parsed && typeof parsed === 'object' ? (parsed as Record<string, any>) : null
    } catch (e: any) {
      planError = e?.message || 'plan.yaml is not valid YAML'
    }
  }
  return {
    owner: ref.owner,
    slug: ref.slug,
    repoUrl: repo.html_url,
    isPrivate: !!repo.private,
    isArchived: !!repo.archived,
    topics: repo.topics ?? [],
    updatedAt: repo.updated_at ?? '',
    plan,
    planRaw: file?.raw ?? null,
    planError,
    planSha: file?.sha,
  }
}

// ── Create ─────────────────────────────────────────────────────────────────

export type CreateTarget =
  | { kind: 'me' }
  | { kind: 'org'; org: string }

export interface CreateVentureInput {
  target: CreateTarget
  companyName: string
  slug?: string
  tagline?: string
  mission?: string
  stage?: string         // idea | mvp | beta | live | scaling | exited
  productType?: string   // web-app | website | ai-agent | api | hybrid | other
  industryVertical?: string
  websiteUrl?: string
  logoEmoji?: string
  visibility: 'public' | 'private'
}

const ALLOWED_STAGES = ['idea', 'mvp', 'beta', 'live', 'scaling', 'exited']
const ALLOWED_PRODUCT_TYPES = ['web-app', 'website', 'ai-agent', 'api', 'hybrid', 'other']

/** Builds a minimal-but-valid plan.yaml. The web app reads it leniently and
 *  the owner can flesh out the remaining 5-page template in the UI. */
function scaffoldPlan(input: CreateVentureInput, slug: string, ownerLogin: string, login: string): Record<string, any> {
  const now = new Date().toISOString()
  const stage = ALLOWED_STAGES.includes(input.stage || '') ? input.stage : 'idea'
  const productType = ALLOWED_PRODUCT_TYPES.includes(input.productType || '') ? input.productType : 'web-app'
  return {
    id: slug,
    slug,
    owner: ownerLogin,
    createdBy: login,
    contributors: [login],
    viewCount: 0,
    editCount: 0,
    isPublic: input.visibility === 'public',
    isArchived: false,
    isFeatured: false,
    createdAt: now,
    updatedAt: now,
    cover: {
      companyName: input.companyName,
      tagline: input.tagline || '',
      mission: input.mission || '',
      vision: '',
      productType,
      industryVertical: input.industryVertical || '',
      stage,
      fundingStage: 'bootstrapped',
      headquarters: '',
      legalStructure: '',
      websiteUrl: input.websiteUrl || '',
      logoEmoji: input.logoEmoji || '🚀',
      accentColor: '#E8622A',
      version: '0.1',
      preparedBy: login,
      tractionHighlights: {},
    },
    problemSolution: { features: [], market: {}, painDimensions: {} },
    productGtm: { techStack: {}, gtmChannels: [], competitors: [] },
    teamRoadmap: { founders: [], advisors: '', openRoles: '', kpis: [], milestones: [] },
    fundingAsk: { useOfFunds: [], elevatorPitch: {}, risks: [] },
    financials: { projections: [] },
  }
}

function ventureTopics(plan: Record<string, any>): string[] {
  const stage = plan?.cover?.stage
  const type = plan?.cover?.productType
  return [VENTUREWIKI_TOPIC, ...(stage ? [`stage-${stage}`] : []), ...(type ? [`type-${type}`] : []), 'created-via-mcp']
}

export interface CreatedVenture { owner: string; slug: string; repoUrl: string }

export async function createVenture(auth: Auth, input: CreateVentureInput): Promise<CreatedVenture> {
  if (!input.companyName?.trim()) throw new Error('companyName is required')
  const octokit = octokitFor(auth)
  const { data: me } = await octokit.rest.users.getAuthenticated()
  const login = me.login
  const slug = slugify(input.slug || input.companyName)
  const ownerLogin = input.target.kind === 'org' ? input.target.org : login
  const description = `${input.logoEmoji || '🚀'} ${input.companyName}${input.tagline ? ' — ' + input.tagline : ''}`

  if (input.target.kind === 'org') {
    await octokit.rest.repos.createInOrg({
      org: input.target.org, name: slug, description,
      visibility: input.visibility, has_issues: true, auto_init: false,
    })
  } else {
    await octokit.rest.repos.createForAuthenticatedUser({
      name: slug, description, private: input.visibility === 'private', has_issues: true, auto_init: false,
    })
  }

  const plan = scaffoldPlan(input, slug, ownerLogin, login)
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: ownerLogin, repo: slug, path: PLAN_PATH,
    message: `Create business plan: ${input.companyName}`,
    content: encode(yaml.dump(plan, { lineWidth: -1 })),
  })
  await octokit.rest.repos.replaceAllTopics({ owner: ownerLogin, repo: slug, names: ventureTopics(plan) }).catch(() => {})

  const { data: repo } = await octokit.rest.repos.get({ owner: ownerLogin, repo: slug })
  return { owner: ownerLogin, slug, repoUrl: repo.html_url }
}

// ── Update ─────────────────────────────────────────────────────────────────

async function writePlanRaw(octokit: Octokit, owner: string, slug: string, raw: string, message: string, sha?: string) {
  // js-yaml validation up front so we never commit a syntactically broken plan.
  yaml.load(raw)
  let useSha = sha
  if (!useSha) {
    const existing = await getPlanFile(octokit, owner, slug)
    useSha = existing?.sha
  }
  await octokit.rest.repos.createOrUpdateFileContents({
    owner, repo: slug, path: PLAN_PATH, message, content: encode(raw), sha: useSha,
  })
}

export async function getVentureRaw(auth: Auth, ref: VentureRef): Promise<string | null> {
  const octokit = octokitFor(auth)
  const file = await getPlanFile(octokit, ref.owner, ref.slug)
  return file?.raw ?? null
}

export async function setVentureRaw(auth: Auth, ref: VentureRef, content: string, message?: string): Promise<void> {
  const octokit = octokitFor(auth)
  await writePlanRaw(octokit, ref.owner, ref.slug, content, message || 'Update plan.yaml via MCP')
}

/** Replace a single top-level section of plan.yaml with the given value. */
export async function updateVentureSection(
  auth: Auth, ref: VentureRef, section: string, value: unknown, message?: string,
): Promise<void> {
  if (!section || section.includes('.')) throw new Error('section must be a single top-level key (e.g. "cover", "teamRoadmap")')
  const octokit = octokitFor(auth)
  const file = await getPlanFile(octokit, ref.owner, ref.slug)
  if (!file) throw new Error(`No ${PLAN_PATH} found in ${ref.owner}/${ref.slug}`)
  let plan: Record<string, any>
  try {
    const parsed = yaml.load(file.raw)
    if (!parsed || typeof parsed !== 'object') throw new Error('not an object')
    plan = parsed as Record<string, any>
  } catch (e: any) {
    throw new Error(`${PLAN_PATH} is malformed (${e?.message || e}). Fix it with set_venture_raw first.`)
  }
  plan[section] = value
  plan.updatedAt = new Date().toISOString()
  await writePlanRaw(octokit, ref.owner, ref.slug, yaml.dump(plan, { lineWidth: -1 }), message || `Update ${section} via MCP`, file.sha)
}

// ── Archive ────────────────────────────────────────────────────────────────

export async function archiveVenture(auth: Auth, ref: VentureRef): Promise<void> {
  const octokit = octokitFor(auth)
  await octokit.rest.repos.update({ owner: ref.owner, repo: ref.slug, archived: true })
}

// ── Identity ───────────────────────────────────────────────────────────────

export async function whoami(auth: Auth): Promise<{ login: string; name: string | null; id: number }> {
  const octokit = octokitFor(auth)
  const { data } = await octokit.rest.users.getAuthenticated()
  return { login: data.login, name: data.name ?? null, id: data.id }
}
