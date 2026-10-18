import { NextRequest, NextResponse } from 'next/server'
import { writeRawPlanYaml } from '@/lib/db'
import { authorizeVentureWrite } from '@/lib/ventureWriteAuth'

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
  const body = await req.json().catch(() => ({}))
  const rawYaml: string | undefined = body?.rawYaml
  const editSummary: string = body?.editSummary || 'Edit plan.yaml via VentureWiki'

  if (typeof rawYaml !== 'string') {
    return NextResponse.json({ error: 'rawYaml (string) is required' }, { status: 400 })
  }
  if (rawYaml.length > 1_000_000) {
    return NextResponse.json({ error: 'plan.yaml too large' }, { status: 413 })
  }

  const auth = await authorizeVentureWrite(req, params.slug)
  if (auth instanceof NextResponse) return auth
  const { viewerOctokit } = auth

  try {
    await writeRawPlanYaml(params.slug, rawYaml, editSummary, viewerOctokit)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to write plan.yaml' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
