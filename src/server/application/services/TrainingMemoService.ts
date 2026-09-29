import type { TrainingMemo, TrainingMemoInput } from '@/server/domain/entities'
import type { ITrainingMemoRepository } from '@/server/domain/repositories'
import { trainingMemoRepository } from '@/server/infrastructure/repositories/drizzle'

export class TrainingMemoService {
  constructor(private repository: ITrainingMemoRepository = trainingMemoRepository) {}

  /**
   * 指定日のメモ一覧を取得
   * @param date YYYY-MM-DD形式
   */
  async getMemosByDate(userId: number, date: string): Promise<TrainingMemo[]> {
    return this.repository.findByDate(userId, date)
  }

  /**
   * メモを作成
   * @param date YYYY-MM-DD形式
   */
  async createMemo(userId: number, date: string, content: string): Promise<TrainingMemo> {
    const result = await this.repository.create(userId, date, content)
    return result
  }

  /**
   * メモを更新
   */
  async updateMemo(userId: number, memoId: number, content: string): Promise<TrainingMemo> {
    const result = await this.repository.update(userId, memoId, content)
    return result
  }

  /**
   * メモを削除
   */
  async deleteMemo(userId: number, memoId: number): Promise<void> {
    await this.repository.delete(userId, memoId)
  }

  /**
   * メモを一括保存
   * @param date YYYY-MM-DD形式
   */
  async saveMemos(
    userId: number,
    date: string,
    memos: TrainingMemoInput[],
  ): Promise<TrainingMemo[]> {
    const result = await this.repository.saveAll(userId, date, memos)
    return result
  }
}

// シングルトンインスタンス
export const trainingMemoService = new TrainingMemoService()
