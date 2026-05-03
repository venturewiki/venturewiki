import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveBusinessOwner } from '@/lib/db'
import { getAdminOctokit, getUserOctokit, GITHUB_ORG } from '@/lib/github'

export const dynamic = 'force-dynamic'

// POST /api/businesses/[slug]/collaborators
// Body: { username: string, permission?: 'push' | 'maintain' | 'admin' }
// Sends a GitHub repository collaboration invite to the given GitHub user.
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

  const permission = ['push', 'maintain', 'admin'].includes(body.permission)
    ? (body.permission as 'push' | 'maintain' | 'admin')
    : 'push'

  const owner = await resolveBusinessOwner(params.slug)
  if (!owner) {
    return NextResponse.json({ error: 'Venture not found' }, { status: 404 })
  }

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
