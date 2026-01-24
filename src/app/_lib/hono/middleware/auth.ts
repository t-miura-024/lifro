import type { Context, MiddlewareHandler } from 'hono'
import { getServerAuthSession } from '@/auth'

/**
 * 認証済みユーザーのコンテキスト型
 */
export type AuthEnv = {
  Variables: {
    userId: number
  }
}

/**
 * 認証ミドルウェア
 * セッションからユーザーIDを取得し、コンテキストに設定する
 */
export const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const session = await getServerAuthSession()

  if (!session?.user?.id) {
    return c.json({ error: '認証が必要です' }, 401)
  }

  const userId = Number(session.user.id)
  c.set('userId', userId)

  await next()
}

/**
 * コンテキストからユーザーIDを取得するヘルパー
 */
export function getUserId(c: Context<AuthEnv>): number {
  return c.get('userId')
}
