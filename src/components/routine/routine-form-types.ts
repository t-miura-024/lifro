import type { LatestExerciseSets } from '@/server/domain/entities'

/** 部位カテゴリ別の種目選択肢（表示に必要な最小フィールド） */
export type RoutineExerciseOption = {
  id: number
  name: string
  primaryCategory: string | null
}

/** ルーティンフォームのセット行状態 */
export type RoutineSetFormData = {
  key: string
  targetReps: string
}

/** ルーティンフォームの種目グループ状態（グループは保存しない読み取り結果） */
export type RoutineGroupFormData = {
  key: string
  exerciseId: number | null
  sets: RoutineSetFormData[]
  latestSets: LatestExerciseSets | null
}

let groupKeyCounter = 0
let setKeyCounter = 0

export function createEmptyRoutineSet(): RoutineSetFormData {
  return {
    key: `routine-set-${Date.now()}-${setKeyCounter++}`,
    targetReps: '',
  }
}

export function createEmptyRoutineGroup(): RoutineGroupFormData {
  return {
    key: `routine-group-${Date.now()}-${groupKeyCounter++}`,
    exerciseId: null,
    sets: [createEmptyRoutineSet()],
    latestSets: null,
  }
}
