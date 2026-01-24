import type {
  ExerciseHistory,
  LatestExerciseSets,
  SetInput,
  Training,
  TrainingSummary,
  YearMonth,
} from '@/server/domain/entities'
import type { ITrainingRepository } from '@/server/domain/repositories'
import { cacheService } from '@/server/infrastructure/cache'
import { trainingRepository } from '@/server/infrastructure/repositories/prisma'

export class TrainingService {
  constructor(private repository: ITrainingRepository = trainingRepository) {}

  /**
   * 指定月のトレーニング一覧を取得
   */
  async getMonthlyTrainings(
    userId: number,
    year: number,
    month: number,
  ): Promise<TrainingSummary[]> {
    const cacheKey = cacheService.buildKey(
      userId,
      'training',
      'getMonthlyTrainings',
      `${year}-${month}`,
    )
    return cacheService.through(cacheKey, () => this.repository.findByMonth(userId, year, month))
  }

  /**
   * 特定日のトレーニング詳細を取得
   * @param date YYYY-MM-DD形式
   */
  async getTrainingByDate(userId: number, date: string): Promise<Training | null> {
    const cacheKey = cacheService.buildKey(userId, 'training', 'getTrainingByDate', date)
    return cacheService.through(cacheKey, () => this.repository.findByDate(userId, date))
  }

  /**
   * トレーニングを保存
   * @param date YYYY-MM-DD形式
   */
  async saveTraining(userId: number, date: string, sets: SetInput[]): Promise<Training> {
    // sortIndex が設定されていない場合は自動採番
    const setsWithIndex = sets.map((s, i) => ({
      ...s,
      sortIndex: s.sortIndex ?? i,
    }))
    const result = await this.repository.save(userId, date, setsWithIndex)
    // トレーニングと統計のキャッシュを無効化
    await cacheService.invalidateUserDomains(userId, ['training', 'statistics'])
    return result
  }

  /**
   * トレーニングを削除
   * @param date YYYY-MM-DD形式
   */
  async deleteTraining(userId: number, date: string): Promise<void> {
    await this.repository.deleteByDate(userId, date)
    // トレーニングと統計のキャッシュを無効化
    await cacheService.invalidateUserDomains(userId, ['training', 'statistics'])
  }

  /**
   * 種目の前回値を取得
   * @param excludeDate 除外する日付（YYYY-MM-DD形式、この日付のセットは対象外）
   */
  async getLatestExerciseHistory(
    userId: number,
    exerciseId: number,
    excludeDate?: string,
  ): Promise<ExerciseHistory | null> {
    return this.repository.getLatestHistory(userId, exerciseId, excludeDate)
  }

  /**
   * 直近実施日の当該種目の全セットを取得
   * @param excludeDate 除外する日付（YYYY-MM-DD形式、この日付のセットは対象外）
   */
  async getLatestExerciseSets(
    userId: number,
    exerciseId: number,
    excludeDate?: string,
  ): Promise<LatestExerciseSets | null> {
    return this.repository.getLatestExerciseSets(userId, exerciseId, excludeDate)
  }

  /**
   * 複数種目の直近実施日の全セットを一括取得
   * @param excludeDate 除外する日付（YYYY-MM-DD形式、この日付のセットは対象外）
   */
  async getLatestExerciseSetsMultiple(
    userId: number,
    exerciseIds: number[],
    excludeDate?: string,
  ): Promise<Map<number, LatestExerciseSets>> {
    return this.repository.getLatestExerciseSetsMultiple(userId, exerciseIds, excludeDate)
  }

  /**
   * セット情報が存在する年月の一覧を取得（降順）
   */
  async getAvailableYearMonths(userId: number): Promise<YearMonth[]> {
    const cacheKey = cacheService.buildKey(userId, 'training', 'getAvailableYearMonths')
    return cacheService.through(cacheKey, () => this.repository.getAvailableYearMonths(userId))
  }
}

// シングルトンインスタンス
export const trainingService = new TrainingService()
