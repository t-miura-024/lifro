import TimerList from './_components/TimerList'

/**
 * タイマーページ本体の framework 非依存の純粋UI層（arch-1）。
 * Next 側 `src/app/(protected)/timers/page.tsx` と Start 側
 * `src/routes/timers.tsx` の双方が本モジュールを参照する。本配下に
 * `next/*`・`@/app/*` のランタイム import はない（Hono クライアントは
 * 型のみ `@/server/api/hono-app` を参照する `@/lib/hono-client` 経由、
 * タイマーは `@/components/timer/TimerContext` 経由）。
 */
export default function TimersPage() {
  return <TimerList />
}
