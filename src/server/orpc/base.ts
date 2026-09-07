import { os, ORPCError } from '@orpc/server'
import type { ORPCContext } from './context'

export const pub = os.$context<ORPCContext>()

const requireAuth = os.$context<ORPCContext>().middleware(async ({ context, next }) => {
  const userId = context.userId
  if (userId === undefined) {
    throw new ORPCError('UNAUTHORIZED', { message: '認証が必要です' })
  }
  return next({ context: { userId } })
})

export const authed = pub.use(requireAuth)
