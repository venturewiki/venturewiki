import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Octokit } from 'octokit'
import { authOptions } from '@/lib/auth'
import { resolveBusinessOwner } from '@/lib/db'
import { GITHUB_ORG, getUserOctokit } from '@/lib/github'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export const ANON_EDIT_MAX = 10
export const ANON_EDIT_WINDOW_MS = 60 * 60 * 1000

export interface VentureWriteAuth {
  /** Session user id, or 'anonymous' for signed-out edits on org repos. */
  userId: string
  /** User-scoped client when signed in; undefined falls back to the admin token. */
  viewerOctokit?: Octokit
}

/**
 * Shared write-authorization for venture mutation routes.
 *
 * Signed-in users always pass (optionally restricted to admin/editor roles).
 * Anonymous requests are allowed only on venturewiki-org repos, where the
 * admin token has write rights, and are rate-limited per IP.
 *
 * Returns a NextResponse (401/403/429) when the request must be rejected.
 */
export async function authorizeVentureWrite(
  req: NextRequest,
  slug: string,
  opts: { requireRole?: boolean } = {},
): Promise<VentureWriteAuth | NextResponse> {
  const session = await getServerSession(authOptions)

  if (session?.user?.id) {
    if (opts.requireRole && session.user.role !== 'admin' && session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return {
      userId: session.user.id,
      viewerOctokit: session.accessToken ? getUserOctokit(session.accessToken) : undefined,
    }
  }

  const owner = await resolveBusinessOwner(slug)
  if (owner !== GITHUB_ORG) {
    return NextResponse.json(
      { error: 'Sign in to edit ventures outside the venturewiki org' },
      { status: 401 },
    )
  }
  const ip = getClientIp(req.headers)
  const rl = checkRateLimit(`anon-edit:${ip}`, ANON_EDIT_MAX, ANON_EDIT_WINDOW_MS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many anonymous edits. Try again in ${rl.retryAfter}s, or sign in.` },
      { status: 429 },
    )
  }
  return { userId: 'anonymous' }
}
