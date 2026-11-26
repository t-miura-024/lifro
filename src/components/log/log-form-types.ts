import type { LatestExerciseSets } from '@/server/domain/entities'

/** ログ入力フォームのセット行状態 */
export type SetFormData = {
  key: string // unique key for React rendering
  id?: number
  exerciseId: number | null
  exerciseName: string
  weight: string
  reps: string
}

/** ログ入力フォームの種目グループ状態 */
export type ExerciseGroup = {
  key: string // unique key for React rendering
  exerciseId: number | null
  exerciseName: string
  sets: SetFormData[]
  latestSets: LatestExerciseSets | null
}
