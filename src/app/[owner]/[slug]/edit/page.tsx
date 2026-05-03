// Inline editing lives on the detail page. Redirect any direct /edit links.
import { redirect } from 'next/navigation'

export default function EditRedirectPage({ params }: { params: { owner: string; slug: string } }) {
  redirect(`/${params.owner}/${params.slug}`)
}
