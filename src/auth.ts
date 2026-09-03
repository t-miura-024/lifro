import { DrizzleAdapter } from '@/server/infrastructure/database/drizzle/auth-adapter'
import { db } from '@/server/infrastructure/database/drizzle/client'
import { users } from '@/server/infrastructure/database/drizzle/schema'
import { eq } from 'drizzle-orm'
import NextAuth, { getServerSession } from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import type { Adapter } from 'next-auth/adapters'
import GoogleProvider, { type GoogleProfile } from 'next-auth/providers/google'

const baseAdapter = DrizzleAdapter()
const adapter: Adapter = {
  ...baseAdapter,
  // 既存ユーザー以外の自動作成を禁止
  async createUser() {
    throw new Error('USER_NOT_ALLOWED')
  },
}

export const authOptions: NextAuthOptions = {
  adapter,
  session: { strategy: 'database' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      const email = user?.email ?? undefined
      if (!email) return false

      // Google 以外は禁止
      if (account?.provider !== 'google') return false

      // 既存ユーザーのみ許可
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1)
      return existing.length > 0
    },
    async session({ session, user }) {
      if (session.user && user?.id) {
        session.user = { ...session.user, id: String(user.id) } as typeof session.user
      }
      return session
    },
  },
}

export function getServerAuthSession() {
  return getServerSession(authOptions)
}
