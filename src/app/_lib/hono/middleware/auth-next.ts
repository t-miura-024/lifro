import { getServerAuthSession } from '@/auth.legacy'
import { toUserId } from '@/lib/user-id'
import type { Context, MiddlewareHandler } from 'hono'
import type { AuthEnv } from './auth'

// NOTE: 本モジュールは Next 温存期間専用。M5 一括切替で `@/auth.legacy` と共に削除する。
// - `./auth` からは型（`AuthEnv`）のみ参照する（`import type` はコンパイル時に
//   消去され、実行時のモジュール評価を引き起こさない）。`AuthEnv` と同一形状の
//   独自型（旧 `NextAuthEnv`）は持たない。同一概念の二名二定義は変更時の
//   shotgun 編集を強制するため、`AuthEnv` を直接使う（arch-2）。
// - userId 正規化の正本は `@/lib/user-id`（framework 非依存の純粋ヘルパ）。
//   `./auth` の値は静的 import しない。`./auth` の top-level は
//   `@/auth` の静的 import であり、値 import はモジュール評価（＝requireEnv の
//   `BETTER_AUTH_*` 必須化）を引き起こす。Next 温存ビルドは `BETTER_AUTH_*`
//   なしで起動できなければならないため、`@/lib/user-id`（`@/auth` を引かない）
//   から参照し、モジュールグラフを分離する。
// - 本ファイルは Next ビルドからのみ参照され、Start ビルドには混入しない。

/**
 * セッション解決（Next 温存期間のみ）。旧 next-auth 単経路。
 *
 * better-auth には触れない。Next 温存 UI（`src/app/(protected)/layout.tsx`）が
 * legacy セッションのみを使う構成のため、未認証はここで null→401 に落とす。
 * DB障害・設定不備は握り潰さず throw する。M5 一括切替で本モジュールごと削除する。
 */
async function resolveNextUserId(c: Context<AuthEnv>): Promise<number | null> {
  const legacy = await getServerAuthSession()
  return toUserId(legacy?.user?.id)
}

/**
 * 認証ミドルウェア（Next 温存期間のみ。legacy 単経路、better-auth なし）
 * セッションからユーザーIDを取得し、コンテキストに設定する
 */
export const authMiddlewareNext: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const userId = await resolveNextUserId(c)

  if (userId === null) {
    return c.json({ error: '認証が必要です' }, 401)
  }

  c.set('userId', userId)

  await next()
}
