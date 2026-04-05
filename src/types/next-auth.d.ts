import 'next-auth'
import 'next-auth/jwt'
import type { SubscriptionTier, SubscriptionStatus } from '.'

declare module 'next-auth' {
  interface Session {
    accessToken?: string   // GitHub OAuth token for API calls
    user: {
      id:    string
      login: string        // GitHub username
      name:  string
      email: string
      image: string
      role:  'viewer' | 'editor' | 'admin'
      subscriptionTier: SubscriptionTier
      subscriptionStatus: SubscriptionStatus
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    login?: string
  }
}
