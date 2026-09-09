import { toUserId } from '@/lib/user-id'
import { ensureDatabase } from '@/routes/api/-db'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

/**
 * layout `_protected` の beforeLoad から呼ぶサーバ検証。
 * - 未認証（セッションなし→null）は `{ userId: null }` を返し、呼び出し元が `/login` へ redirect する。
 * - DB断・secret 不備等の例外は握り潰さず throw し、呼び出し元がエラー表示＋リトライに落とす（E2 維持）。
 * - `@/auth` の top-level requireEnv は本モジュール経由のサーバ実行時にのみ評価される。
 *   `/api/health` 等の軽量 route と同一バンドルに置かないこと（logic-3）。
 * - `auth.api.getSession` は共有 `db` Proxy 経由で D1 に触るため、handler 先頭で
 *   `await ensureDatabase()` を呼び `configureDatabase(env.DB)` を注入する
 *   （`src/routes/api/**` と同一契約。API外サーバ実行パスの未配線による
 *   `[database] D1 binding (DB) is not configured` の再発防止）。
 */
export const getSessionUserIdServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  await ensureDatabase()
  const { auth } = await import('@/auth')
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers: headers as unknown as Headers })
  return { userId: toUserId(session?.user?.id) }
})
