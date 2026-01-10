'use server'

import { getServerAuthSession } from '@/auth'
import { exerciseService, statisticsService } from '@/server/application/services'
import type {
  ContinuityStats,
  ExerciseTrainingDays,
  ExerciseVolumeByPeriod,
  ExerciseVolumeTotal,
  MaxWeightRecord,
  OneRMRecord,
  StatsSummary,
  TimeGranularity,
  TrainingDaysByPeriod,
} from '@/server/application/services/StatisticsService'
import type { Exercise } from '@/server/domain/entities'
import dayjs from 'dayjs'

/**
 * 認証済みユーザーIDを取得するヘルパー
 */
async function getAuthenticatedUserId(): Promise<number> {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    throw new Error('認証が必要です')
  }
  return Number(session.user.id)
}

/**
 * プリセット期間から開始日を計算
 */
function getStartDateFromPreset(preset: string): Date {
  const today = dayjs()
  switch (preset) {
    case '1month':
      return today.subtract(1, 'month').toDate()
    case '3months':
      return today.subtract(3, 'month').toDate()
    case '6months':
      return today.subtract(6, 'month').toDate()
    case '1year':
      return today.subtract(1, 'year').toDate()
    case 'all':
      return new Date('2000-01-01')
    default:
      return today.subtract(1, 'month').toDate()
  }
}

/**
 * 日付範囲を計算するヘルパー
 */
function calculateDateRange(
  preset?: string,
  customStartDate?: string,
  customEndDate?: string,
  defaultPreset = '1month',
): { startDate: Date; endDate: Date } {
  const endDate = customEndDate ? dayjs(customEndDate).toDate() : dayjs().toDate()
  const startDate = customStartDate
    ? dayjs(customStartDate).toDate()
    : getStartDateFromPreset(preset || defaultPreset)
  return { startDate, endDate }
}

/**
 * 統計サマリーを取得
 */
export async function fetchStatsSummaryAction(): Promise<StatsSummary> {
  const userId = await getAuthenticatedUserId()
  return statisticsService.getSummary(userId)
}

/**
 * 全種目を取得（グラフの種目選択用）
 */
export async function fetchExercisesForStatsAction(): Promise<Exercise[]> {
  const userId = await getAuthenticatedUserId()
  return exerciseService.getAllExercises(userId)
}

// ========================================
// 統合アクション（タブ単位）
// ========================================

/**
 * ボリュームタブ用の統合データ
 */
export type VolumeTabData = {
  totalVolume: number
  volumeByExercise: ExerciseVolumeByPeriod[]
  exerciseVolumeTotals: ExerciseVolumeTotal[]
}

/**
 * ボリュームタブのデータを一括取得
 */
export async function fetchVolumeTabDataAction(
  granularity: TimeGranularity,
  preset?: string,
  customStartDate?: string,
  customEndDate?: string,
): Promise<VolumeTabData> {
  const userId = await getAuthenticatedUserId()
  const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)

  // 並列でデータを取得（重複クエリを解消）
  const [volumeByExercise, exerciseVolumeTotals] = await Promise.all([
    statisticsService.getVolumeByExercise(userId, startDate, endDate, granularity),
    statisticsService.getExerciseVolumeTotals(userId, startDate, endDate),
  ])

  // totalVolumeはexerciseVolumeTotalsから計算（追加クエリ不要）
  const totalVolume = exerciseVolumeTotals.reduce((sum, t) => sum + t.volume, 0)

  return {
    totalVolume,
    volumeByExercise,
    exerciseVolumeTotals,
  }
}

/**
 * 重量タブ用の統合データ
 */
export type WeightTabData = {
  maxWeightHistory: MaxWeightRecord[]
  oneRMHistory: OneRMRecord[]
}

/**
 * 重量タブのデータを一括取得
 */
export async function fetchWeightTabDataAction(
  exerciseId: number,
  granularity: TimeGranularity,
  preset?: string,
  customStartDate?: string,
  customEndDate?: string,
): Promise<WeightTabData> {
  const userId = await getAuthenticatedUserId()
  const { startDate, endDate } = calculateDateRange(
    preset,
    customStartDate,
    customEndDate,
    '3months',
  )

  // 並列でデータを取得
  const [maxWeightHistory, oneRMHistory] = await Promise.all([
    statisticsService.getMaxWeightHistory(userId, exerciseId, startDate, endDate, granularity),
    statisticsService.getOneRMHistory(userId, exerciseId, startDate, endDate, granularity),
  ])

  return {
    maxWeightHistory,
    oneRMHistory,
  }
}

/**
 * 継続タブ用の統合データ
 */
