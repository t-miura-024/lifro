import { createFileRoute } from '@tanstack/react-router'
import { HEALTH_PAYLOAD } from '@/server/api/health'

/**
 * 公開 health check（認証・秘密なし）。
 * `src/routes/api.$.tsx`（Hono 合成＝`@/auth` の top-level requireEnv を評価する）
 * と同一バンドルに置かない。file route の precedence で静的 `/api/health` が
 * splat `/api/$` より優先マッチするため、秘密欠落時も本 route は評価できる。
 * Hono 側 `buildApp` の `/health` は Next 温存 entry・直接 `app.fetch` 互換のため残す。
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
