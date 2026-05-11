import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveBusinessOwner } from '@/lib/db'
import { getAdminOctokit, getUserOctokit, GITHUB_ORG } from '@/lib/github'

export const dynamic = 'force-dynamic'

// GET /api/businesses/[slug]/collaborators
//
// Returns the org's current base-permission setting and whether it is secure
// (i.e. "none"). If it is not "none" the handler automatically attempts to
// tighten it using the platform admin token — this guarantees that any org
// members never inadvertently inherit access to every repo in the org, so the
// only access to a venture's repo is the explicit outside-collaborator grants
// made through this UI.
//
// Response shape:
//   { applicable: false }                        – venture not in the VW org
//   { applicable: true, isSecure, basePermission, wasFixed, fixFailed }
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const owner = await resolveBusinessOwner(params.slug)
  if (!owner || owner !== GITHUB_ORG) {
    return NextResponse.json({ applicable: false })
  }

  let basePermission = 'unknown'
  let wasFixed = false
  let fixFailed = false

  try {
    const { data: org } = await getAdminOctokit().rest.orgs.get({ org: GITHUB_ORG })
    basePermission = org.default_repository_permission || 'read'

    if (basePermission !== 'none') {
      // Auto-tighten: set org base permissions to "none" so that org members
      // can only access repos they were explicitly added to. Outside
      // collaborators (how this UI invites people) are unaffected by this
      // setting, but tightening it closes the broader "every member sees every
      // private repo" leak.
      try {
        await getAdminOctokit().rest.orgs.update({
          org: GITHUB_ORG,
          default_repository_permission: 'none',
        })
        wasFixed = true
        basePermission = 'none'
      } catch {
        fixFailed = true
      }
    }
  } catch {
    basePermission = 'unknown'
  }

  const isSecure = basePermission === 'none'
  return NextResponse.json({ applicable: true, isSecure, basePermission, wasFixed, fixFailed })
}

// POST /api/businesses/[slug]/collaborators
//
// Body: { username: string, permission?: 'push' | 'maintain' | 'admin' }
//
// Sends a GitHub repository collaboration invite to an existing GitHub user.
// Because this only ever calls `repos.addCollaborator`, an invitee who is not
// already an org member is added as an *outside collaborator* scoped to this
// one repository — never as an organization member. This deliberately does not
// support email-based org invitations, which would make the invitee a member
// of the whole org.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const username: string = (body.username || '').trim()

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const owner = await resolveBusinessOwner(params.slug)
  if (!owner) {
    return NextResponse.json({ error: 'Venture not found' }, { status: 404 })
  }

  const permission = ['push', 'maintain', 'admin'].includes(body.permission)
    ? (body.permission as 'push' | 'maintain' | 'admin')
    : 'push'

  // For venturewiki-org repos use the platform admin token; for repos owned by
  // the user's own account/org require their OAuth token so GitHub enforces
  // that they actually have admin rights on that repo.
  const octokit =
    owner === GITHUB_ORG
      ? getAdminOctokit()
      : session.accessToken
        ? getUserOctokit(session.accessToken as string)
        : null

  if (!octokit) {
    return NextResponse.json(
      { error: 'Re-sign-in required to manage collaborators for this venture' },
      { status: 401 },
    )
  }

  try {
    await octokit.rest.repos.addCollaborator({
      owner,
      repo: params.slug,
      username,
      permission,
    })
  } catch (e: any) {
    const status = e?.status === 404 ? 404 : 500
    return NextResponse.json(
      { error: e?.message || 'Failed to invite collaborator' },
      { status },
    )
  }

  return NextResponse.json({ ok: true, username })
}
