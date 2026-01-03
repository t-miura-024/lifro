import type { TrainingMemo, TrainingMemoInput } from '@/server/domain/entities'
import type { ITrainingMemoRepository } from '@/server/domain/repositories'
import { trainingMemoRepository } from '@/server/infrastructure/repositories/prisma'

export class TrainingMemoService {
  constructor(private repository: ITrainingMemoRepository = trainingMemoRepository) {}

  /**
   * 指定日のメモ一覧を取得
   */
  async getMemosByDate(userId: number, date: Date): Promise<TrainingMemo[]> {
    return this.repository.findByDate(userId, date)
  }

  /**
   * メモを作成
   */
  async createMemo(userId: number, date: Date, content: string): Promise<TrainingMemo> {
    return this.repository.create(userId, date, content)
  }

  /**
   * メモを更新
   */
  async updateMemo(userId: number, memoId: number, content: string): Promise<TrainingMemo> {
    return this.repository.update(userId, memoId, content)
  }

  /**
   * メモを削除
   */
  async deleteMemo(userId: number, memoId: number): Promise<void> {
    return this.repository.delete(userId, memoId)
  }

  /**
   * メモを一括保存
   */
  async saveMemos(userId: number, date: Date, memos: TrainingMemoInput[]): Promise<TrainingMemo[]> {
    return this.repository.saveAll(userId, date, memos)
  }
}

// シングルトンインスタンス
export const trainingMemoService = new TrainingMemoService()
