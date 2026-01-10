import type { TrainingMemo, TrainingMemoInput } from '@/server/domain/entities'
import type { ITrainingMemoRepository } from '@/server/domain/repositories'
import { cacheService } from '@/server/infrastructure/cache'
import { trainingMemoRepository } from '@/server/infrastructure/repositories/prisma'

export class TrainingMemoService {
  constructor(private repository: ITrainingMemoRepository = trainingMemoRepository) {}

  /**
   * 指定日のメモ一覧を取得
   */
  async getMemosByDate(userId: number, date: Date): Promise<TrainingMemo[]> {
    const dateStr = date.toISOString().split('T')[0]
    const cacheKey = cacheService.buildKey(userId, 'memo', 'getMemosByDate', dateStr)
    return cacheService.through(cacheKey, () => this.repository.findByDate(userId, date))
  }

  /**
   * メモを作成
   */
  async createMemo(userId: number, date: Date, content: string): Promise<TrainingMemo> {
    const result = await this.repository.create(userId, date, content)
    // キャッシュを無効化
    await cacheService.invalidateUserDomain(userId, 'memo')
    return result
  }

  /**
   * メモを更新
   */
  async updateMemo(userId: number, memoId: number, content: string): Promise<TrainingMemo> {
    const result = await this.repository.update(userId, memoId, content)
    // キャッシュを無効化
    await cacheService.invalidateUserDomain(userId, 'memo')
    return result
  }

  /**
   * メモを削除
   */
  async deleteMemo(userId: number, memoId: number): Promise<void> {
    await this.repository.delete(userId, memoId)
    // キャッシュを無効化
    await cacheService.invalidateUserDomain(userId, 'memo')
  }

  /**
   * メモを一括保存
   */
  async saveMemos(userId: number, date: Date, memos: TrainingMemoInput[]): Promise<TrainingMemo[]> {
    const result = await this.repository.saveAll(userId, date, memos)
    // キャッシュを無効化
    await cacheService.invalidateUserDomain(userId, 'memo')
    return result
  }
}

// シングルトンインスタンス
export const trainingMemoService = new TrainingMemoService()
