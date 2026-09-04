import { handle } from 'hono/vercel'
import { authMiddlewareNext } from '@/app/_lib/hono/middleware/auth-next'
import { buildApp, type AppType } from '@/server/api/hono-app'

export type { AppType }

/**
 * Next Route Handler（M5 一括切替まで温存）。
 * 実体は `@/server/api/hono-app` の共有ルート定義に Next 温存ミドルウェア
 * （`authMiddlewareNext`＝legacy 単経路）を組み合わせた `appNext`。
 * Start 側は `src/routes/api.$.tsx` が同一定義に Start 正本ミドルウェアを
 * 組み合わせた別実体を使う。
 * ランタイム推測（`NEXT_RUNTIME`）ではなく使うミドルウェア自体で経路を明示する。
 * 本 route は `@/auth`（better-auth 正本）を参照しないため、`BETTER_AUTH_*`
 * なしの旧 env でも起動する。
 */
const appNext = buildApp(authMiddlewareNext)

export const GET = handle(appNext)
export const POST = handle(appNext)
export const PUT = handle(appNext)
export const DELETE = handle(appNext)
export const PATCH = handle(appNext)
