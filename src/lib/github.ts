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
