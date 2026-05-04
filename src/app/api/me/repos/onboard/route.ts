import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserOctokit, getRepoContent, putRepoContent } from '@/lib/github'
import { scaffoldVentureFiles } from '@/lib/db/default-plan'

export const dynamic = 'force-dynamic'

function encode(s: string) {
  return Buffer.from(s, 'utf-8').toString('base64')
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { owner, name } = await req.json().catch(() => ({}))
  if (typeof owner !== 'string' || typeof name !== 'string' || !owner || !name) {
    return NextResponse.json({ error: 'owner and name required' }, { status: 400 })
  }

  const octokit = getUserOctokit(session.accessToken)

  // Refuse if .venturewiki/plan.yaml already exists
  try {
    await getRepoContent(octokit, { owner, repo: name, path: '.venturewiki/plan.yaml' })
    return NextResponse.json({ error: 'Repo already has .venturewiki/plan.yaml' }, { status: 409 })
  } catch {
    /* expected */
  }

  // Pull repo to use description as the default tagline
  let description = ''
  try {
    const { data } = await octokit.rest.repos.get({ owner, repo: name })
    description = data.description || ''
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Repo not found or not accessible' }, { status: 404 })
  }

  const templateFiles = await scaffoldVentureFiles({ owner, name, description, userId: session.user.id })
  if (templateFiles.length === 0) {
    return NextResponse.json({ error: 'Could not fetch venture template. Please try again.' }, { status: 502 })
  }

  try {
    // Write every file from the template's .venturewiki/ folder into the repo
    for (const file of templateFiles) {
      await putRepoContent(octokit, {
        owner,
        repo: name,
        path: `.venturewiki/${file.path}`,
        message: 'Onboard to VentureWiki',
        content: encode(file.content),
      })
    }

    // Best-effort: add `venturewiki` topic
    try {
      const { data: existing } = await octokit.rest.repos.getAllTopics({ owner, repo: name })
      const topics = Array.from(new Set([...(existing.names || []), 'venturewiki']))
      await octokit.rest.repos.replaceAllTopics({ owner, repo: name, names: topics })
    } catch { /* topics are optional */ }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to write venture files' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    editUrl: `https://github.com/${owner}/${name}/edit/main/.venturewiki/plan.yaml`,
    repoUrl: `https://github.com/${owner}/${name}`,
  })
}
