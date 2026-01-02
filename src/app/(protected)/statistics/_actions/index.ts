'use server'

import { getServerAuthSession } from '@/auth'
import { statisticsService } from '@/server/application/services'
import { exerciseService } from '@/server/application/services'
import type {
  DailyVolume,
  MaxWeightRecord,
  StatsSummary,
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
 * 統計サマリーを取得
 */
export async function fetchStatsSummaryAction(): Promise<StatsSummary> {
  const userId = await getAuthenticatedUserId()
  return statisticsService.getSummary(userId)
}

/**
 * 指定期間の日別ボリュームを取得
 */
export async function fetchDailyVolumesAction(days = 30): Promise<DailyVolume[]> {
  const userId = await getAuthenticatedUserId()
  const endDate = dayjs().toDate()
  const startDate = dayjs()
    .subtract(days - 1, 'day')
    .toDate()
  return statisticsService.getDailyVolumes(userId, startDate, endDate)
}

/**
 * 種目別の最大重量推移を取得
 */
export async function fetchMaxWeightHistoryAction(
  exerciseId: number,
  days = 90,
): Promise<MaxWeightRecord[]> {
  const userId = await getAuthenticatedUserId()
  const endDate = dayjs().toDate()
  const startDate = dayjs()
    .subtract(days - 1, 'day')
    .toDate()
  return statisticsService.getMaxWeightHistory(userId, exerciseId, startDate, endDate)
}

/**
 * 全種目を取得（グラフの種目選択用）
 */
export async function fetchExercisesForStatsAction(): Promise<Exercise[]> {
  const userId = await getAuthenticatedUserId()
  return exerciseService.getAllExercises(userId)
}
