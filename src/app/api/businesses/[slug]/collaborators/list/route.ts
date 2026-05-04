import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveBusinessOwner } from '@/lib/db'
import { getAdminOctokit, getUserOctokit, GITHUB_ORG } from '@/lib/github'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const owner = await resolveBusinessOwner(params.slug)
  if (!owner) {
    return NextResponse.json({ error: 'Venture not found' }, { status: 404 })
  }

  const octokit =
    owner === GITHUB_ORG
      ? getAdminOctokit()
      : session.accessToken
        ? getUserOctokit(session.accessToken as string)
        : null

  if (!octokit) {
    return NextResponse.json(
      { error: 'Re-sign-in required to view collaborators for this venture' },
      { status: 401 },
    )
  }

  try {
    const [collaboratorsRes, invitationsRes, teamsRes] = await Promise.allSettled([
      octokit.rest.repos.listCollaborators({ owner, repo: params.slug }),
      octokit.rest.repos.listInvitations({ owner, repo: params.slug }),
      owner === GITHUB_ORG ? octokit.rest.repos.listTeams({ owner, repo: params.slug }) : Promise.resolve({ data: [] })
    ])

    const collaborators = collaboratorsRes.status === 'fulfilled' ? collaboratorsRes.value.data : []
    const invitations = invitationsRes.status === 'fulfilled' ? invitationsRes.value.data : []
    const teams = teamsRes.status === 'fulfilled' ? teamsRes.value.data : []

    return NextResponse.json({
      collaborators,
      invitations,
      teams,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Failed to fetch collaborators' },
      { status: 500 },
    )
  }
}
