'use server'

import { getServerAuthSession } from '@/auth'
import { trainingMemoService, trainingService } from '@/server/application/services'
import type {
  LatestExerciseSets,
  SetInput,
  Training,
  TrainingMemo,
  TrainingMemoInput,
  TrainingSummary,
  YearMonth,
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
 * セット情報が存在する年月の一覧を取得（降順）
 */
export async function fetchAvailableYearMonthsAction(): Promise<YearMonth[]> {
  const userId = await getAuthenticatedUserId()
  return trainingService.getAvailableYearMonths(userId)
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
 * @param excludeDateStr 除外する日付（この日付のセットは対象外）
 */
export async function fetchExerciseHistoryAction(
  exerciseId: number,
  excludeDateStr?: string,
): Promise<{ weight: number; reps: number } | null> {
  const userId = await getAuthenticatedUserId()
  const excludeDate = excludeDateStr ? new Date(excludeDateStr) : undefined
  const history = await trainingService.getLatestExerciseHistory(userId, exerciseId, excludeDate)
  if (!history) return null
  return { weight: history.weight, reps: history.reps }
}

/**
 * 直近実施日の当該種目の全セットを取得
 * @param excludeDateStr 除外する日付（この日付のセットは対象外）
 */
export async function fetchLatestExerciseSetsAction(
  exerciseId: number,
  excludeDateStr?: string,
): Promise<LatestExerciseSets | null> {
  const userId = await getAuthenticatedUserId()
  const excludeDate = excludeDateStr ? new Date(excludeDateStr) : undefined
  return trainingService.getLatestExerciseSets(userId, exerciseId, excludeDate)
}

/**
 * 指定日にトレーニングが存在するかチェック
 */
export async function checkTrainingExistsAction(dateStr: string): Promise<boolean> {
  const userId = await getAuthenticatedUserId()
  const date = new Date(dateStr)
  const training = await trainingService.getTrainingByDate(userId, date)
  return training !== null && training.sets.length > 0
}

// ========================================
// トレーニングメモ関連のアクション
// ========================================

/**
 * 指定日のメモ一覧を取得
 */
export async function fetchMemosByDateAction(dateStr: string): Promise<TrainingMemo[]> {
  const userId = await getAuthenticatedUserId()
  const date = new Date(dateStr)
  return trainingMemoService.getMemosByDate(userId, date)
}

/**
 * メモを一括保存
 */
export async function saveMemosAction(
  dateStr: string,
  memos: TrainingMemoInput[],
): Promise<TrainingMemo[]> {
  const userId = await getAuthenticatedUserId()
  const date = new Date(dateStr)
  return trainingMemoService.saveMemos(userId, date, memos)
}
