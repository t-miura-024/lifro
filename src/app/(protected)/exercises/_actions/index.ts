'use server'

import { getServerAuthSession } from '@/auth'
import { exerciseService } from '@/server/application/services'
import type { Exercise } from '@/server/domain/entities'
import type { ExerciseSortOrderInput } from '@/server/domain/repositories'

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
 * 全種目を取得（sortIndex順）
 */
export async function getExercisesAction(): Promise<Exercise[]> {
  const userId = await getAuthenticatedUserId()
  return exerciseService.getAllExercises(userId)
}

/**
 * 種目を新規作成
 */
export async function createExerciseAction(name: string): Promise<Exercise> {
  const userId = await getAuthenticatedUserId()
  return exerciseService.createExercise(userId, name)
}

/**
 * 種目名を更新
 */
export async function updateExerciseAction(exerciseId: number, name: string): Promise<Exercise> {
  const userId = await getAuthenticatedUserId()
  return exerciseService.updateExercise(userId, exerciseId, name)
}

/**
 * 種目の並び順を更新
 */
export async function updateExerciseSortOrderAction(
  exercises: ExerciseSortOrderInput[],
): Promise<void> {
  const userId = await getAuthenticatedUserId()
  return exerciseService.updateSortOrder(userId, exercises)
}

/**
 * 種目を削除可能かチェック
 */
export async function canDeleteExerciseAction(exerciseId: number): Promise<boolean> {
  const userId = await getAuthenticatedUserId()
  return exerciseService.canDelete(userId, exerciseId)
}

/**
 * 種目を削除
 */
export async function deleteExerciseAction(exerciseId: number): Promise<void> {
  const userId = await getAuthenticatedUserId()
  return exerciseService.deleteExercise(userId, exerciseId)
}
