import type { Routine, RoutineInput } from '@/server/domain/entities'
import type { IRoutineRepository, RoutineSortOrderInput } from '@/server/domain/repositories'
import { routineRepository } from '@/server/infrastructure/repositories/drizzle'

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

export class RoutineService {
  constructor(private repository: IRoutineRepository = routineRepository) {}

  /**
   * ユーザーの全ルーティンを取得（sortIndex順）
   */
  async getAllRoutines(userId: number): Promise<Routine[]> {
    return this.repository.findAllByUserId(userId)
  }

  /**
   * ルーティンをIDで取得
   */
  async getRoutine(userId: number, routineId: number): Promise<Routine | null> {
    return this.repository.findById(userId, routineId)
  }

  /**
   * ルーティンを作成
   */
  async createRoutine(userId: number, input: RoutineInput): Promise<Routine> {
    const normalized = this.validateInput(input)
    return this.repository.create(userId, normalized)
  }

  /**
   * ルーティンを更新
   */
  async updateRoutine(userId: number, routineId: number, input: RoutineInput): Promise<Routine> {
    const normalized = this.validateInput(input)
    return this.repository.update(userId, routineId, normalized)
  }

  /**
   * ルーティンの並び順を更新
   */
  async updateSortOrder(userId: number, routines: RoutineSortOrderInput[]): Promise<void> {
    await this.repository.updateSortOrder(userId, routines)
  }

  /**
   * ルーティンを削除
   */
  async deleteRoutine(userId: number, routineId: number): Promise<void> {
    await this.repository.delete(userId, routineId)
  }

  /**
   * 名前・種目セット行・目標回数を検証し、保存用の入力へ正規化する。
   */
  private validateInput(input: RoutineInput): RoutineInput {
    const name = input.name.trim()
    if (!name) {
      throw new Error('ルーティン名は必須です')
    }
    if (input.routineSets.length === 0) {
      throw new Error('種目は1つ以上必要です')
    }

    return {
      ...input,
      name,
      routineSets: input.routineSets.map((set, index) => {
        if (set.targetReps !== null && !isPositiveInteger(set.targetReps)) {
          throw new Error('目標回数は正の整数で入力してください')
        }
        return {
          ...set,
          sortIndex: index,
        }
      }),
    }
  }
}

// シングルトンインスタンス
export const routineService = new RoutineService()
