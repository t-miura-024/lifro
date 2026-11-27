import type { LoadMode } from '@/lib/assisted-load'
import type { LatestExerciseSets } from '@/server/domain/entities'

/** ログ入力フォームのセット行状態 */
export type SetFormData = {
  key: string // unique key for React rendering
  id?: number
  exerciseId: number | null
  exerciseName: string
  weight: string
  reps: string
  assistValue: string // アシスト量／加重値（画面上は常にプラス。空欄可）
}

/** ログ入力フォームの種目グループ状態 */
export type ExerciseGroup = {
  key: string // unique key for React rendering
  exerciseId: number | null
  exerciseName: string
  supportsAssist: boolean
  loadMode: LoadMode
  sets: SetFormData[]
  latestSets: LatestExerciseSets | null
}
