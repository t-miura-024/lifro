import { DrizzleAdapter } from '@/server/infrastructure/database/drizzle/auth-adapter'
import { db } from '@/server/infrastructure/database/drizzle/client'
import { users } from '@/server/infrastructure/database/drizzle/schema'
import { eq, sql } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import type { Adapter } from 'next-auth/adapters'
import GoogleProviderImport from 'next-auth/providers/google'

// `next-auth/providers/google` は CJS のため、Vite SSR（Start dev）の既定 interop では
// default import が関数にならない場合がある。Next 配下の振る舞いは変えず、
// Start dev でのモジュール評価クラッシュ（全 `/api/*` の 500 化）を避けるための吸収。
// 前提: Vite ^7（`package.json` の `vite` 参照）。出典: `node_modules/next-auth`
// が CJS 形式で配布されていること（`next-auth/package.json` の `type` 未指定＋
// `main: ./index.js`）。結果が関数であることを assert し、誤分岐時は全 `/api/*` の
// 500 化を待たず起動時に throw する。
const GoogleProvider: typeof GoogleProviderImport =
  (GoogleProviderImport as unknown as { default?: typeof GoogleProviderImport }).default ??
  GoogleProviderImport

if (typeof GoogleProvider !== 'function') {
  throw new Error('[auth.legacy] GoogleProvider interop failed: expected a function export')
}

/**
 * 旧 next-auth 経路（ADR 0008 により凍結、M5 一括切替まで温存）。
 * 正本は `@/auth` の better-auth インスタンス。Next 資産
 * （`src/app/api/auth/**`、`src/app/(public)/login/**`、`src/app/(protected)/layout.tsx`）
 * および Hono ミドルウェアの Next ランタイム限定フォールバックのみが本モジュールを
 * 参照する。Start ランタイムでは呼ばない（M5 一括切替で本モジュールごと削除）。
 */

const baseAdapter = DrizzleAdapter()
const adapter: Adapter = {
  ...baseAdapter,
  // 既存ユーザー以外の自動作成を禁止
  async createUser() {
    throw new Error('USER_NOT_ALLOWED')
  },
}

/**
 * 必須環境変数（legacy 側も正本と同一方針で fail-fast）。
 * 正本（`@/auth` の requireEnv）が起動時 throw なのに legacy だけ `|| ''` の
 * 空文字フォールバックでは設定不備を隠蔽し、Next 温存期間の OAuth 開始失敗として
 * 初めて発覚する。旧 env は `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` を持つため、
 * Next 温存ビルドの起動には影響しない（`BETTER_AUTH_*` と異なり旧 env に存在する）。
 */
function requireLegacyEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`[auth.legacy] Missing required environment variable: ${name}`)
  }
  return value
}

export const authOptions: NextAuthOptions = {
  adapter,
  session: { strategy: 'database' },
  providers: [
    GoogleProvider({
      clientId: requireLegacyEnv('GOOGLE_CLIENT_ID'),
      clientSecret: requireLegacyEnv('GOOGLE_CLIENT_SECRET'),
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

      // 既存ユーザーのみ許可（Start 正本 `src/auth.ts` と同一述語）。
      // better-auth は全経路で email を lowercase 化するため、大小文字混じりの
      // 旧行があっても同一人物として判定できるよう lower 比較に統一する。
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
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

/**
 * Next リクエストスコープ外の想定例外かどうか。
 * `getServerSession` は Next の App Router リクエストスコープ外（Start 配下や
 * ビルド時評価等）で requestAsyncStorage / headers 由来の throw をする。
 * この想定例外のみ null（未認証）に落とし、DB障害・設定不備・実装バグは
 * 呼び出し元に伝えるため再 throw する。
 * 判定は完全フレーズ一致に限定する。裸の `headers()` 単独・包括的な
 * `invariant` 単独・`app router`・末尾の `next` は secret 不備等のあらゆる
 * invariant 違反・無関係 message を想定内として握り潰すため除去した
 * （設定不備・実装バグまで null→401 に落とすフォールバック濫用になる）。
 * 出典・再現条件: Next.js の requestAsyncStorage スコープ外呼び出し時に
 * `next/dist/client/components/request-async-storage.external` 由来で投げられる
 * `Invariant: ... requestAsyncStorage ...` 系 message、および App Router の
 * `headers() ... static generation` 系 message を想定（`static generation`
 * フレーズの完全一致が必須。裸の `headers()` のみでは swallo しない）。再現は Start ランタイムや
 * ビルド時評価から `getServerAuthSession()` を呼ぶこと（Next 専用のため通常は
 * Start 経路から呼ばない。M5 一括切替で本モジュールごと削除）。
 */
function isNextRequestScopeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /requestAsyncStorage|static generation/i.test(message)
}

export async function getServerAuthSession() {
  try {
    return await getServerSession(authOptions)
  } catch (error) {
    // Next 専用（Start 経路からは呼ばない。M5 一括切替で本モジュールごと削除）。
    // 想定内の Next スコープ要求エラーのみ null に落とす。
    if (isNextRequestScopeError(error)) {
      console.warn('[auth.legacy] swallowed Next request-scope error', error)
      return null
    }
    console.error('[auth.legacy] getServerAuthSession failed', error)
    throw error
  }
}
