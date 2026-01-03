import type {
  ExerciseHistory,
  LatestExerciseSets,
  SetInput,
  Training,
  TrainingSummary,
  YearMonth,
} from '@/server/domain/entities'
import type { ITrainingRepository } from '@/server/domain/repositories'
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
    return this.repository.findByMonth(userId, year, month)
  }

  /**
   * 特定日のトレーニング詳細を取得
   */
  async getTrainingByDate(userId: number, date: Date): Promise<Training | null> {
    return this.repository.findByDate(userId, date)
  }

  /**
   * トレーニングを保存
   */
  async saveTraining(userId: number, date: Date, sets: SetInput[]): Promise<Training> {
    // sortIndex が設定されていない場合は自動採番
    const setsWithIndex = sets.map((s, i) => ({
      ...s,
      sortIndex: s.sortIndex ?? i,
    }))
    return this.repository.save(userId, date, setsWithIndex)
  }

  /**
   * トレーニングを削除
   */
  async deleteTraining(userId: number, date: Date): Promise<void> {
    return this.repository.deleteByDate(userId, date)
  }

  /**
   * 種目の前回値を取得
   * @param excludeDate 除外する日付（この日付のセットは対象外）
   */
  async getLatestExerciseHistory(
    userId: number,
    exerciseId: number,
    excludeDate?: Date,
  ): Promise<ExerciseHistory | null> {
    return this.repository.getLatestHistory(userId, exerciseId, excludeDate)
  }

  /**
   * 直近実施日の当該種目の全セットを取得
   * @param excludeDate 除外する日付（この日付のセットは対象外）
   */
  async getLatestExerciseSets(
    userId: number,
    exerciseId: number,
    excludeDate?: Date,
  ): Promise<LatestExerciseSets | null> {
    return this.repository.getLatestExerciseSets(userId, exerciseId, excludeDate)
  }

  /**
   * セット情報が存在する年月の一覧を取得（降順）
   */
  async getAvailableYearMonths(userId: number): Promise<YearMonth[]> {
    return this.repository.getAvailableYearMonths(userId)
  }
}

// シングルトンインスタンス
export const trainingService = new TrainingService()
