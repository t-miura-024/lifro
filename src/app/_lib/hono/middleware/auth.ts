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
// Next 温存 middleware（`./auth-next`）と共有する単一正本。本モジュールからの
// 再 export はしない（旧パス経由の消費者は存在せず、再 export が Start
// モジュール全体を Next 温存グラフに引き込む分離崩壊を招くため。ai-3）。

// NOTE（A1・A2・C1）:
// - 本モジュールは Start 正本専用。`@/auth`（better-auth）のみ参照し、
//   legacy（`@/auth.legacy`）には一切触れない。旧ランタイムは
//   Start のモジュールグラフに混入しない。
// - `process.env.NEXT_RUNTIME` 有無によるランタイム推測は廃止した。Start/Nitro への
//   継承残留での誤判定や Next Edge での `process` 未定義を避けるため、呼び出し元が
//   使うミドルウェア自体で経路を明示する（Next 側は別モジュール
//   `./auth-next` の `authMiddlewareNext` を使う）。分岐は確定的。
// - `@/auth` の top-level requireEnv は本モジュールの静的 import 時に評価される。
//   Next 温存ビルドは本モジュール（および `@/auth`）を参照しないため、
//   `BETTER_AUTH_*` なしでも起動する（`@/auth.legacy` 側の分離と合わせて A1 対応）。
//   Start の公開 GET `/api/health` は専用 file route（`src/routes/api.health.tsx`、
//   auth import なし）が担当し、本モジュールと同一バンドルに置かないため、
//   秘密欠落時も死活監視は到達する（logic-3/req-2 対応）。

/**
 * セッション解決（Start 正本）。better-auth が正本。
 *
 * - better-auth の認証失敗（セッションなし→null）は 401 に落とす。
 * - better-auth の例外（DB断・secret不備・タイムアウト等）は握り潰さず throw し、
 *   Hono の 500 経路＋ログで運用検知できるようにする（障害の 401 化をやめる）。
 * - legacy は呼ばない（M5 一括切替で `./auth-next` ごと削除する）。
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
