import type { Octokit } from 'octokit'
import { getAdminOctokit, getPublicOctokit, GITHUB_ORG } from '@/lib/github'
import type {
  VentureIssue, VentureIssueComment, VentureIssueDetail, VentureIssueType, VentureIssueStatus,
} from '@/types'
import { resolveBusinessOwner, pickWriteOctokit } from './owner'

// Venture issues are plain GitHub Issues. We layer a small `vw:` label
// taxonomy on top so the board can group by type and lifecycle status without
// any extra storage. The single community-discussion issue (label `discussion`)
// is owned by db/comments.ts and is filtered out here.
const DISCUSSION_LABEL = 'discussion'
export const IN_PROGRESS_LABEL = 'vw:in-progress'

const TYPE_LABELS: Record<VentureIssueType, { color: string; description: string }> = {
  task:        { color: '0e8a16', description: 'A unit of work for this venture' },
  milestone:   { color: '5319e7', description: 'A roadmap milestone' },
  'open-role': { color: '1d76db', description: 'A role this venture is hiring for' },
  idea:        { color: 'fbca04', description: 'An idea or proposal to consider' },
  risk:        { color: 'b60205', description: 'A risk to track and mitigate' },
  bug:         { color: 'd73a4a', description: 'Something that is broken' },
}
const ISSUE_TYPES = Object.keys(TYPE_LABELS) as VentureIssueType[]

const typeLabelName = (t: VentureIssueType) => `vw:${t}`

function isValidType(t: unknown): t is VentureIssueType {
  return typeof t === 'string' && (ISSUE_TYPES as string[]).includes(t)
}

function labelNames(raw: any): string[] {
  return (raw?.labels || [])
    .map((l: any) => (typeof l === 'string' ? l : l?.name))
    .filter((n: unknown): n is string => typeof n === 'string' && n.length > 0)
}

function parseType(labels: string[]): VentureIssueType | null {
  return ISSUE_TYPES.find(t => labels.includes(typeLabelName(t))) ?? null
}

function deriveStatus(state: 'open' | 'closed', labels: string[]): VentureIssueStatus {
  if (state === 'closed') return 'done'
  return labels.includes(IN_PROGRESS_LABEL) ? 'in-progress' : 'backlog'
}

// Admin token for the platform org; the viewer's token (or an unauthenticated
// fallback that simply 404s on private repos) for ventures hosted elsewhere.
function readerFor(owner: string, viewerOctokit?: Octokit): Octokit {
  return owner === GITHUB_ORG ? getAdminOctokit() : (viewerOctokit ?? getPublicOctokit())
}

// Best-effort: give the `vw:` labels nice colours/descriptions. GitHub
// auto-creates any missing label referenced by issues.create anyway, so a
// failure here (e.g. no permission) is harmless.
async function ensureVentureLabels(octokit: Octokit, owner: string, repo: string) {
  const wanted = [
    ...ISSUE_TYPES.map(t => ({ name: typeLabelName(t), ...TYPE_LABELS[t] })),
    { name: IN_PROGRESS_LABEL, color: 'fef2c0', description: 'Actively being worked on' },
  ]
  await Promise.all(wanted.map(l =>
    octokit.rest.issues.createLabel({ owner, repo, name: l.name, color: l.color, description: l.description })
      .catch(() => { /* exists or not permitted */ }),
  ))
}

function toVentureIssue(slug: string, raw: any): VentureIssue {
  const labels = labelNames(raw)
  const state: 'open' | 'closed' = raw.state === 'closed' ? 'closed' : 'open'
  return {
    number: raw.number,
    businessId: slug,
    title: raw.title || '',
    body: raw.body || '',
    type: parseType(labels),
    status: deriveStatus(state, labels),
    state,
    labels,
    authorLogin: raw.user?.login || '',
    authorImage: raw.user?.avatar_url,
    assignees: (raw.assignees || []).map((a: any) => ({ login: a.login, avatarUrl: a.avatar_url })),
    commentCount: raw.comments ?? 0,
    htmlUrl: raw.html_url || '',
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    closedAt: raw.closed_at || undefined,
  }
}

function toIssueComment(c: any): VentureIssueComment {
  return {
    id: c.id.toString(),
    authorLogin: c.user?.login || '',
    authorImage: c.user?.avatar_url,
    body: c.body || '',
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    htmlUrl: c.html_url || '',
  }
}

export interface ListIssuesOpts {
  state?: 'open' | 'closed' | 'all'
  type?: VentureIssueType
  viewerOctokit?: Octokit
}

