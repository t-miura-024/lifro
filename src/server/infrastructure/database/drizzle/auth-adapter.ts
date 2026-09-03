import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import type { Adapter, AdapterAccount, AdapterSession, AdapterUser } from 'next-auth/adapters'
import { db } from './client'
import { accounts, sessions, users } from './schema'

function toAdapterUser(row: typeof users.$inferSelect): AdapterUser {
  return {
    id: String(row.id),
    email: row.email,
    emailVerified: null,
  }
}

/**
 * Adapter経由のユーザーID文字列を整数に変換する。
 * updateUserの Number.isInteger 検証と統一し、全メソッドで同じ基準を使う。
 * 不正値時は null を返す。呼び出し側で get系は null 返却、更新系は throw に正規化する。
 */
function parseUserId(id: string): number | null {
  // 10進整数の数字列のみ受付。空文字・空白・小数・指数・16進は一律 null。
  if (!/^\d+$/.test(id)) return null
  const n = Number(id)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

/**
 * Drizzle版 NextAuth アダプタ（自作）
 *
 * users/accounts/sessions テーブル構成は従来と同一（差分なし移行）。
 * email/passwordless サインインは使わない（Google OAuthのみ。auth.ts参照）ため、
 * Adapter型でoptionalの createVerificationToken/useVerificationToken は実装しない。
 * postgres-js 利用時点でNodeランタイム前提のため、ID生成は node:crypto を明示importする。
 */
export function DrizzleAdapter({ database = db }: { database?: typeof db } = {}): Adapter {
  return {
    async createUser(data: Omit<AdapterUser, 'id'>) {
      const [row] = await database
        .insert(users)
        .values({ email: data.email, updatedAt: new Date() })
        .returning()
      if (!row) throw new Error('Failed to create user')
      return toAdapterUser(row)
    },
    async getUser(id) {
      const userId = parseUserId(id)
      if (userId === null) return null
      const rows = await database.select().from(users).where(eq(users.id, userId)).limit(1)
      const row = rows[0]
      return row ? toAdapterUser(row) : null
    },
    async getUserByEmail(email) {
      const rows = await database.select().from(users).where(eq(users.email, email)).limit(1)
      const row = rows[0]
      return row ? toAdapterUser(row) : null
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const rows = await database
        .select({ user: users })
        .from(accounts)
        .innerJoin(users, eq(accounts.userId, users.id))
        .where(
          and(
            eq(accounts.provider, provider),
            eq(accounts.providerAccountId, providerAccountId),
          ),
        )
        .limit(1)
      const row = rows[0]
      return row ? toAdapterUser(row.user) : null
    },
    async updateUser(data) {
      const id = parseUserId(String(data.id))
      if (id === null) throw new Error('Invalid user id')
      const [row] = await database
        .update(users)
        // email未指定時は上書きしない（旧PrismaAdapterはundefinedをno-op化）
        .set({
          ...(data.email !== undefined ? { email: data.email } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning()
      if (!row) throw new Error('User not found')
      return toAdapterUser(row)
    },
    async deleteUser(userId) {
      const id = parseUserId(userId)
      if (id === null) throw new Error('Invalid user id')
      await database.delete(users).where(eq(users.id, id))
    },
    async linkAccount(account: AdapterAccount) {
      const userId = parseUserId(account.userId)
      if (userId === null) throw new Error('Invalid user id')
      await database.insert(accounts).values({
        userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refreshToken: account.refresh_token ?? null,
        accessToken: account.access_token ?? null,
        expiresAt: account.expires_at ?? null,
        tokenType: account.token_type ?? null,
        scope: account.scope ?? null,
        idToken: account.id_token ?? null,
        sessionState: account.session_state ?? null,
      })
    },
    async unlinkAccount({ provider, providerAccountId }) {
      await database
        .delete(accounts)
        .where(
          and(
            eq(accounts.provider, provider),
            eq(accounts.providerAccountId, providerAccountId),
          ),
        )
    },
    async createSession({ sessionToken, userId, expires }) {
      const ownerId = parseUserId(userId)
      if (ownerId === null) throw new Error('Invalid user id')
      const [row] = await database
        .insert(sessions)
        .values({
          id: randomUUID(),
          sessionToken,
          userId: ownerId,
          expires,
        })
        .returning()
      if (!row) throw new Error('Failed to create session')
      return {
        sessionToken: row.sessionToken,
        userId: String(row.userId),
        expires: row.expires,
      } satisfies AdapterSession
    },
    async getSessionAndUser(sessionToken) {
      const rows = await database
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.sessionToken, sessionToken))
        .limit(1)
      const row = rows[0]
      if (!row) return null
      return {
        session: {
          sessionToken: row.session.sessionToken,
          userId: String(row.session.userId),
          expires: row.session.expires,
        } satisfies AdapterSession,
        user: toAdapterUser(row.user),
      }
    },
    async updateSession({ sessionToken, expires }) {
      const [row] = await database
        .update(sessions)
        .set({ expires })
        .where(eq(sessions.sessionToken, sessionToken))
        .returning()
      if (!row) return null
      return {
        sessionToken: row.sessionToken,
        userId: String(row.userId),
        expires: row.expires,
      } satisfies AdapterSession
    },
    async deleteSession(sessionToken) {
      await database.delete(sessions).where(eq(sessions.sessionToken, sessionToken))
    },
  }
}
