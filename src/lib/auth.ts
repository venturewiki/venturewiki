import NextAuth, { NextAuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import { upsertUser, getUser } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId:     process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: { params: { scope: 'read:user user:email public_repo' } },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account) return false
      try {
        const ghProfile = profile as any
        await upsertUser({
          id:    ghProfile?.id?.toString() ?? user.id,
          login: ghProfile?.login ?? user.name ?? '',
          email: user.email || '',
          name:  user.name || ghProfile?.login || '',
          image: user.image || '',
        })
        return true
      } catch (err) {
        console.error('signIn error', err)
        return false
      }
    },

    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token
        const ghProfile = profile as any
        token.login = ghProfile?.login ?? ''
        token.sub = ghProfile?.id?.toString() ?? token.sub
      }
      return token
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.login = (token.login as string) || ''
        session.accessToken = token.accessToken as string

        try {
          const dbUser = await getUser(token.sub)
          if (dbUser) {
            session.user.role = dbUser.role
          }
        } catch {}
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: { strategy: 'jwt' },
}

export default NextAuth(authOptions)
