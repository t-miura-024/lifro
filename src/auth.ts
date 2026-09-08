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
 * - Google ログインのみ許可
 * - DBセッション（有効期間 30 日・更新猶予 24 時間）
 * - 招待制（既存 `users.email` のみ許可）
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

/**
 * Env 取得の方針 (Issue #20 M3)。
 * - 一次ソースは `process.env`。本番の実体は wrangler secret
 *   （`wrangler secret put BETTER_AUTH_SECRET` / `GOOGLE_CLIENT_ID` /
 *   `GOOGLE_CLIENT_SECRET` / `BETTER_AUTH_URL`）であり、`nodejs_compat`
 *   （`wrangler.toml` の `compatibility_flags` 参照）有効時は Worker 上でも
 *   `process.env` 経由で読める前提のため、`cloudflare:workers` の `env` を
 *   直読しない。`client.ts`（M2 担当）との取得経路の統合は申送り。
 * - 必須 secret は `requireEnv` で起動時 fail-fast する（`auth` は動的 import
 *   されるため、throw は初回利用時の起動時バリデーションとして作用する）。
 * - 任意の `BETTER_AUTH_URL` は `resolveAuthURL` に集約する（使用箇所1箇所の
 *   ための単独ヘルパーは設けない）。未設定・不正値時の扱い: 本番では
 *   throw（fail-closed。OAuth コールバック不一致の沈黙稼働を防ぐ）、非本番
 *   では警告の上でリクエスト由来に縮退する（ローカル互換。M4 ガイド手順5
 *   の「未設定だとローカル互換動作になる」はこの非本番縮退パスの説明）。
 * - 本番判定は `isProduction` に一本化する。`NODE_ENV` 未設定・空・未知値は
 *   不明として fail-closed 側（本番扱い）に倒す。非本番扱いは
 *   `NODE_ENV=development`/`test` の明示時のみであり、「`NODE_ENV` 未設定時は
 *   非本番扱い」とはしない（`wrangler.toml` の `[vars]` による裏付けがなくても
 *   安全側に倒すための決定）。
 */

/**
 * OAuth コールバックURLの正本 (Issue #20 M3: workers.dev 対応)。
 * - `BETTER_AUTH_URL`（例: `https://<worker>.workers.dev`）があれば `baseURL` に
 *   採用し、Google 往復後のコールバック（`/api/auth/callback/google`）を
 *   workers.dev 由来に固定する。未設定時は従来通りリクエスト由来となるため、
 *   ローカル開発（`http://localhost:3000`）の互換は維持される。
 * - `trustedOrigins` には baseURL の origin を追加する。Google 往復後の
 *   コールバック POST が origin 検証で弾かれないための措置であり、同一 origin の
 *   追加は既存の同一オリジン運用を変えない。
 * - 招待制・再ログイン移行の扱いは変えない（`validateUserInfo`＋`before` の
 *   二重ゲート維持）。既存セッションは切替後の再ログインで作り直す。
 * - Google Cloud Console 側の「承認済みのリダイレクト URI」への
 *   `https://<worker>.workers.dev/api/auth/callback/google` 追加は Human Gate
 *   の手動作業（M4 ガイド・完了報告の申送り参照）。
 * - DB アダプタは D1/SQLite 前提で `provider: 'sqlite'` を指定する
 *   （Issue #20 M3: `auth-schema`/`schema` の sqliteTable 化と整合させる）。
 */
/**
 * 本番判定の正本。不明時（未設定・空・未知値）は fail-closed 側の本番扱いに
 * 倒す。非本番は `development`/`test` の明示時のみ。
 */
function isProduction(): boolean {
  const nodeEnv = process.env['NODE_ENV']?.trim()
  return nodeEnv !== 'development' && nodeEnv !== 'test'
}

function resolveAuthURL(): { baseURL: string; trustedOrigins: string[] } | null {
  const raw = process.env['BETTER_AUTH_URL']?.trim()
  if (!raw) {
    if (isProduction()) {
      throw new Error('[auth] Missing required environment variable in production: BETTER_AUTH_URL')
    }
    console.warn('[auth] BETTER_AUTH_URL is not set; falling back to request-derived URL (local dev only)')
    return null
  }
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    // 不正値は本番では throw（fail-closed。未設定時と同一境界）。
    // 非本番のみ警告の上でリクエスト由来に縮退する（ローカル互換）。
    if (isProduction()) {
      throw new Error(`[auth] Invalid BETTER_AUTH_URL in production: ${raw}`)
    }
    console.warn(`[auth] Invalid BETTER_AUTH_URL (ignored, falling back to request-derived URL): ${raw}`)
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    if (isProduction()) {
      throw new Error(`[auth] Invalid BETTER_AUTH_URL scheme in production: ${raw}`)
    }
    console.warn(`[auth] Invalid BETTER_AUTH_URL scheme (ignored, falling back to request-derived URL): ${raw}`)
    return null
  }
  // WHATWG URL の hostname は IPv6 リテラルを brackets 付き（`[::1]`）で返すため、
  // brackets 除去後に比較する。素の `::1` との直接比較では localhost 判定を素通しする。
  const normalizedHostname = url.hostname.replace(/^\[(.*)\]$/, '$1')
  const isLocalhost = normalizedHostname === 'localhost' || normalizedHostname === '127.0.0.1' || normalizedHostname === '::1'
  if (url.protocol === 'http:') {
    // 本番では http を fail-closed で拒否する（localhost 例外は非本番に限定）。
    // 非本番の localhost のみ http を許容し、非本番の非 localhost は警告の上で
    // https に昇格する。
    if (isProduction()) {
      throw new Error(`[auth] BETTER_AUTH_URL must use https in production: ${raw}`)
    }
    if (!isLocalhost) {
      console.warn(`[auth] BETTER_AUTH_URL uses http for a non-local host; upgrading to https: ${url.host}`)
      url.protocol = 'https:'
      // 昇格時に明示ポートを除去して正規化する。`http://host:3000` 等をそのまま
      // 昇格すると `https://host:3000` という非標準 origin が baseURL/
      // trustedOrigins に採用され、コールバック不一致または意図しない origin 信頼を招く。
      url.port = ''
    }
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    // 本番では path/query/hash 付きを fail-closed で拒否する（origin 固定の
    // 約束を沈黙の正規化で崩さない）。非本番のみ警告の上で origin に縮退する。
    if (isProduction()) {
      throw new Error(`[auth] BETTER_AUTH_URL must not contain path/query/hash in production: ${raw}`)
    }
    console.warn(`[auth] BETTER_AUTH_URL path/query/hash is ignored; using origin only: ${url.origin}`)
  }
  // 正規化: origin のみ採用する（末尾スラッシュ・パス・クエリ・hash を除去）。
  // `baseURL` には未正規化の raw ではなく正規化済み origin を渡す。
  const baseURL = url.origin
  return { baseURL, trustedOrigins: [baseURL] }
}

const authURL = resolveAuthURL()

export const auth = betterAuth({
  ...(authURL ?? {}),
  database: drizzleAdapter(db, {
    provider: 'sqlite',
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
