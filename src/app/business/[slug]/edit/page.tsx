// The dedicated edit form was retired in favor of inline editing on the
// detail page. This route now redirects to the canonical /{owner}/{slug} URL.
import { redirect } from 'next/navigation'
import { resolveBusinessOwner } from '@/lib/db/owner'

export default async function EditRedirectPage({ params }: { params: { slug: string } }) {
  const owner = await resolveBusinessOwner(params.slug)
  redirect(`/${owner ?? 'venturewiki'}/${params.slug}`)
}
