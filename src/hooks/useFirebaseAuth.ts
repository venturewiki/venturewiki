'use client'
import { useEffect } from 'react'
import { signInWithCustomToken, signOut } from 'firebase/auth'
import { useSession } from 'next-auth/react'
import { auth } from '@/lib/firebase'

export function useFirebaseAuth() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return

    if (session?.firebaseToken) {
      signInWithCustomToken(auth, session.firebaseToken).catch(err => {
        console.error('Firebase signInWithCustomToken failed', err)
      })
    } else if (status === 'unauthenticated') {
      auth.currentUser && signOut(auth).catch(() => {})
    }
  }, [session?.firebaseToken, status])
}
