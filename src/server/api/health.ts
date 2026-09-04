/**
 * `/api/health` 応答契約の単一正本（ai-3）。
 * Hono `/health`（`./hono-app`）・専用 file route（`src/routes/api.health.tsx`）・
 * splat 側の誤到達フォールバック（`src/routes/api.$.tsx`）の三者が本定数を参照し、
 * ペイロード変更時の無音乖離を防ぐ。期待値は `{ status: 'ok' }`。
 * 本モジュールは環境変数・DB・auth に触れないため、秘密欠落時の評価でも安全。
 */
export const HEALTH_PAYLOAD = { status: 'ok' } as const

/** `HEALTH_PAYLOAD` の軽量固定応答（splat 側の誤到達フォールバック用）。 */
export function healthResponse(): Response {
  return Response.json({ ...HEALTH_PAYLOAD })
}
