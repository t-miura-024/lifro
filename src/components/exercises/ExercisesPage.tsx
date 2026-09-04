import ExerciseList from './ExerciseList'

/**
 * 種目ページ本体の framework 非依存の純粋UI層（arch-1）。
 * Next 側 `src/app/(protected)/exercises/page.tsx` と Start 側
 * `src/routes/exercises.tsx` の双方が本モジュールを参照する。本配下に
 * `next/*`・`@/app/*` のランタイム import はない（Hono クライアントは
 * 型のみ `@/server/api/hono-app` を参照する `@/lib/hono-client` 経由）。
 */
export default function ExercisesPage() {
  return <ExerciseList />
}
