import type { BodyPart, BodyPartCategory, ExerciseWithBodyParts } from '@/server/domain/entities'
import type { ExerciseBodyPartInput } from '@/server/domain/repositories'
import {
  bodyPartRepository,
  exerciseBodyPartRepository,
} from '@/server/infrastructure/repositories/drizzle'

export class BodyPartService {
  /**
   * 全部位を取得（カテゴリ・sortIndex順）
   */
  async getAllBodyParts(): Promise<BodyPart[]> {
    return bodyPartRepository.findAll()
  }

  /**
   * カテゴリ別に部位を取得
   */
  async getBodyPartsByCategory(category: BodyPartCategory): Promise<BodyPart[]> {
    return bodyPartRepository.findByCategory(category)
  }

  /**
   * ユーザーの全種目を部位情報付きで取得（主要カテゴリ順）
   */
  async getExercisesWithBodyParts(userId: number): Promise<ExerciseWithBodyParts[]> {
    return exerciseBodyPartRepository.findAllWithBodyParts(userId)
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
  }
}

// シングルトンインスタンス
export const bodyPartService = new BodyPartService()
