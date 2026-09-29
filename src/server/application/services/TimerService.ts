import type { Timer, TimerInput } from '@/server/domain/entities'
import type { ITimerRepository, TimerSortOrderInput } from '@/server/domain/repositories'
import { timerRepository } from '@/server/infrastructure/repositories/drizzle'

export class TimerService {
  constructor(private repository: ITimerRepository = timerRepository) {}

  /**
   * ユーザーの全タイマーを取得（sortIndex順）
   */
  async getAllTimers(userId: number): Promise<Timer[]> {
    return this.repository.findAllByUserId(userId)
  }

  /**
   * タイマーをIDで取得
   */
  async getTimer(userId: number, timerId: number): Promise<Timer | null> {
    return this.repository.findById(userId, timerId)
  }

  /**
   * タイマーを作成
   */
  async createTimer(userId: number, input: TimerInput): Promise<Timer> {
    const trimmedName = input.name.trim()
    if (!trimmedName) {
      throw new Error('タイマー名は必須です')
    }
    if (input.unitTimers.length === 0) {
      throw new Error('ユニットタイマーは1つ以上必要です')
    }
    // 各ユニットタイマーのdurationをバリデーション
    for (const unitTimer of input.unitTimers) {
      if (unitTimer.duration <= 0) {
        throw new Error('タイマーの時間は1秒以上必要です')
      }
    }

    const result = await this.repository.create(userId, {
      ...input,
      name: trimmedName,
    })
    return result
  }

  /**
   * タイマーを更新
   */
  async updateTimer(userId: number, timerId: number, input: TimerInput): Promise<Timer> {
    const trimmedName = input.name.trim()
    if (!trimmedName) {
      throw new Error('タイマー名は必須です')
    }
    if (input.unitTimers.length === 0) {
      throw new Error('ユニットタイマーは1つ以上必要です')
    }
    // 各ユニットタイマーのdurationをバリデーション
    for (const unitTimer of input.unitTimers) {
      if (unitTimer.duration <= 0) {
        throw new Error('タイマーの時間は1秒以上必要です')
      }
    }

    const result = await this.repository.update(userId, timerId, {
      ...input,
      name: trimmedName,
    })
    return result
  }

  /**
   * タイマーの並び順を更新
   */
  async updateSortOrder(userId: number, timers: TimerSortOrderInput[]): Promise<void> {
    await this.repository.updateSortOrder(userId, timers)
  }

  /**
   * タイマーを削除
   */
  async deleteTimer(userId: number, timerId: number): Promise<void> {
    await this.repository.delete(userId, timerId)
  }
}

// シングルトンインスタンス
export const timerService = new TimerService()
