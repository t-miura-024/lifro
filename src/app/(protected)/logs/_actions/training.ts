'use server'

import { getServerAuthSession } from '@/auth'
import { trainingService } from '@/server/application/services'
import type {
  LatestExerciseSets,
  SetInput,
  Training,
  TrainingSummary,
} from '@/server/domain/entities'

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
 * 指定月のトレーニング一覧を取得
 */
export async function fetchTrainingsAction(
  year: number,
  month: number,
): Promise<TrainingSummary[]> {
  const userId = await getAuthenticatedUserId()
  return trainingService.getMonthlyTrainings(userId, year, month)
}

/**
 * 特定日のトレーニング詳細を取得
 */
export async function fetchTrainingByDateAction(dateStr: string): Promise<Training | null> {
  const userId = await getAuthenticatedUserId()
  const date = new Date(dateStr)
  return trainingService.getTrainingByDate(userId, date)
}

/**
 * トレーニングを保存（新規作成・更新）
 */
export async function upsertTrainingAction(dateStr: string, sets: SetInput[]): Promise<Training> {
  const userId = await getAuthenticatedUserId()
  const date = new Date(dateStr)
  return trainingService.saveTraining(userId, date, sets)
}

/**
 * トレーニングを削除
 */
export async function deleteTrainingAction(dateStr: string): Promise<void> {
  const userId = await getAuthenticatedUserId()
  const date = new Date(dateStr)
  return trainingService.deleteTraining(userId, date)
}

/**
 * 種目の前回値を取得
 */
export async function fetchExerciseHistoryAction(
  exerciseId: number,
): Promise<{ weight: number; reps: number } | null> {
  const userId = await getAuthenticatedUserId()
  const history = await trainingService.getLatestExerciseHistory(userId, exerciseId)
  if (!history) return null
  return { weight: history.weight, reps: history.reps }
}

/**
 * 直近実施日の当該種目の全セットを取得
 */
export async function fetchLatestExerciseSetsAction(
  exerciseId: number,
): Promise<LatestExerciseSets | null> {
  const userId = await getAuthenticatedUserId()
  return trainingService.getLatestExerciseSets(userId, exerciseId)
}
