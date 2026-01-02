import type { Exercise } from '@/server/domain/entities'
import type { IExerciseRepository } from '@/server/domain/repositories'
import { exerciseRepository } from '@/server/infrastructure/repositories/prisma'

export class ExerciseService {
  constructor(private repository: IExerciseRepository = exerciseRepository) {}

  /**
   * ユーザーの全種目を取得
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
   * 種目を削除
   */
  async deleteExercise(userId: number, exerciseId: number): Promise<void> {
    return this.repository.delete(userId, exerciseId)
  }
}

// シングルトンインスタンス
export const exerciseService = new ExerciseService()
