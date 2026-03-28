import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false
      try {
        const userRef  = getAdminDb().collection('users').doc(user.id || user.email)
        const userSnap = await userRef.get()

        if (!userSnap.exists) {
          // First sign-in — create user doc
          const isFirstUser = (await getAdminDb().collection('users').limit(1).get()).empty
          await userRef.set({
            id:                user.id || user.email,
            email:             user.email,
            name:              user.name || '',
            image:             user.image || '',
            role:              isFirstUser ? 'admin' : 'editor',
            createdAt:         new Date().toISOString(),
            lastActiveAt:      new Date().toISOString(),
            businessesCreated: 0,
            editsCount:        0,
          })
        } else {
          await userRef.update({ lastActiveAt: new Date().toISOString() })
        }
        return true
      } catch (err) {
        console.error('signIn error', err)
        return false
      }
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        try {
          const userSnap = await getAdminDb().collection('users').doc(token.sub).get()
          if (userSnap.exists) {
            const data = userSnap.data()!
            session.user.id   = token.sub
            session.user.role = data.role
          }
        } catch {}
      }
      return session
    },

    async jwt({ token, user }) {
      if (user) token.sub = user.id
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: { strategy: 'jwt' },
}

export default NextAuth(authOptions)
