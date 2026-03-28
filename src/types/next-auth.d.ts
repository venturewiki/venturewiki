import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    firebaseToken?: string
    user: {
      id:    string
      name:  string
      email: string
      image: string
      role:  'viewer' | 'editor' | 'admin'
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    firebaseToken?: string
  }
}
