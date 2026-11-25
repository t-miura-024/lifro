import type { Routine, RoutineInput } from '@/server/domain/entities'
import type { IRoutineRepository, RoutineSortOrderInput } from '@/server/domain/repositories'
import { describe, expect, it } from 'vitest'
import { RoutineService } from './RoutineService'

function makeRoutine(userId: number, input: RoutineInput): Routine {
  return {
    id: 1,
    userId,
    name: input.name,
    sortIndex: input.sortIndex,
    createdAt: '2026-11-25T00:00:00.000Z',
    updatedAt: '2026-11-25T00:00:00.000Z',
    routineSets: input.routineSets.map((set, index) => ({
      id: index + 1,
      routineId: 1,
      exerciseId: set.exerciseId,
      sortIndex: set.sortIndex,
      targetReps: set.targetReps,
      createdAt: '2026-11-25T00:00:00.000Z',
      updatedAt: '2026-11-25T00:00:00.000Z',
    })),
  }
}

class FakeRoutineRepository implements IRoutineRepository {
  created: { userId: number; input: RoutineInput } | null = null
  updated: { userId: number; routineId: number; input: RoutineInput } | null = null
  deleted: { userId: number; routineId: number } | null = null
  sorted: { userId: number; routines: RoutineSortOrderInput[] } | null = null

  async findAllByUserId(): Promise<Routine[]> {
    return []
  }

  async findById(): Promise<Routine | null> {
    return null
  }

  async create(userId: number, input: RoutineInput): Promise<Routine> {
    this.created = { userId, input }
    return makeRoutine(userId, input)
  }

  async update(userId: number, routineId: number, input: RoutineInput): Promise<Routine> {
    this.updated = { userId, routineId, input }
    return makeRoutine(userId, input)
  }

  async updateSortOrder(userId: number, routines: RoutineSortOrderInput[]): Promise<void> {
    this.sorted = { userId, routines }
  }

  async delete(userId: number, routineId: number): Promise<void> {
    this.deleted = { userId, routineId }
  }
}

const validInput: RoutineInput = {
  name: 'A',
  sortIndex: 0,
  routineSets: [
    { exerciseId: 1, sortIndex: 3, targetReps: 10 },
    { exerciseId: 1, sortIndex: 4, targetReps: 10 },
    { exerciseId: 1, sortIndex: 5, targetReps: null },
    { exerciseId: 2, sortIndex: 9, targetReps: 12 },
  ],
}

describe('RoutineService', () => {
  it('名前をトリムし、セット行の順序を入力配列順に正規化して保存する', async () => {
    const repository = new FakeRoutineRepository()
    const service = new RoutineService(repository)

    const result = await service.createRoutine(7, {
      ...validInput,
      name: '  胸の日  ',
    })

    expect(result.name).toBe('胸の日')
    expect(repository.created?.userId).toBe(7)
    expect(repository.created?.input.name).toBe('胸の日')
    expect(repository.created?.input.routineSets.map((set) => set.sortIndex)).toEqual([0, 1, 2, 3])
    expect(repository.created?.input.routineSets.map((set) => set.exerciseId)).toEqual([
      1, 1, 1, 2,
    ])
    expect(repository.created?.input.routineSets.map((set) => set.targetReps)).toEqual([
      10,
      10,
      null,
      12,
    ])
  })

  it('空の名前を拒否する', async () => {
    const service = new RoutineService(new FakeRoutineRepository())

    await expect(service.createRoutine(1, { ...validInput, name: '   ' })).rejects.toThrow(
      'ルーティン名は必須です',
    )
  })

  it('セット行が0件のルーティンを拒否する', async () => {
    const service = new RoutineService(new FakeRoutineRepository())

    await expect(service.createRoutine(1, { ...validInput, routineSets: [] })).rejects.toThrow(
      '種目は1つ以上必要です',
    )
  })

  it.each([0, -1, 2.5, Number.NaN])('目標回数 %s を拒否する', async (targetReps) => {
    const service = new RoutineService(new FakeRoutineRepository())

    await expect(
      service.createRoutine(1, {
        ...validInput,
        routineSets: [{ exerciseId: 1, sortIndex: 0, targetReps }],
      }),
    ).rejects.toThrow('目標回数は正の整数で入力してください')
  })

  it('更新時も同じ検証を行い、対象IDをリポジトリへ渡す', async () => {
    const repository = new FakeRoutineRepository()
    const service = new RoutineService(repository)

    await service.updateRoutine(9, 42, validInput)

    expect(repository.updated?.userId).toBe(9)
    expect(repository.updated?.routineId).toBe(42)
    expect(repository.updated?.input.routineSets).toHaveLength(4)
  })

  it('並び順更新と削除をリポジトリへ委譲する', async () => {
    const repository = new FakeRoutineRepository()
    const service = new RoutineService(repository)

    await service.updateSortOrder(3, [{ id: 10, sortIndex: 0 }])
    await service.deleteRoutine(3, 10)

    expect(repository.sorted).toEqual({
      userId: 3,
      routines: [{ id: 10, sortIndex: 0 }],
    })
    expect(repository.deleted).toEqual({ userId: 3, routineId: 10 })
  })
})
