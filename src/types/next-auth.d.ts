import 'next-auth'
import 'next-auth/jwt'

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
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    login?: string
  }
}
