import type { Exercise } from '@/server/domain/entities'
import type { ExerciseSortOrderInput, IExerciseRepository } from '@/server/domain/repositories'
import { cacheService } from '@/server/infrastructure/cache'
import { exerciseRepository } from '@/server/infrastructure/repositories/prisma'

export class ExerciseService {
  constructor(private repository: IExerciseRepository = exerciseRepository) {}

  /**
   * ユーザーの全種目を取得（sortIndex順）
   */
  async getAllExercises(userId: number): Promise<Exercise[]> {
    const cacheKey = cacheService.buildKey(userId, 'exercise', 'getAllExercises')
    return cacheService.through(cacheKey, () => this.repository.findAllByUserId(userId))
  }

  /**
   * 種目名で検索
   */
  async searchExercises(userId: number, query: string): Promise<Exercise[]> {
    if (!query.trim()) {
      return this.getAllExercises(userId)
    }
    const cacheKey = cacheService.buildKey(userId, 'exercise', 'searchExercises', query)
    return cacheService.through(cacheKey, () => this.repository.searchByName(userId, query))
  }

  /**
   * 種目を作成
   */
  async createExercise(userId: number, name: string): Promise<Exercise> {
    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('種目名は必須です')
    }
    const result = await this.repository.create(userId, trimmedName)
    // キャッシュを無効化
    await cacheService.invalidateUserDomain(userId, 'exercise')
    return result
  }

  /**
   * 種目名を更新
   */
  async updateExercise(userId: number, exerciseId: number, name: string): Promise<Exercise> {
    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('種目名は必須です')
    }
    const result = await this.repository.update(userId, exerciseId, trimmedName)
    // キャッシュを無効化
    await cacheService.invalidateUserDomain(userId, 'exercise')
    return result
  }

  /**
   * 種目の並び順を更新
   */
  async updateSortOrder(userId: number, exercises: ExerciseSortOrderInput[]): Promise<void> {
    await this.repository.updateSortOrder(userId, exercises)
    // キャッシュを無効化
    await cacheService.invalidateUserDomain(userId, 'exercise')
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
    await this.repository.delete(userId, exerciseId)
    // キャッシュを無効化
    await cacheService.invalidateUserDomain(userId, 'exercise')
  }
}

// シングルトンインスタンス
export const exerciseService = new ExerciseService()
