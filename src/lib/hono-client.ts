import type { AppType } from '@/server/api/hono-app'
import { type InferResponseType, hc } from 'hono/client'

/**
 * Hono RPC クライアントの framework 非依存の正本。
 * 型のみ `@/server/api/hono-app` の `AppType` を参照する（`import type` のため
 * ランタイムには残らず、Start バンドルに `src/app` 資産は混入しない）。
 * 型の実体は旧 Next 側 `src/app/api/[...route]/route.ts` が再 export していたものと同一
 * （同ファイルは本 `AppType` をそのまま再 export していた）ため応答型は一致する。
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