export async function listVentureIssues(slug: string, opts: ListIssuesOpts = {}): Promise<VentureIssue[]> {
  const owner = await resolveBusinessOwner(slug, opts.viewerOctokit)
  if (!owner) return []
  try {
    const { data } = await readerFor(owner, opts.viewerOctokit).rest.issues.listForRepo({
      owner, repo: slug,
      state: opts.state ?? 'all',
      labels: opts.type ? typeLabelName(opts.type) : undefined,
      sort: 'updated', direction: 'desc',
      per_page: 100,
    })
    return data
      .filter(i => !i.pull_request)
      .map(i => toVentureIssue(slug, i))
      .filter(i => !i.labels.includes(DISCUSSION_LABEL))
  } catch {
    return []
  }
}

export async function getVentureIssue(
  slug: string, number: number, viewerOctokit?: Octokit,
): Promise<VentureIssueDetail | null> {
  const owner = await resolveBusinessOwner(slug, viewerOctokit)
  if (!owner) return null
  const reader = readerFor(owner, viewerOctokit)
  try {
    const { data: issue } = await reader.rest.issues.get({ owner, repo: slug, issue_number: number })
    if (issue.pull_request) return null
    const { data: comments } = await reader.rest.issues.listComments({
      owner, repo: slug, issue_number: number, per_page: 100,
    })
    return { ...toVentureIssue(slug, issue), comments: comments.map(toIssueComment) }
  } catch {
    return null
  }
}

export interface CreateIssueInput {
  title: string
  body?: string
  type?: VentureIssueType
  assignees?: string[]
}

export async function createVentureIssue(
  slug: string, input: CreateIssueInput, viewerOctokit?: Octokit,
): Promise<VentureIssue> {
  const title = (input.title || '').trim()
  if (!title) throw new Error('Issue title is required')
  const type = isValidType(input.type) ? input.type : undefined

  const owner = await resolveBusinessOwner(slug, viewerOctokit)
  if (!owner) throw new Error('Venture not found')
  const octokit = pickWriteOctokit(owner, viewerOctokit)
  if (type) await ensureVentureLabels(octokit, owner, slug)

  const { data } = await octokit.rest.issues.create({
    owner, repo: slug,
    title,
    body: input.body?.trim() || undefined,
    labels: type ? [typeLabelName(type)] : undefined,
    assignees: input.assignees?.length ? input.assignees : undefined,
  })
  return toVentureIssue(slug, data)
}

export interface UpdateIssueInput {
  title?: string
  body?: string
  type?: VentureIssueType | null   // null clears the type label
  status?: VentureIssueStatus
  assignees?: string[]
}

export async function updateVentureIssue(
  slug: string, number: number, input: UpdateIssueInput, viewerOctokit?: Octokit,
): Promise<VentureIssue> {
  const owner = await resolveBusinessOwner(slug, viewerOctokit)
  if (!owner) throw new Error('Venture not found')
  const octokit = pickWriteOctokit(owner, viewerOctokit)

  const nextState: 'open' | 'closed' | undefined =
    input.status === undefined ? undefined : input.status === 'done' ? 'closed' : 'open'

  let nextLabels: string[] | undefined
  const typeChanging = input.type !== undefined
  // Only treat status as label-affecting when it isn't a pure open/close.
  const statusLabelChanging = input.status === 'backlog' || input.status === 'in-progress'
  if (typeChanging || statusLabelChanging) {
    await ensureVentureLabels(octokit, owner, slug)
    const { data: current } = await octokit.rest.issues.get({ owner, repo: slug, issue_number: number })
    let labels = labelNames(current)
    if (typeChanging) {
      labels = labels.filter(l => !ISSUE_TYPES.some(t => l === typeLabelName(t)))
      if (input.type) labels.push(typeLabelName(input.type))
    }
    if (statusLabelChanging) {
      labels = labels.filter(l => l !== IN_PROGRESS_LABEL)
      if (input.status === 'in-progress') labels.push(IN_PROGRESS_LABEL)
    }
    nextLabels = Array.from(new Set(labels))
  } else if (input.status === 'done') {
    // Closing: also drop the in-progress marker so a later reopen starts clean.
    const { data: current } = await octokit.rest.issues.get({ owner, repo: slug, issue_number: number })
    nextLabels = labelNames(current).filter(l => l !== IN_PROGRESS_LABEL)
  }

  const { data } = await octokit.rest.issues.update({
    owner, repo: slug, issue_number: number,
    title: input.title?.trim() || undefined,
    body: input.body,
    state: nextState,
    labels: nextLabels,
    assignees: input.assignees,
  })
  return toVentureIssue(slug, data)
}

export async function addVentureIssueComment(
  slug: string, number: number, body: string, viewerOctokit?: Octokit,
): Promise<VentureIssueComment> {
  const text = (body || '').trim()
  if (!text) throw new Error('Comment body is required')
  const owner = await resolveBusinessOwner(slug, viewerOctokit)
  if (!owner) throw new Error('Venture not found')
  const octokit = pickWriteOctokit(owner, viewerOctokit)
  const { data } = await octokit.rest.issues.createComment({ owner, repo: slug, issue_number: number, body: text })
  return toIssueComment(data)
}
