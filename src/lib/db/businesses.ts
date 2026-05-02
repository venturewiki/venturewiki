import type { Octokit } from 'octokit'
import { getAdminOctokit, getPublicOctokit, putRepoContent } from '@/lib/github'
import { getCached, setCache, invalidateCache } from '@/lib/cache'
import type { BusinessPlan, EditRecord } from '@/types'
import { resolveBusinessOwner, pickWriteOctokit } from './owner'
import { dumpYaml, encodeContent, readRepoYaml, writeRepoFile, writeRepoYaml } from './yaml'
import { planToTopics } from './readme'
import { defaultPlanYaml } from './default-plan'

const PLAN_PATH = '.venturewiki/plan.yaml'

export type CreateBusinessTarget =
  | { type: 'user'; login: string }
  | { type: 'org'; login: string }

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Reads plan.yaml and tolerates a malformed file by returning a placeholder
// stub so the venture stays visible in listings — owners can spot and fix it
// from the directory or detail page.
async function readPlan(
  slug: string,
  viewerOctokit?: Octokit,
): Promise<{ data: any; sha: string; owner: string; raw: string } | null> {
  const cacheKey = `plan:${slug}`
  const cached = getCached<{ data: any; sha: string; owner: string; raw: string }>(cacheKey)
  if (cached) return cached

  const result = await readRepoYaml<any>(slug, PLAN_PATH, viewerOctokit)
  if (!result) return null

  const data = result.parseError
    ? {
        cover: {
          companyName: slug,
          tagline: `⚠ plan.yaml has a YAML error: ${result.parseError}`.slice(0, 200),
          stage: 'idea',
          productType: 'other',
        },
        _planError: result.parseError,
      }
    : result.data

  const out = { data, sha: result.sha, owner: result.owner, raw: result.raw }
  setCache(cacheKey, out)
  return out
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

export async function createBusiness(
  data: Omit<BusinessPlan, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'viewCount' | 'editCount'>,
  userId: string,
  target: CreateBusinessTarget,
  viewerOctokit: Octokit,
): Promise<{ slug: string; owner: string }> {
  const slug = slugify(data.cover.companyName) + '-' + Date.now().toString(36)
  const owner = target.login
  const isPublic = data.isPublic !== false
  const description = `${data.cover.logoEmoji || '🚀'} ${data.cover.companyName} — ${data.cover.tagline}`

  if (target.type === 'org') {
    await viewerOctokit.rest.repos.createInOrg({
      org: target.login,
      name: slug,
      description,
      visibility: isPublic ? 'public' : 'private',
      has_issues: true,
      auto_init: false,
    })
  } else {
    await viewerOctokit.rest.repos.createForAuthenticatedUser({
      name: slug,
      description,
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

  await putRepoContent(viewerOctokit, {
    owner, repo: slug, path: PLAN_PATH,
    message: `✨ Create business plan: ${data.cover.companyName}`,
    content: encodeContent(dumpYaml(plan)),
  })

  try {
    await viewerOctokit.rest.repos.replaceAllTopics({
      owner, repo: slug,
      names: planToTopics(plan as BusinessPlan),
    })
  } catch {}

  invalidateCache(`plan:${slug}`)
  return { slug, owner }
}

export async function getBusinessBySlug(
  slug: string,
  viewerOctokit?: Octokit,
): Promise<BusinessPlan | null> {
  try {
    const owner = await resolveBusinessOwner(slug, viewerOctokit)
    if (!owner) return null

    let repo: any = null
    try {
      const { data } = await getPublicOctokit().rest.repos.get({ owner, repo: slug })
      repo = data
    } catch {
      if (viewerOctokit) {
        try {
          const { data } = await viewerOctokit.rest.repos.get({ owner, repo: slug })
          repo = data
        } catch { /* not visible */ }
      }
    }
    if (!repo) return null

    let plan = await readPlan(slug, viewerOctokit)

    // Self-heal: if the repo has the `venturewiki` topic but no plan.yaml,
    // scaffold a default plan.yaml so the venture page renders immediately.
    if (!plan) {
      const topics: string[] = repo.topics || []
      if (!topics.includes('venturewiki')) return null

      // The repo is tagged as a VW venture — create the missing plan.yaml.
      const writeOctokit = pickWriteOctokit(owner, viewerOctokit)
      const planYaml = defaultPlanYaml({
        owner,
        name: slug,
        description: repo.description || '',
        userId: 'system',
      })
      try {
        await putRepoContent(writeOctokit, {
          owner,
          repo: slug,
          path: PLAN_PATH,
          message: '📋 Auto-scaffold plan.yaml (venturewiki topic detected)',
          content: encodeContent(planYaml),
        })
        invalidateCache(`plan:${slug}`)
        plan = await readPlan(slug, viewerOctokit)
      } catch {
        // Can't write — e.g. no push access. Return null gracefully.
        return null
      }
      if (!plan) return null
    }

    const business = repoToPlan(repo, plan.data) as BusinessPlan & { _planRaw?: string }
    // Detail page renders an inline raw-YAML editor — needs the verbatim file.
    business._planRaw = plan.raw
    return business
  } catch {
    return null
  }
}

export async function updateBusiness(
  id: string,
  data: Partial<BusinessPlan>,
  userId: string,
  editSummary: string,
  viewerOctokit?: Octokit,
): Promise<void> {
  const existing = await readPlan(id, viewerOctokit)
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

  await writeRepoYaml(id, PLAN_PATH, `📝 ${editSummary}`, updated, existing.sha, viewerOctokit)
  invalidateCache(`plan:${id}`)

  try {
    await pickWriteOctokit(existing.owner, viewerOctokit).rest.repos.replaceAllTopics({
      owner: existing.owner, repo: id, names: planToTopics(updated as BusinessPlan),
    })
  } catch {}
}

export async function writeRawPlanYaml(
  slug: string, rawYaml: string, message: string, viewerOctokit?: Octokit,
): Promise<void> {
  await writeRepoFile(slug, PLAN_PATH, message, rawYaml, viewerOctokit)
  invalidateCache(`plan:${slug}`)
}

export async function getBusinesses(opts: {
  pageSize?: number
  stage?: string
  type?: string
  search?: string
  featuredOnly?: boolean
  viewerOctokit?: Octokit
} = {}): Promise<{ businesses: BusinessPlan[]; lastDoc: null }> {
  // Phase 2: ventures live under any owner. Scope by topic, not org.
  let q = `topic:venturewiki`
  if (opts.stage) q += ` topic:stage-${opts.stage}`
  if (opts.type) q += ` topic:type-${opts.type}`
  if (opts.featuredOnly) q += ` topic:venturewiki-featured`
  if (opts.search) q += ` ${opts.search} in:name,description`
  q += ' archived:false'

  const search = (octokit: Octokit) => octokit.rest.search.repos({
    q,
    sort: 'updated',
    order: 'desc',
    per_page: opts.pageSize ?? 20,
  }).then(r => r.data.items).catch(() => [])

  // Run against public + viewer tokens so private repos accessible to the
  // viewer surface alongside public ones. Dedupe by full repo path.
  const lists = await Promise.all([
    search(getPublicOctokit()),
    ...(opts.viewerOctokit ? [search(opts.viewerOctokit)] : []),
  ])
  const seen = new Set<string>()
  const merged: any[] = []
  for (const list of lists) {
    for (const repo of list) {
      const key = `${repo.owner?.login}/${repo.name}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(repo)
    }
  }

  const businesses = await Promise.all(
    merged.map(async (repo) => {
      // Prime owner cache so readPlan doesn't re-search GitHub.
      setCache(`owner:${repo.name}`, repo.owner!.login)
      const plan = await readPlan(repo.name, opts.viewerOctokit)
      if (!plan) return null
      return repoToPlan(repo, plan.data)
    })
  )

  return {
    businesses: businesses.filter((b): b is BusinessPlan => b !== null),
    lastDoc: null,
  }
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
  await getAdminOctokit().rest.repos.update({ owner, repo: id, archived: true })
}

// Edit history is the git commit log on plan.yaml — wiki-style revisions for free.
export async function getEditHistory(businessId: string): Promise<EditRecord[]> {
  try {
    const owner = await resolveBusinessOwner(businessId)
    if (!owner) return []
    const { data: commits } = await getPublicOctokit().rest.repos.listCommits({
      owner, repo: businessId, path: PLAN_PATH, per_page: 50,
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
