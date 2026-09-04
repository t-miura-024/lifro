import { hc, type InferResponseType } from 'hono/client'
import type { AppType } from '@/server/api/hono-app'

/**
 * Hono RPC クライアントの framework 非依存の正本。
 * 型のみ `@/server/api/hono-app` の `AppType` を参照する（`import type` のため
 * ランタイムには残らず、Start バンドルに `src/app` 資産は混入しない）。
 * 型の実体は Next 側 `src/app/api/[...route]/route.ts` が再 export するものと同一
 * （同ファイルは本 `AppType` をそのまま再 export している）ため応答型は一致する。
 * 旧正本 `@/app/_lib/hono/client` は Next 温存期間の既存利用点のために残し、
 * M5 の `_api` 移設（`docs/migration-cutover.md` 手順8）で付け替える。
 */
export const client = hc<AppType>('/')

/**
 * クライアント型のエクスポート（型推論用）
 */
export type Client = typeof client

/**
 * APIレスポンス型推論ヘルパー
 */
export type { InferResponseType }
