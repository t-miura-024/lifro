import { auth } from '@/auth'
import { toUserId } from '@/lib/user-id'
import type { Context, MiddlewareHandler } from 'hono'

/**
 * 認証済みユーザーのコンテキスト型
 */
export type AuthEnv = {
  Variables: {
    userId: number
  }
}

// `toUserId` の正本は `@/lib/user-id`（framework 非依存の純粋ヘルパ）。
// 本モジュールからの再 export はしない。

// NOTE:
// - 本モジュールは better-auth 単経路。旧 next-auth ランタイムには一切触れない。
// - `@/auth` の top-level requireEnv は本モジュールの静的 import 時に評価される。
//   Start の公開 GET `/api/health` は専用 file route（`src/routes/api.health.tsx`、
//   auth import なし）が担当し、本モジュールと同一バンドルに置かないため、
//   秘密欠落時も死活監視は到達する。

/**
 * セッション解決（Start 正本）。better-auth が正本。
 *
 * - better-auth の認証失敗（セッションなし→null）は 401 に落とす。
 * - better-auth の例外（DB断・secret不備・タイムアウト等）は握り潰さず throw し、
 *   Hono の 500 経路＋ログで運用検知できるようにする（障害の 401 化をやめる）。
 * - legacy は呼ばない。
 */
async function resolveStartUserId(c: Context<AuthEnv>): Promise<number | null> {
  let resolved: Awaited<ReturnType<typeof auth.api.getSession>>
  try {
    resolved = await auth.api.getSession({ headers: c.req.raw.headers })
  } catch (error) {
    console.error('[hono-auth] better-auth getSession failed', error)
    throw error
  }
  return toUserId(resolved?.user?.id)
}

/**
 * 認証ミドルウェア（Start 正本。better-auth 単経路、legacy なし）
 * セッションからユーザーIDを取得し、コンテキストに設定する
 */
export const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const userId = await resolveStartUserId(c)

  if (userId === null) {
    return c.json({ error: '認証が必要です' }, 401)
  }

  c.set('userId', userId)

  await next()
}

/**
 * コンテキストからユーザーIDを取得するヘルパー
 */
export function getUserId(c: Context<AuthEnv>): number {
  return c.get('userId')
}
