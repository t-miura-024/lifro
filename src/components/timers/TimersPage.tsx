import TimerList from './_components/TimerList'

/**
 * タイマーページ本体（純粋UI層。Hono クライアントは
 * 型のみ `@/server/api/hono-app` を参照する `@/lib/hono-client` 経由、
 * タイマーは `@/components/timer/TimerContext` 経由）。
 */
export default function TimersPage() {
  return <TimerList />
}