export type ContinuityTabData = {
  stats: ContinuityStats
  daysByPeriod: TrainingDaysByPeriod[]
  exerciseDays: ExerciseTrainingDays[]
}

/**
 * 継続タブのデータを一括取得
 */
export async function fetchContinuityTabDataAction(
  granularity: TimeGranularity,
  preset?: string,
  customStartDate?: string,
  customEndDate?: string,
): Promise<ContinuityTabData> {
  const userId = await getAuthenticatedUserId()
  const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)

  // 並列でデータを取得
  const [stats, daysByPeriod, exerciseDays] = await Promise.all([
    statisticsService.getContinuityStats(userId, startDate, endDate),
    statisticsService.getTrainingDaysByPeriod(userId, startDate, endDate, granularity),
    statisticsService.getExerciseTrainingDays(userId, startDate, endDate),
  ])

  return {
    stats,
    daysByPeriod,
    exerciseDays,
  }
}

// ========================================
// 個別アクション（後方互換性のため残す）
// ========================================

/**
 * 種目別ボリュームを期間ごとに取得（積み上げグラフ用）
 */
export async function fetchVolumeByExerciseAction(
  granularity: TimeGranularity,
  preset?: string,
  customStartDate?: string,
  customEndDate?: string,
): Promise<ExerciseVolumeByPeriod[]> {
  const userId = await getAuthenticatedUserId()
  const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
  return statisticsService.getVolumeByExercise(userId, startDate, endDate, granularity)
}

/**
 * 種目別ボリューム合計を取得（リスト用）
 */
export async function fetchExerciseVolumeTotalsAction(
  preset?: string,
  customStartDate?: string,
  customEndDate?: string,
): Promise<ExerciseVolumeTotal[]> {
  const userId = await getAuthenticatedUserId()
  const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
  return statisticsService.getExerciseVolumeTotals(userId, startDate, endDate)
}

/**
 * 選択期間の合計ボリュームを取得
 */
export async function fetchTotalVolumeAction(
  preset?: string,
  customStartDate?: string,
  customEndDate?: string,
): Promise<number> {
  const userId = await getAuthenticatedUserId()
  const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
  const totals = await statisticsService.getExerciseVolumeTotals(userId, startDate, endDate)
  return totals.reduce((sum, t) => sum + t.volume, 0)
}

/**
 * 種目別の最大重量推移を取得
 */
export async function fetchMaxWeightHistoryAction(
  exerciseId: number,
  granularity: TimeGranularity,
  preset?: string,
  customStartDate?: string,
  customEndDate?: string,
): Promise<MaxWeightRecord[]> {
  const userId = await getAuthenticatedUserId()
  const { startDate, endDate } = calculateDateRange(
    preset,
    customStartDate,
    customEndDate,
    '3months',
  )
  return statisticsService.getMaxWeightHistory(userId, exerciseId, startDate, endDate, granularity)
}

/**
 * 種目別の1RM推移を取得
 */
export async function fetchOneRMHistoryAction(
  exerciseId: number,
  granularity: TimeGranularity,
  preset?: string,
  customStartDate?: string,
  customEndDate?: string,
): Promise<OneRMRecord[]> {
  const userId = await getAuthenticatedUserId()
  const { startDate, endDate } = calculateDateRange(
    preset,
    customStartDate,
    customEndDate,
    '3months',
  )
  return statisticsService.getOneRMHistory(userId, exerciseId, startDate, endDate, granularity)
}

/**
 * 継続統計を取得（日数、連続週数、連続月数）
 */
export async function fetchContinuityStatsAction(
  preset?: string,
  customStartDate?: string,
  customEndDate?: string,
): Promise<ContinuityStats> {
  const userId = await getAuthenticatedUserId()
  const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
  return statisticsService.getContinuityStats(userId, startDate, endDate)
}

/**
 * 期間ごとのトレーニング日数を取得（グラフ用）
 */
export async function fetchTrainingDaysByPeriodAction(
  granularity: TimeGranularity,
  preset?: string,
  customStartDate?: string,
  customEndDate?: string,
): Promise<TrainingDaysByPeriod[]> {
  const userId = await getAuthenticatedUserId()
  const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
  return statisticsService.getTrainingDaysByPeriod(userId, startDate, endDate, granularity)
}

/**
 * 種目別トレーニング日数を取得（リスト用）
 */
export async function fetchExerciseTrainingDaysAction(
  preset?: string,
  customStartDate?: string,
  customEndDate?: string,
): Promise<ExerciseTrainingDays[]> {
  const userId = await getAuthenticatedUserId()
  const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
  return statisticsService.getExerciseTrainingDays(userId, startDate, endDate)
}
