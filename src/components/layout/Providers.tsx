'use client'
import { SessionProvider } from 'next-auth/react'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'

function FirebaseAuthSync() {
  useFirebaseAuth()
  return null
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FirebaseAuthSync />
      {children}
    </SessionProvider>
  )
}
