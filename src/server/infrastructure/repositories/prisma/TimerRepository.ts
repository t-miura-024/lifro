import type { Timer, TimerInput, UnitTimer } from '@/server/domain/entities'
import type { ITimerRepository, TimerSortOrderInput } from '@/server/domain/repositories'
import { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma/client'
import { toISOString } from './helper'

// Prismaの型からドメインエンティティへの変換
type PrismaTimer = {
  id: number
  userId: number
  name: string
  sortIndex: number
  createdAt: Date
  updatedAt: Date
  unitTimers: PrismaUnitTimer[]
}

type PrismaUnitTimer = {
  id: number
  timerId: number
  name: string | null
  sortIndex: number
  duration: number
  countSound: string | null
  countSoundLast3Sec: string | null
  endSound: string | null
  createdAt: Date
  updatedAt: Date
}

function toUnitTimer(u: PrismaUnitTimer): UnitTimer {
  return {
    id: u.id,
    timerId: u.timerId,
    name: u.name,
    sortIndex: u.sortIndex,
    duration: u.duration,
    countSound: u.countSound,
    countSoundLast3Sec: u.countSoundLast3Sec,
    endSound: u.endSound,
    createdAt: toISOString(u.createdAt),
    updatedAt: toISOString(u.updatedAt),
  }
}

function toTimer(t: PrismaTimer): Timer {
  return {
    id: t.id,
    userId: t.userId,
    name: t.name,
    sortIndex: t.sortIndex,
    createdAt: toISOString(t.createdAt),
    updatedAt: toISOString(t.updatedAt),
    unitTimers: t.unitTimers.map(toUnitTimer).sort((a, b) => a.sortIndex - b.sortIndex),
  }
}

export class PrismaTimerRepository implements ITimerRepository {
  async findAllByUserId(userId: number): Promise<Timer[]> {
    const timers = await prisma.timer.findMany({
      where: { userId },
      orderBy: { sortIndex: 'asc' },
      include: {
        unitTimers: {
          orderBy: { sortIndex: 'asc' },
        },
      },
    })

    return timers.map(toTimer)
  }

  async findById(userId: number, timerId: number): Promise<Timer | null> {
    const timer = await prisma.timer.findUnique({
      where: {
        id: timerId,
        userId, // 所有者チェック
      },
      include: {
        unitTimers: {
          orderBy: { sortIndex: 'asc' },
        },
      },
    })

    return timer ? toTimer(timer) : null
  }

  async create(userId: number, input: TimerInput): Promise<Timer> {
    // 現在の最大sortIndexを取得
    const maxSortIndex = await prisma.timer.aggregate({
      where: { userId },
      _max: { sortIndex: true },
    })
    const nextSortIndex = (maxSortIndex._max.sortIndex ?? -1) + 1

    const timer = await prisma.timer.create({
      data: {
        userId,
        name: input.name,
        sortIndex: nextSortIndex,
        unitTimers: {
          create: input.unitTimers.map((u, index) => ({
            name: u.name,
            sortIndex: index,
            duration: u.duration,
            countSound: u.countSound,
            countSoundLast3Sec: u.countSoundLast3Sec,
            endSound: u.endSound,
          })),
        },
      },
      include: {
        unitTimers: {
          orderBy: { sortIndex: 'asc' },
        },
      },
    })

    return toTimer(timer)
  }

  async update(userId: number, timerId: number, input: TimerInput): Promise<Timer> {
    // トランザクションで更新
    const timer = await prisma.$transaction(async (tx) => {
      // タイマー本体を更新
      await tx.timer.update({
        where: {
          id: timerId,
          userId, // 所有者チェック
        },
        data: {
          name: input.name,
        },
      })

      // 既存のユニットタイマーを削除
      await tx.unitTimer.deleteMany({
        where: { timerId },
      })

      // 新しいユニットタイマーを作成
      await tx.unitTimer.createMany({
        data: input.unitTimers.map((u, index) => ({
          timerId,
          name: u.name,
          sortIndex: index,
          duration: u.duration,
          countSound: u.countSound,
          countSoundLast3Sec: u.countSoundLast3Sec,
          endSound: u.endSound,
        })),
      })

      // 更新後のタイマーを取得
      return tx.timer.findUnique({
        where: { id: timerId },
        include: {
          unitTimers: {
            orderBy: { sortIndex: 'asc' },
          },
        },
      })
    })

    if (!timer) {
      throw new Error('Timer not found')
    }

    return toTimer(timer)
  }

  async updateSortOrder(userId: number, timers: TimerSortOrderInput[]): Promise<void> {
    if (timers.length === 0) return

    // VALUES句を構築: (id, sortIndex), (id, sortIndex), ...
    const values = Prisma.join(
      timers.map((t) => Prisma.sql`(${t.id}::int, ${t.sortIndex}::int)`),
    )

    // 1回のクエリで一括更新
    await prisma.$executeRaw`
      UPDATE timers AS t
      SET sort_index = v.sort_index, updated_at = NOW()
      FROM (VALUES ${values}) AS v(id, sort_index)
      WHERE t.id = v.id AND t.user_id = ${userId}
    `
  }

  async delete(userId: number, timerId: number): Promise<void> {
    await prisma.timer.delete({
      where: {
        id: timerId,
        userId, // 所有者チェック
      },
    })
  }
}

// シングルトンインスタンス
export const timerRepository = new PrismaTimerRepository()
