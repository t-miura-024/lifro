import ExerciseList from './ExerciseList'

/**
 * 種目ページ本体（純粋UI層。`src/routes/_protected/exercises.tsx` が参照する。
 * Hono クライアントは型のみ `@/server/api/hono-app` を参照する
 * `@/lib/hono-client` 経由）。
 */
export default function ExercisesPage() {
  return <ExerciseList />
}
