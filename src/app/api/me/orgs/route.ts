import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserOctokit } from '@/lib/github'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const octokit = getUserOctokit(session.accessToken)
    const { data } = await octokit.rest.orgs.listForAuthenticatedUser({ per_page: 100 })
    return NextResponse.json(data.map(o => ({
      login: o.login,
      id: o.id,
      avatarUrl: o.avatar_url,
      description: o.description || '',
    })))
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list orgs' }, { status: 500 })
  }
}
