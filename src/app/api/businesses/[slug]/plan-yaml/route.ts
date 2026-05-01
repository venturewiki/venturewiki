import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeRawPlanYaml, resolveBusinessOwner } from '@/lib/db'
import { GITHUB_ORG, getUserOctokit } from '@/lib/github'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// PUT /api/businesses/[slug]/plan-yaml
// Body: { rawYaml: string, editSummary?: string }
//
// Writes the raw plan.yaml content to the venture's repo, no parse/validation.
// Used by the in-app raw-YAML editor (when the file is broken) and by the
// per-section YAML editor that round-trips a subtree.
export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions)
  const body = await req.json().catch(() => ({}))
  const rawYaml: string | undefined = body?.rawYaml
  const editSummary: string = body?.editSummary || 'Edit plan.yaml via VentureWiki'

  if (typeof rawYaml !== 'string') {
    return NextResponse.json({ error: 'rawYaml (string) is required' }, { status: 400 })
  }
  if (rawYaml.length > 1_000_000) {
    return NextResponse.json({ error: 'plan.yaml too large' }, { status: 413 })
  }

  let viewerOctokit
  if (session?.user?.id) {
    if (session.accessToken) viewerOctokit = getUserOctokit(session.accessToken)
  } else {
    const owner = await resolveBusinessOwner(params.slug)
    if (owner !== GITHUB_ORG) {
      return NextResponse.json(
        { error: 'Sign in to edit ventures outside the venturewiki org' },
        { status: 401 },
      )
    }
    const ip = getClientIp(req.headers)
    const rl = checkRateLimit(`anon-edit:${ip}`, 10, 60 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many anonymous edits. Try again in ${rl.retryAfter}s, or sign in.` },
        { status: 429 },
      )
    }
  }

  try {
    await writeRawPlanYaml(params.slug, rawYaml, editSummary, viewerOctokit)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to write plan.yaml' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
