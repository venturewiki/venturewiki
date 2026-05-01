import { Octokit } from 'octokit'

// ── GitHub Organization that holds all VentureWiki project repos ─────────────
export const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || 'venturewiki'

// ── Server-side Octokit (uses a GitHub App or PAT with org-level access) ─────
let _adminOctokit: Octokit | null = null

export function getAdminOctokit(): Octokit {
  if (_adminOctokit) return _adminOctokit
  _adminOctokit = new Octokit({ auth: process.env.GITHUB_ADMIN_TOKEN })
  return _adminOctokit
}

// ── Client-side Octokit (uses the user's GitHub OAuth token) ─────────────────
export function getUserOctokit(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken })
}

// ── Public Octokit (unauthenticated, for reading public repos) ───────────────
let _publicOctokit: Octokit | null = null

export function getPublicOctokit(): Octokit {
  if (_publicOctokit) return _publicOctokit
  // Use admin token for higher rate limits, fall back to unauthenticated
  const token = process.env.GITHUB_ADMIN_TOKEN || process.env.NEXT_PUBLIC_GITHUB_TOKEN
  _publicOctokit = token ? new Octokit({ auth: token }) : new Octokit()
  return _publicOctokit
}

// ── Repo Contents API helpers ────────────────────────────────────────────────
// Octokit's high-level repos.getContent / createOrUpdateFileContents /
// deleteFile pass `path` through `{path}` URL templating, which percent-encodes
// the slashes inside the path (e.g. `.venturewiki/plan.yaml` →
// `.venturewiki%2Fplan.yaml`). GitHub deprecated that URL form on
// 2028-03-10. Using `{+path}` instead keeps slashes literal, which is the
// non-deprecated form going forward.

export async function getRepoContent(
  octokit: Octokit,
  params: { owner: string; repo: string; path: string; ref?: string },
) {
  return octokit.request('GET /repos/{owner}/{repo}/contents/{+path}', params)
}

export async function putRepoContent(
  octokit: Octokit,
  params: {
    owner: string
    repo: string
    path: string
    message: string
    content: string
    sha?: string
    branch?: string
    committer?: { name: string; email: string }
  },
) {
  return octokit.request('PUT /repos/{owner}/{repo}/contents/{+path}', params)
}

export async function deleteRepoContent(
  octokit: Octokit,
  params: {
    owner: string
    repo: string
    path: string
    message: string
    sha: string
    branch?: string
  },
) {
  return octokit.request('DELETE /repos/{owner}/{repo}/contents/{+path}', params)
}
