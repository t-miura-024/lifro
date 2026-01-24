import type { BodyPart, BodyPartCategory, ExerciseWithBodyParts } from '@/server/domain/entities'
import type { ExerciseBodyPartInput } from '@/server/domain/repositories'
import { cacheService } from '@/server/infrastructure/cache'
import {
  bodyPartRepository,
  exerciseBodyPartRepository,
} from '@/server/infrastructure/repositories/prisma'

export class BodyPartService {
  /**
   * 全部位を取得（カテゴリ・sortIndex順）
   */
  async getAllBodyParts(): Promise<BodyPart[]> {
    const cacheKey = cacheService.buildKey(0, 'bodyPart', 'getAllBodyParts')
    return cacheService.through(
      cacheKey,
      () => bodyPartRepository.findAll(),
      60 * 60, // 1時間キャッシュ（マスタデータなので長め）
    )
  }

  /**
   * カテゴリ別に部位を取得
   */
  async getBodyPartsByCategory(category: BodyPartCategory): Promise<BodyPart[]> {
    const cacheKey = cacheService.buildKey(0, 'bodyPart', 'getBodyPartsByCategory', category)
    return cacheService.through(
      cacheKey,
      () => bodyPartRepository.findByCategory(category),
      60 * 60, // 1時間キャッシュ
    )
  }

  /**
   * ユーザーの全種目を部位情報付きで取得（主要カテゴリ順）
   */
  async getExercisesWithBodyParts(userId: number): Promise<ExerciseWithBodyParts[]> {
    const cacheKey = cacheService.buildKey(userId, 'exercise', 'getExercisesWithBodyParts')
    return cacheService.through(cacheKey, () =>
      exerciseBodyPartRepository.findAllWithBodyParts(userId),
    )
  }

  /**
   * 種目の部位紐付けを更新
   */
  async updateExerciseBodyParts(
    userId: number,
    exerciseId: number,
    bodyParts: ExerciseBodyPartInput[],
  ): Promise<void> {
    await exerciseBodyPartRepository.saveAll(userId, exerciseId, bodyParts)
    // キャッシュを無効化
    await cacheService.invalidateUserDomain(userId, 'exercise')
    // 統計キャッシュも無効化（部位別統計に影響）
    await cacheService.invalidateUserDomain(userId, 'statistics')
  }
}

// シングルトンインスタンス
export const bodyPartService = new BodyPartService()
