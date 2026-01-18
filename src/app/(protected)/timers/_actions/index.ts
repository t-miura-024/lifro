'use server'

import { getServerAuthSession } from '@/auth'
import type { SoundFile } from '@/constants/sounds'
import { timerService } from '@/server/application/services'
import type { Timer, TimerInput } from '@/server/domain/entities'
import type { TimerSortOrderInput } from '@/server/domain/repositories'
import { readdir } from 'fs/promises'
import path from 'path'

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
 * 全タイマーを取得（sortIndex順）
 */
export async function getTimersAction(): Promise<Timer[]> {
  const userId = await getAuthenticatedUserId()
  return timerService.getAllTimers(userId)
}

/**
 * タイマーをIDで取得
 */
export async function getTimerAction(timerId: number): Promise<Timer | null> {
  const userId = await getAuthenticatedUserId()
  return timerService.getTimer(userId, timerId)
}

/**
 * タイマーを新規作成
 */
export async function createTimerAction(input: TimerInput): Promise<Timer> {
  const userId = await getAuthenticatedUserId()
  return timerService.createTimer(userId, input)
}

/**
 * タイマーを更新
 */
export async function updateTimerAction(timerId: number, input: TimerInput): Promise<Timer> {
  const userId = await getAuthenticatedUserId()
  return timerService.updateTimer(userId, timerId, input)
}

/**
 * タイマーの並び順を更新
 */
export async function updateTimerSortOrderAction(timers: TimerSortOrderInput[]): Promise<void> {
  const userId = await getAuthenticatedUserId()
  return timerService.updateSortOrder(userId, timers)
}

/**
 * タイマーを削除
 */
export async function deleteTimerAction(timerId: number): Promise<void> {
  const userId = await getAuthenticatedUserId()
  return timerService.deleteTimer(userId, timerId)
}

/**
 * 音声ファイル一覧を取得
 * public/sounds/ フォルダ内の音声ファイルを読み取る
 */
export async function getSoundFilesAction(): Promise<SoundFile[]> {
  try {
    const soundsDir = path.join(process.cwd(), 'public/sounds')
    const files = await readdir(soundsDir)

    return files
      .filter((f) => /\.(mp3|wav|ogg)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, 'ja'))
      .map((f) => ({
        filename: f,
        name: f.replace(/\.(mp3|wav|ogg)$/i, ''),
      }))
  } catch (error) {
    console.error('Failed to read sounds directory:', error)
    return []
  }
}
