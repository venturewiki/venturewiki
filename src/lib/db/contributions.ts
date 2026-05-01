import type { Octokit } from 'octokit'
import type { RoleCandidate, Validation, InvestmentInterest, VentureValue } from '@/types'
import { readRepoYamlOr, writeRepoYaml, readRepoYaml } from './yaml'
import { getComments } from './comments'

// Single-file YAML store under .venturewiki/<file>.yaml. Same pattern across
// candidates, validations, and investments — encoded once here.

interface FileSpec {
  path: string
  message: string
}
const CANDIDATES: FileSpec  = { path: '.venturewiki/candidates.yaml',  message: '👤 Update role candidates' }
const VALIDATIONS: FileSpec = { path: '.venturewiki/validations.yaml', message: '✅ Update validations' }
const INVESTMENTS: FileSpec = { path: '.venturewiki/investments.yaml', message: '💰 Update investment interest' }

async function read<T>(slug: string, spec: FileSpec): Promise<{ data: T[]; sha: string }> {
  return readRepoYamlOr<T[]>(slug, spec.path, [])
}
async function write<T>(slug: string, spec: FileSpec, items: T[], sha: string, viewerOctokit?: Octokit): Promise<void> {
  await writeRepoYaml(slug, spec.path, spec.message, items, sha, viewerOctokit)
}

// ── Role Candidates ─────────────────────────────────────────────────────────

export async function getCandidates(slug: string): Promise<RoleCandidate[]> {
  return (await read<RoleCandidate>(slug, CANDIDATES)).data
}

export async function applyForRole(
  slug: string,
  candidate: Omit<RoleCandidate, 'id' | 'appliedAt' | 'status' | 'endorsements'>,
  viewerOctokit?: Octokit,
): Promise<RoleCandidate> {
  const { data, sha } = await read<RoleCandidate>(slug, CANDIDATES)
  const entry: RoleCandidate = {
    ...candidate,
    id: `${candidate.userId}-${Date.now().toString(36)}`,
    appliedAt: new Date().toISOString(),
    status: 'pending',
    endorsements: [],
  }
  data.push(entry)
  await write(slug, CANDIDATES, data, sha, viewerOctokit)
  return entry
}

export async function endorseCandidate(slug: string, candidateId: string, endorserId: string, viewerOctokit?: Octokit): Promise<void> {
  const { data, sha } = await read<RoleCandidate>(slug, CANDIDATES)
  const c = data.find(x => x.id === candidateId)
  if (!c || c.endorsements.includes(endorserId)) return
  c.endorsements.push(endorserId)
  await write(slug, CANDIDATES, data, sha, viewerOctokit)
}

export async function updateCandidateStatus(slug: string, candidateId: string, status: RoleCandidate['status'], viewerOctokit?: Octokit): Promise<void> {
  const { data, sha } = await read<RoleCandidate>(slug, CANDIDATES)
  const c = data.find(x => x.id === candidateId)
  if (!c) return
  c.status = status
  await write(slug, CANDIDATES, data, sha, viewerOctokit)
}

// ── Validations ─────────────────────────────────────────────────────────────

export async function getValidations(slug: string): Promise<Validation[]> {
  return (await read<Validation>(slug, VALIDATIONS)).data
}

export async function addValidation(
  slug: string,
  validation: Omit<Validation, 'id' | 'createdAt'>,
  viewerOctokit?: Octokit,
): Promise<Validation> {
  const { data, sha } = await read<Validation>(slug, VALIDATIONS)
  const entry: Validation = {
    ...validation,
    id: `${validation.userId}-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  }
  data.push(entry)
  await write(slug, VALIDATIONS, data, sha, viewerOctokit)
  return entry
}

// ── Investment Interest ─────────────────────────────────────────────────────

export async function getInvestments(slug: string): Promise<InvestmentInterest[]> {
  return (await read<InvestmentInterest>(slug, INVESTMENTS)).data
}

export async function expressInvestmentInterest(
  slug: string,
  investment: Omit<InvestmentInterest, 'id' | 'createdAt' | 'status'>,
  viewerOctokit?: Octokit,
): Promise<InvestmentInterest> {
  const { data, sha } = await read<InvestmentInterest>(slug, INVESTMENTS)
  const entry: InvestmentInterest = {
    ...investment,
    id: `${investment.investorId}-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    status: 'expressed',
  }
  data.push(entry)
  await write(slug, INVESTMENTS, data, sha, viewerOctokit)
  return entry
}

export async function updateInvestmentStatus(slug: string, investmentId: string, status: InvestmentInterest['status'], viewerOctokit?: Octokit): Promise<void> {
  const { data, sha } = await read<InvestmentInterest>(slug, INVESTMENTS)
  const inv = data.find(x => x.id === investmentId)
  if (!inv) return
  inv.status = status
  await write(slug, INVESTMENTS, data, sha, viewerOctokit)
}

// ── Venture Value / Worthiness ──────────────────────────────────────────────

export async function getVentureValue(slug: string): Promise<VentureValue> {
  const [candidates, validations, investments, comments, plan] = await Promise.all([
    getCandidates(slug),
    getValidations(slug),
    getInvestments(slug),
    getComments(slug),
    readRepoYaml<any>(slug, '.venturewiki/plan.yaml'),
  ])

  const validatedCount = validations.filter(v => v.status === 'validated').length
  const disputedCount = validations.filter(v => v.status === 'disputed').length
  const validationScore = validatedCount - disputedCount
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
