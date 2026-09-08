import { HEALTH_PAYLOAD } from '@/server/api/health'
import { createFileRoute } from '@tanstack/react-router'

/**
 * 公開 health check（認証・秘密なし）。
 * `@/server/api/health` の `HEALTH_PAYLOAD` を直接返す。oRPC層
 * （`@/server/orpc/*` は services 経由で `@/auth` の top-level requireEnv を
 * 推移的に評価するため秘密欠落時に throw し得る）には一切触れない。
 * health は意図的に oRPC 外に置く（ADR 0009の置換対象は4系統44APIのみ）。
 * file route の precedence で静的 `/api/health` が動的 route より優先され、
 * 秘密欠落時も本 route は評価できる。
 *
 * DB 配線なしの理由: 本 route は DB を使わない公開 health check であり、
 * D1 欠落時も応答できる独立性を保つため `ensureDatabase()` を呼ばない。
 * DB 系ルートの配線は `src/routes/api/-db.ts` を参照 (M1 スコープ・Issue #20)。
 */
async function handleHealth(): Promise<Response> {
  return Response.json({ ...HEALTH_PAYLOAD })
}

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => handleHealth(),
    },
  },
})
