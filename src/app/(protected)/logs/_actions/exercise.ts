'use server'

import { getServerAuthSession } from '@/auth'
import { exerciseService } from '@/server/application/services'
import type { Exercise } from '@/server/domain/entities'

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
 * 全種目を取得
 */
export async function getExercisesAction(): Promise<Exercise[]> {
  const userId = await getAuthenticatedUserId()
  return exerciseService.getAllExercises(userId)
}

/**
 * 種目を検索
 */
export async function searchExercisesAction(query: string): Promise<Exercise[]> {
  const userId = await getAuthenticatedUserId()
  return exerciseService.searchExercises(userId, query)
}

/**
 * 種目を新規作成
 */
export async function createExerciseAction(name: string): Promise<Exercise> {
  const userId = await getAuthenticatedUserId()
  return exerciseService.createExercise(userId, name)
}

/**
 * 種目を削除
 */
export async function deleteExerciseAction(exerciseId: number): Promise<void> {
  const userId = await getAuthenticatedUserId()
  return exerciseService.deleteExercise(userId, exerciseId)
}
