/**
 * `/api/health` 応答契約の単一正本。
 * 専用 file route（`src/routes/api/health.tsx`）が本定数を直接参照する。
 * health は意図的に oRPC 外に置く（秘密欠落時も到達する公開healthのため）。
 * 期待値は `{ status: 'ok' }`。
 * 本モジュールは環境変数・DB・auth・Workers Cache のいずれにも触れないため、
 * 秘密欠落時・キャッシュ無効時の評価でも安全。
 */
export const HEALTH_PAYLOAD = { status: 'ok' } as const

/** `HEALTH_PAYLOAD` の軽量固定応答（splat 側の誤到達フォールバック用）。 */
export function healthResponse(): Response {
  return Response.json({ ...HEALTH_PAYLOAD })
}
