import type { RoutineSet } from './entities'

/**
 * ルーティンの種目グループ（読み取り結果）。
 *
 * グループは保存されない二次情報であり、連番順に並べた routine_sets のうち
 * 同じ exercise_id が連続する範囲として導出する。同じ種目が離れて再登場した
 * 場合は別グループになる。
 */
export type RoutineSetGroup = {
  exerciseId: number
  sets: RoutineSet[]
}

/**
 * routine_sets を sort_index 順に並べ、同じ exercise_id の連続をグループ化する。
 */
export function groupRoutineSets(routineSets: RoutineSet[]): RoutineSetGroup[] {
  const groups: RoutineSetGroup[] = []
  const sorted = [...routineSets].sort((a, b) => a.sortIndex - b.sortIndex)

  for (const set of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.exerciseId === set.exerciseId) {
      last.sets.push(set)
    } else {
      groups.push({ exerciseId: set.exerciseId, sets: [set] })
    }
  }

  return groups
}
