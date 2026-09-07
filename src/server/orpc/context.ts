import { toUserId } from '@/lib/user-id'

export type ORPCContext = {
  userId?: number
}

// NOTE:
// - `@/auth` は動的 import する。top-level の requireEnv 巻き添えを避けるため
//   （既存 `src/server/api/middleware/auth.ts` の NOTE 参照）。
// - better-auth の例外（DB断・secret不備等）は握り潰さず throw する。
// - セッションなし→ `{}`（userId なし）。401 化は `base.ts` の requireAuth が担当。
export async function createORPCContext(headers: Headers): Promise<ORPCContext> {
  const { auth } = await import('@/auth')
  const session = await auth.api.getSession({ headers })
  const userId = toUserId(session?.user?.id)
  if (userId === null) {
    return {}
  }
  return { userId }
}
