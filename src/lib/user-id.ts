/**
 * セッション由来の生 ID をドメインの userId（正の安全整数）に正規化する
 * framework 非依存の純粋ヘルパ。
 * Hono middleware（`src/server/api/middleware/auth.ts`）と layout のサーバ検証
 * （`src/lib/auth-session-server.ts`）の双方から参照する単一正本。
 * 本モジュールは `@/auth` を引かない（値 import なし）。`@/auth` の top-level は
 * requireEnv を評価するため、ここに置くことでモジュールグラフ結合を避ける。
 */
export function toUserId(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isSafeInteger(raw) ? raw : null
  if (typeof raw !== 'string') return null
  // Number('') === 0 の fail-open を避けるため正規形の10進整数のみ受理する。
  if (!/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return Number.isSafeInteger(n) ? n : null
}
