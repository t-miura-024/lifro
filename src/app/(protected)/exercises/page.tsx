import ExercisesPage from '@/components/exercises/ExercisesPage'

/**
 * Next 側の薄いラッパ。ページ本体は framework 非依存の純粋UI層
 * （`@/components/exercises/ExercisesPage`）にあり、Start 側
 * `src/routes/exercises.tsx` と共有する。M5 一括切替で Next 版ごと削除する。
 */
export default function NextExercisesPage() {
  return <ExercisesPage />
}
