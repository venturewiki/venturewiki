import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveBusinessOwner, getBusinessBySlug } from '@/lib/db'
import { getAdminOctokit, getUserOctokit, GITHUB_ORG } from '@/lib/github'

export const dynamic = 'force-dynamic'

// POST /api/businesses/[slug]/collaborators
//
// Two modes depending on request body:
//   { username: string, permission?: string }
//     → sends a GitHub repo collaboration invite to an existing GitHub user
//   { email: string }
//     → sends a GitHub org invitation by email (works for non-GitHub users too);
//       only available for ventures hosted in the venturewiki org
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
  const email: string    = (body.email    || '').trim()

  if (!username && !email) {
    return NextResponse.json({ error: 'username or email is required' }, { status: 400 })
  }

  const owner = await resolveBusinessOwner(params.slug)
  if (!owner) {
    return NextResponse.json({ error: 'Venture not found' }, { status: 404 })
  }

  // ── Email invite: GitHub org invitation (works for people without GitHub) ──
  if (email) {
    if (owner !== GITHUB_ORG) {
      return NextResponse.json(
        {
          error:
            'Email invitations are only available for ventures hosted in the VentureWiki ' +
            'organization. Ask them to create a GitHub account at github.com/join, then ' +
            'search their username here to invite them directly.',
        },
        { status: 400 },
      )
    }
    // Scope the invitation to this venture's GitHub team so the person only
    // gets access to this one repo (requires org base permissions = "None").
    const venture = await getBusinessBySlug(params.slug)
    const teamId = venture?._githubTeamId

    try {
      await getAdminOctokit().rest.orgs.createInvitation({
        org: GITHUB_ORG,
        email,
        role: 'direct_member',
        ...(teamId ? { team_ids: [teamId] } : {}),
      })
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message || 'Failed to send email invitation' },
        { status: 500 },
      )
    }
    return NextResponse.json({ ok: true, email, teamScoped: !!teamId })
  }

  // ── Username invite: direct GitHub repo collaborator ───────────────────────
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
