import { hc, type InferResponseType } from 'hono/client'
import type { AppType } from '@/app/api/[...route]/route'

/**
 * Hono RPC クライアント
 * 型安全な API 呼び出しを提供
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
