import type { TrainingMemo, TrainingMemoInput } from '@/server/domain/entities'
import type { ITrainingMemoRepository } from '@/server/domain/repositories'
import { prisma } from '../../database/prisma/client'

export class PrismaTrainingMemoRepository implements ITrainingMemoRepository {
  async findByDate(userId: number, date: Date): Promise<TrainingMemo[]> {
    const memos = await prisma.trainingMemo.findMany({
      where: {
        userId,
        date,
      },
      orderBy: { createdAt: 'asc' },
    })

    return memos.map((m) => ({
      id: m.id,
      userId: m.userId,
      date: m.date,
      content: m.content,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }))
  }

  async findDatesWithMemoByMonth(userId: number, year: number, month: number): Promise<Date[]> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const memos = await prisma.trainingMemo.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { date: true },
      distinct: ['date'],
    })

    return memos.map((m) => m.date)
  }

  async create(userId: number, date: Date, content: string): Promise<TrainingMemo> {
    const memo = await prisma.trainingMemo.create({
      data: {
        userId,
        date,
        content,
      },
    })

    return {
      id: memo.id,
      userId: memo.userId,
      date: memo.date,
      content: memo.content,
      createdAt: memo.createdAt,
      updatedAt: memo.updatedAt,
    }
  }

  async update(userId: number, memoId: number, content: string): Promise<TrainingMemo> {
    const memo = await prisma.trainingMemo.update({
      where: {
        id: memoId,
        userId,
      },
      data: { content },
    })

    return {
      id: memo.id,
      userId: memo.userId,
      date: memo.date,
      content: memo.content,
      createdAt: memo.createdAt,
      updatedAt: memo.updatedAt,
    }
  }

  async delete(userId: number, memoId: number): Promise<void> {
    await prisma.trainingMemo.delete({
      where: {
        id: memoId,
        userId,
      },
    })
  }

  async saveAll(userId: number, date: Date, memos: TrainingMemoInput[]): Promise<TrainingMemo[]> {
    return await prisma.$transaction(async (tx) => {
      // 既存のメモを取得
      const existingMemos = await tx.trainingMemo.findMany({
        where: { userId, date },
      })

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
        await tx.trainingMemo.deleteMany({
          where: {
            id: { in: toDelete },
            userId,
          },
        })
      }

      // 更新
      for (const memo of toUpdate) {
        await tx.trainingMemo.update({
          where: {
            id: memo.id,
            userId,
          },
          data: { content: memo.content },
        })
      }

      // 新規作成
      if (toCreate.length > 0) {
        await tx.trainingMemo.createMany({
          data: toCreate.map((m) => ({
            userId,
            date,
            content: m.content,
          })),
        })
      }

      // 最新のメモ一覧を取得して返す
      const result = await tx.trainingMemo.findMany({
        where: { userId, date },
        orderBy: { createdAt: 'asc' },
      })

      return result.map((m) => ({
        id: m.id,
        userId: m.userId,
        date: m.date,
        content: m.content,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }))
    })
  }
}

// シングルトンインスタンス
export const trainingMemoRepository = new PrismaTrainingMemoRepository()
