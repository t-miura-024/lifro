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
// ボリュームタブ用アクション
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
  const endDate = customEndDate ? dayjs(customEndDate).toDate() : dayjs().toDate()
  const startDate = customStartDate
    ? dayjs(customStartDate).toDate()
    : getStartDateFromPreset(preset || '1month')

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
  const endDate = customEndDate ? dayjs(customEndDate).toDate() : dayjs().toDate()
  const startDate = customStartDate
    ? dayjs(customStartDate).toDate()
    : getStartDateFromPreset(preset || '1month')

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
  const endDate = customEndDate ? dayjs(customEndDate).toDate() : dayjs().toDate()
  const startDate = customStartDate
    ? dayjs(customStartDate).toDate()
    : getStartDateFromPreset(preset || '1month')

  const totals = await statisticsService.getExerciseVolumeTotals(userId, startDate, endDate)
  return totals.reduce((sum, t) => sum + t.volume, 0)
}

// ========================================
// 重量タブ用アクション
// ========================================

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
  const endDate = customEndDate ? dayjs(customEndDate).toDate() : dayjs().toDate()
  const startDate = customStartDate
    ? dayjs(customStartDate).toDate()
    : getStartDateFromPreset(preset || '3months')

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
  const endDate = customEndDate ? dayjs(customEndDate).toDate() : dayjs().toDate()
  const startDate = customStartDate
    ? dayjs(customStartDate).toDate()
    : getStartDateFromPreset(preset || '3months')

  return statisticsService.getOneRMHistory(userId, exerciseId, startDate, endDate, granularity)
}

// ========================================
// 継続タブ用アクション
// ========================================

/**
 * 継続統計を取得（日数、連続週数、連続月数）
 */
export async function fetchContinuityStatsAction(
  preset?: string,
  customStartDate?: string,
  customEndDate?: string,
): Promise<ContinuityStats> {
  const userId = await getAuthenticatedUserId()
  const endDate = customEndDate ? dayjs(customEndDate).toDate() : dayjs().toDate()
  const startDate = customStartDate
    ? dayjs(customStartDate).toDate()
    : getStartDateFromPreset(preset || '1month')

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
  const endDate = customEndDate ? dayjs(customEndDate).toDate() : dayjs().toDate()
  const startDate = customStartDate
    ? dayjs(customStartDate).toDate()
    : getStartDateFromPreset(preset || '1month')

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
  const endDate = customEndDate ? dayjs(customEndDate).toDate() : dayjs().toDate()
  const startDate = customStartDate
    ? dayjs(customStartDate).toDate()
    : getStartDateFromPreset(preset || '1month')

  return statisticsService.getExerciseTrainingDays(userId, startDate, endDate)
}
