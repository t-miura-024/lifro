import {
  account,
  session,
  user,
  verification,
} from '@/server/infrastructure/database/drizzle/auth-schema'
import { db } from '@/server/infrastructure/database/drizzle/client'
import { users } from '@/server/infrastructure/database/drizzle/schema'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { eq, sql } from 'drizzle-orm'

/**
 * 認証基盤の正本（ADR 0008: better-auth＋Drizzleアダプタ＋Google＋DBセッション）。
 *
 * 現行（next-auth）との同等点:
 * - Google ログインのみ許可
 * - DBセッション（有効期間 30 日・更新猶予 24 時間は現行既定と同値）
 * - 招待制（既存 `users.email` のみ許可。現行 `signIn` コールバックと同等）
 *
 * 移行方針（grill Q1 確定）:
 * - 旧 next-auth 型テーブルとは非互換のためセッション継続は諦め、全員再ログイン。
 * - スキーマは better-auth 既定に寄せ、既存行は `drizzle/0001_better_auth.sql` で移行。
 * - 旧テーブルは切戻し用に温存し、M5 一括切替で削除する。
 */

async function findLegacyUserId(email: string): Promise<number | null> {
  // better-auth は全経路で email を lowercase 化する（実測: internal-adapter の
  // createUser/createOAuthUser が `email.toLowerCase()` する）。旧 `users.email` の
  // 大文字小文字と衝突しないよう両辺を lower 比較に統一する（移行 SQL 側も
  // `lower("email")` で複写する。`drizzle/0001_better_auth.sql` 参照）。
  const normalized = email.toLowerCase()
  // 生存規則は移行 SQL と同一（logic-2）: `created_at` 最古→`id` 最小の順で
  // 先頭1行を引く。移行 INSERT の `ORDER BY` と一致させ、重複旧行の帰属を決定的にする。
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(sql`lower(${users.email})`, normalized))
    .orderBy(users.createdAt, users.id)
    .limit(1)
  return rows[0]?.id ?? null
}

/**
 * 必須環境変数。未設定時は起動時（モジュール初期化時）に throw し、
 * 設定不備をログイン不能の本番障害として表面化させない（fail-fast）。
 * `NEXTAUTH_SECRET` へのフォールバックはしない。secret ローテーションの独立性を
 * 保ち、旧 secret 削除時の無音破壊を防ぐための決定（M5 切替後も維持）。
 */
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`[auth] Missing required environment variable: ${name}`)
  }
  return value
}

const betterAuthSecret = requireEnv('BETTER_AUTH_SECRET')
const googleClientId = requireEnv('GOOGLE_CLIENT_ID')
const googleClientSecret = requireEnv('GOOGLE_CLIENT_SECRET')

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  account: {
    accountLinking: {
      // Google の verified email を所有証明として暗黙リンクを許可する。
      // 招待制ゲート（下記 validateUserInfo・before）が `emailVerified === true` の
      // 既存 email のみを通すため、未検証アドレスの乗っ取りには使えない。
      // better-auth 既定 `requireLocalEmailVerified: true` と合わせ、未検証の
      // 既存行への暗黙リンクも拒否される。
      trustedProviders: ['google'],
    },
  },
  user: {
    // 招待制ゲート。create-user / link-account / sign-in の全経路で
    // 既存 `users.email` のみ許可する（現行 signIn コールバックの再現）。
    // 所有証明として Google の `emailVerified === true` を必須化する。
    // better-auth 実測: OAuth コールバックは userInfo（`emailVerified` 付き）を
    // validateUserInfo（create-user・link-account の両 action）に渡すため、
    // 未検証 Google email による被害者 legacyId の継承をここで遮断できる。
    validateUserInfo: async ({ user: candidate }) => {
      const email = typeof candidate.email === 'string' ? candidate.email : ''
      if (candidate.emailVerified !== true) {
        return { error: 'USER_NOT_ALLOWED', errorDescription: 'Email ownership is not verified.' }
      }
      if (!email || (await findLegacyUserId(email)) === null) {
        return { error: 'USER_NOT_ALLOWED', errorDescription: 'This email is not invited.' }
      }
    },
  },
  databaseHooks: {
    user: {
      create: {
        // ドメイン層（`exercises.user_id` 等の integer FK → 旧 `users.id`）との
        // 互換維持のため、better-auth 側 `user.id` に既存 `users.id` を引き継ぐ。
        // 以降 `Number(session.user.id)` がそのままドメインの userId になる。
        // 深層防御の二重ゲート: `validateUserInfo` を素通しする将来の生成経路が
        // あっても未検証 email は fail-closed で throw する。現行 dist では
        // `createOAuthUser` の呼出はなく、実経路は validate＋before の二重通過
        // （出典: `better-auth/dist/db/internal-adapter.mjs`）。
        before: async (candidate) => {
          if (candidate.emailVerified !== true) {
            throw new Error('USER_NOT_ALLOWED: email ownership is not verified')
          }
          // validateUserInfo と同一の fail-closed 拒否。email 欠落時は
          // findLegacyUserId の toLowerCase で TypeError→500 化するため、
          // validate 側と同一の USER_NOT_ALLOWED throw に倒す。
          if (typeof candidate.email !== 'string' || candidate.email === '') {
            throw new Error('USER_NOT_ALLOWED: This email is not invited.')
          }
          const legacyId = await findLegacyUserId(candidate.email)
          // fail-closed: 未招待は validateUserInfo と同一拒否で遮断する。
          // `return`（undefined）の素通しは with-hooks が {data} マージのみで
          // 遮断しないため、validate を経由しない生成経路で未招待行が作成される。
          if (legacyId === null) {
            throw new Error('USER_NOT_ALLOWED: This email is not invited.')
          }
          return { data: { ...candidate, id: String(legacyId) } }
        },
      },
    },
  },
  secret: betterAuthSecret,
})

export type AuthSession = typeof auth.$Infer.Session
export type AuthUser = typeof auth.$Infer.Session.user

// NOTE: 旧 next-auth 経路の正本は `@/auth.legacy`（Next 温存専用）。
// `@/auth` の top-level requireEnv が Next 温存ビルドのモジュール評価を巻き添えに
// しないための分離。Start 側は本モジュール（better-auth 正本）のみを参照する。
