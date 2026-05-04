// Legacy route — redirect to the canonical /{owner}/{slug} URL (GitHub-style).
// resolveBusinessOwner does a fast cached lookup (org fast-path first).
import { redirect } from 'next/navigation'
import { resolveBusinessOwner } from '@/lib/db/owner'

export default async function LegacyVenturePage({
  params,
}: {
  params: { slug: string; path?: string[] }
}) {
  const owner = await resolveBusinessOwner(params.slug)
  const pathSuffix = params.path?.length ? `/${params.path.join('/')}` : ''
  redirect(`/${owner ?? 'venturewiki'}/${params.slug}${pathSuffix}`)
}
