/**
 * セッション由来の生 ID をドメインの userId（正の安全整数）に正規化する
 * framework 非依存の純粋ヘルパ。
 * Start 正本 middleware（`src/app/_lib/hono/middleware/auth.ts`）と Next 温存
 * middleware（`./auth-next.ts`）の双方から参照する単一正本（arch-2 対応）。
 * 本モジュールは `@/auth` を引かない（値 import なし）。`./auth` の top-level は
 * `@/auth` の静的 import で requireEnv を評価するため、値 import すると
 * Next 温存ビルドの `BETTER_AUTH_*` なし起動を壊す。ここに置くことで両経路の
 * shotgun 編集とモジュールグラフ結合を同時に避ける。
 */
export function toUserId(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isSafeInteger(raw) ? raw : null
  if (typeof raw !== 'string') return null
  // Number('') === 0 の fail-open を避けるため正規形の10進整数のみ受理する。
  if (!/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return Number.isSafeInteger(n) ? n : null
}
