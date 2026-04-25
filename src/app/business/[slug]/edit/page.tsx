// The dedicated edit form was retired in favor of inline editing on the
// detail page. This route now redirects so any old links keep working.
import { redirect } from 'next/navigation'

export default function EditRedirectPage({ params }: { params: { slug: string } }) {
  redirect(`/business/${params.slug}`)
}
