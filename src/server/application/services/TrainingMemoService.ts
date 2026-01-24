import type { TrainingMemo, TrainingMemoInput } from '@/server/domain/entities'
import type { ITrainingMemoRepository } from '@/server/domain/repositories'
import { cacheService } from '@/server/infrastructure/cache'
import { trainingMemoRepository } from '@/server/infrastructure/repositories/prisma'

export class TrainingMemoService {
  constructor(private repository: ITrainingMemoRepository = trainingMemoRepository) {}

  /**
   * 指定日のメモ一覧を取得
   * @param date YYYY-MM-DD形式
   */
  async getMemosByDate(userId: number, date: string): Promise<TrainingMemo[]> {
    const cacheKey = cacheService.buildKey(userId, 'memo', 'getMemosByDate', date)
    return cacheService.through(cacheKey, () => this.repository.findByDate(userId, date))
  }

  /**
   * メモを作成
   * @param date YYYY-MM-DD形式
   */
  async createMemo(userId: number, date: string, content: string): Promise<TrainingMemo> {
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
   * @param date YYYY-MM-DD形式
   */
  async saveMemos(userId: number, date: string, memos: TrainingMemoInput[]): Promise<TrainingMemo[]> {
    const result = await this.repository.saveAll(userId, date, memos)
    // キャッシュを無効化
    await cacheService.invalidateUserDomain(userId, 'memo')
    return result
  }
}

// シングルトンインスタンス
export const trainingMemoService = new TrainingMemoService()
