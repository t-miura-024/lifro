import type { Exercise } from '@/server/domain/entities'
import type { ExerciseSortOrderInput, IExerciseRepository } from '@/server/domain/repositories'
import { exerciseRepository } from '@/server/infrastructure/repositories/prisma'

export class ExerciseService {
  constructor(private repository: IExerciseRepository = exerciseRepository) {}

  /**
   * ユーザーの全種目を取得（sortIndex順）
   */
  async getAllExercises(userId: number): Promise<Exercise[]> {
    return this.repository.findAllByUserId(userId)
  }

  /**
   * 種目名で検索
   */
  async searchExercises(userId: number, query: string): Promise<Exercise[]> {
    if (!query.trim()) {
      return this.repository.findAllByUserId(userId)
    }
    return this.repository.searchByName(userId, query)
  }

  /**
   * 種目を作成
   */
  async createExercise(userId: number, name: string): Promise<Exercise> {
    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('種目名は必須です')
    }
    return this.repository.create(userId, trimmedName)
  }

  /**
   * 種目名を更新
   */
  async updateExercise(userId: number, exerciseId: number, name: string): Promise<Exercise> {
    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('種目名は必須です')
    }
    return this.repository.update(userId, exerciseId, trimmedName)
  }

  /**
   * 種目の並び順を更新
   */
  async updateSortOrder(userId: number, exercises: ExerciseSortOrderInput[]): Promise<void> {
    return this.repository.updateSortOrder(userId, exercises)
  }

  /**
   * 種目を削除可能かチェック
   * @returns true: 削除可能, false: セットが紐づいているため削除不可
   */
  async canDelete(userId: number, exerciseId: number): Promise<boolean> {
    const hasRelatedSets = await this.repository.hasRelatedSets(userId, exerciseId)
    return !hasRelatedSets
  }

  /**
   * 種目を削除
   */
  async deleteExercise(userId: number, exerciseId: number): Promise<void> {
    return this.repository.delete(userId, exerciseId)
  }
}

// シングルトンインスタンス
export const exerciseService = new ExerciseService()
