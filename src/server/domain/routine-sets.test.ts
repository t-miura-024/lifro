import { describe, expect, it } from 'vitest'
import type { RoutineSet } from './entities'
import { groupRoutineSets } from './routine-sets'

function makeSet(id: number, exerciseId: number, sortIndex: number): RoutineSet {
  return {
    id,
    routineId: 1,
    exerciseId,
    sortIndex,
    targetReps: 10,
    createdAt: '2026-11-25T00:00:00.000Z',
    updatedAt: '2026-11-25T00:00:00.000Z',
  }
}

describe('groupRoutineSets', () => {
  it('sort_index 順に並べ、同じ種目の連続を1グループにまとめる', () => {
    const groups = groupRoutineSets([
      makeSet(4, 2, 3),
      makeSet(1, 1, 0),
      makeSet(3, 1, 2),
      makeSet(2, 1, 1),
    ])

    expect(groups.map((group) => group.exerciseId)).toEqual([1, 2])
    expect(groups.map((group) => group.sets.map((set) => set.sortIndex))).toEqual([
      [0, 1, 2],
      [3],
    ])
  })

  it('同じ種目が離れて再登場した場合は別グループにする', () => {
    const groups = groupRoutineSets([
      makeSet(1, 1, 0),
      makeSet(2, 2, 1),
      makeSet(3, 1, 2),
    ])

    expect(groups.map((group) => group.exerciseId)).toEqual([1, 2, 1])
    expect(groups.map((group) => group.sets.length)).toEqual([1, 1, 1])
  })

  it('空のセット行ではグループを作らない', () => {
    expect(groupRoutineSets([])).toEqual([])
  })
})
