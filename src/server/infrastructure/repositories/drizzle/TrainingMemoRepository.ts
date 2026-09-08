import type { TrainingMemo, TrainingMemoInput } from '@/server/domain/entities'
import type { ITrainingMemoRepository } from '@/server/domain/repositories'
import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm'
import { db } from '../../database/drizzle/client'
import { trainingMemos } from '../../database/drizzle/schema'
import { toDateString, toISOString } from './helper'
import { toLocalDateString } from '@/server/shared/date-utils'

export class DrizzleTrainingMemoRepository implements ITrainingMemoRepository {
  async findByDate(userId: number, date: string): Promise<TrainingMemo[]> {
    const memos = await db
      .select()
      .from(trainingMemos)
      .where(and(eq(trainingMemos.userId, userId), eq(trainingMemos.date, date)))
      .orderBy(asc(trainingMemos.createdAt))

    return memos.map((m) => ({
      id: m.id,
      userId: m.userId,
      date: toDateString(m.date),
      content: m.content,
      createdAt: toISOString(m.createdAt),
      updatedAt: toISOString(m.updatedAt),
    }))
  }

  async findDatesWithMemoByMonth(userId: number, year: number, month: number): Promise<string[]> {
    const startStr = toLocalDateString(new Date(year, month - 1, 1))
    const endStr = toLocalDateString(new Date(year, month, 0))

    const memos = await db
      .selectDistinct({ date: trainingMemos.date })
      .from(trainingMemos)
      .where(
        and(
          eq(trainingMemos.userId, userId),
          gte(trainingMemos.date, startStr),
          lte(trainingMemos.date, endStr),
        ),
      )

    return memos.map((m) => toDateString(m.date))
  }

  async create(userId: number, date: string, content: string): Promise<TrainingMemo> {
    const [memo] = await db
      .insert(trainingMemos)
      .values({
        userId,
        date,
        content,
        updatedAt: new Date(),
      })
      .returning()

    if (!memo) throw new Error('Failed to create training memo')

    return {
      id: memo.id,
      userId: memo.userId,
      date: toDateString(memo.date),
      content: memo.content,
      createdAt: toISOString(memo.createdAt),
      updatedAt: toISOString(memo.updatedAt),
    }
  }

  async update(userId: number, memoId: number, content: string): Promise<TrainingMemo> {
    const [memo] = await db
      .update(trainingMemos)
      .set({ content, updatedAt: new Date() })
      .where(and(eq(trainingMemos.id, memoId), eq(trainingMemos.userId, userId)))
      .returning()

    if (!memo) {
      throw new Error('Training memo not found or not owned by user')
    }

    return {
      id: memo.id,
      userId: memo.userId,
      date: toDateString(memo.date),
      content: memo.content,
      createdAt: toISOString(memo.createdAt),
      updatedAt: toISOString(memo.updatedAt),
    }
  }

  async delete(userId: number, memoId: number): Promise<void> {
    const [deleted] = await db
      .delete(trainingMemos)
      .where(and(eq(trainingMemos.id, memoId), eq(trainingMemos.userId, userId)))
      .returning({ id: trainingMemos.id })

    if (!deleted) {
      throw new Error('Training memo not found or not owned by user')
    }
  }

  async saveAll(userId: number, date: string, memos: TrainingMemoInput[]): Promise<TrainingMemo[]> {
    return await db.transaction(async (tx) => {
      // 既存のメモを取得
      const existingMemos = await tx
        .select()
        .from(trainingMemos)
        .where(and(eq(trainingMemos.userId, userId), eq(trainingMemos.date, date)))

      const existingIds = existingMemos.map((m) => m.id)
      const inputIds = memos.filter((m) => m.id !== undefined).map((m) => m.id as number)

      // 削除対象: 既存にあって入力にないもの
      const toDelete = existingIds.filter((id) => !inputIds.includes(id))

      // 更新対象: 入力にidがあるもの
      const toUpdate = memos.filter(
        (m) => m.id !== undefined && existingIds.includes(m.id as number),
      )

      // 新規作成対象: 入力にidがないもの
      const toCreate = memos.filter((m) => m.id === undefined)

      // 削除
      if (toDelete.length > 0) {
        await tx
          .delete(trainingMemos)
          .where(and(inArray(trainingMemos.id, toDelete), eq(trainingMemos.userId, userId)))
      }

      // 更新
      for (const memo of toUpdate) {
        await tx
          .update(trainingMemos)
          .set({ content: memo.content, updatedAt: new Date() })
          .where(and(eq(trainingMemos.id, memo.id as number), eq(trainingMemos.userId, userId)))
      }

      // 新規作成
      if (toCreate.length > 0) {
        await tx.insert(trainingMemos).values(
          toCreate.map((m) => ({
            userId,
            date,
            content: m.content,
            updatedAt: new Date(),
          })),
        )
      }

      // 最新のメモ一覧を取得して返す
      const result = await tx
        .select()
        .from(trainingMemos)
        .where(and(eq(trainingMemos.userId, userId), eq(trainingMemos.date, date)))
        .orderBy(asc(trainingMemos.createdAt))

      return result.map((m) => ({
        id: m.id,
        userId: m.userId,
        date: toDateString(m.date),
        content: m.content,
        createdAt: toISOString(m.createdAt),
        updatedAt: toISOString(m.updatedAt),
      }))
    })
  }
}

// シングルトンインスタンス
export const trainingMemoRepository = new DrizzleTrainingMemoRepository()
