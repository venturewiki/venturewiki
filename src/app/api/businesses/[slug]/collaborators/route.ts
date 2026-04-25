import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveBusinessOwner } from '@/lib/db'
import { getAdminOctokit, getUserOctokit, GITHUB_ORG } from '@/lib/github'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { username, permission } = await req.json().catch(() => ({}))
  if (typeof username !== 'string' || !username.trim()) {
    return NextResponse.json({ error: 'username required' }, { status: 400 })
  }

  const owner = await resolveBusinessOwner(params.slug)
  if (!owner) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  // Pick the right token: platform admin for venturewiki org, viewer otherwise.
  const octokit = owner === GITHUB_ORG
    ? getAdminOctokit()
    : (session.accessToken ? getUserOctokit(session.accessToken) : null)
  if (!octokit) {
    return NextResponse.json({ error: 'Sign-in required to invite contributors here' }, { status: 401 })
  }

  try {
    await octokit.rest.repos.addCollaborator({
      owner,
      repo: params.slug,
      username: username.trim(),
      permission: (permission === 'admin' || permission === 'maintain' || permission === 'triage' || permission === 'pull') ? permission : 'push',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to invite collaborator' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, username: username.trim() })
}
