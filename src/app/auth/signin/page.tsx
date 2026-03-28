import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import SignInClient from './SignInClient'

export default async function SignInPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/')
  return <SignInClient />
}
