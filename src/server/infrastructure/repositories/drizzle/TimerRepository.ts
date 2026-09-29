import type { Timer, TimerInput, UnitTimer } from '@/server/domain/entities'
import type { ITimerRepository, TimerSortOrderInput } from '@/server/domain/repositories'
import { and, asc, eq, inArray, max, sql } from 'drizzle-orm'
import { db } from '../../database/drizzle/client'
import { timers, unitTimers } from '../../database/drizzle/schema'
import { toISOString } from './helper'
import { bulkUpdateSortOrder } from './sort-order-helper'

// Drizzleの行型からドメインエンティティへの変換
type DrizzleTimerRow = typeof timers.$inferSelect & {
  unitTimers: (typeof unitTimers.$inferSelect)[]
}

function toUnitTimer(u: typeof unitTimers.$inferSelect): UnitTimer {
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

function toTimer(t: DrizzleTimerRow): Timer {
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

type UnitTimerRow = typeof unitTimers.$inferSelect

async function findUnitsByTimerIds(timerIds: number[]): Promise<Map<number, UnitTimerRow[]>> {
  const byTimerId = new Map<number, UnitTimerRow[]>()
  if (timerIds.length === 0) return byTimerId

  const rows = await db
    .select()
    .from(unitTimers)
    .where(inArray(unitTimers.timerId, timerIds))
    .orderBy(asc(unitTimers.sortIndex))

  for (const row of rows) {
    const list = byTimerId.get(row.timerId) ?? []
    list.push(row)
    byTimerId.set(row.timerId, list)
  }
  return byTimerId
}

async function findTimerWithUnits(
  timerId: number,
  userId?: number,
): Promise<DrizzleTimerRow | null> {
  const timerRows = await db
    .select()
    .from(timers)
    .where(
      userId !== undefined
        ? and(eq(timers.id, timerId), eq(timers.userId, userId))
        : eq(timers.id, timerId),
    )
    .limit(1)
  const timer = timerRows[0]
  if (!timer) return null

  const unitsByTimerId = await findUnitsByTimerIds([timerId])

  return { ...timer, unitTimers: unitsByTimerId.get(timerId) ?? [] }
}

export class DrizzleTimerRepository implements ITimerRepository {
  async findAllByUserId(userId: number): Promise<Timer[]> {
    const timerRows = await db
      .select()
      .from(timers)
      .where(eq(timers.userId, userId))
      .orderBy(asc(timers.sortIndex))

    if (timerRows.length === 0) return []

    // unitTimersをIN一括で取得し、メモリ上でタイマーごとに結合する（旧Prisma版includeと等価）
    const unitsByTimerId = await findUnitsByTimerIds(timerRows.map((t) => t.id))

    return timerRows.map((timer) =>
      toTimer({ ...timer, unitTimers: unitsByTimerId.get(timer.id) ?? [] }),
    )
  }

  async findById(userId: number, timerId: number): Promise<Timer | null> {
    const timer = await findTimerWithUnits(timerId, userId)
    return timer ? toTimer(timer) : null
  }

  async create(userId: number, input: TimerInput): Promise<Timer> {
    // 現在の最大sortIndexを取得（旧Prisma版のaggregateと同様、tx外）
    const maxRows = await db
      .select({ value: max(timers.sortIndex) })
      .from(timers)
      .where(eq(timers.userId, userId))
    const nextSortIndex = (maxRows[0]?.value ?? -1) + 1

    // D1 は SQL の BEGIN/SAVEPOINT 文を拒否する（Cloudflare error 7500）ため
    // db.transaction は使えない。timers+unitTimers の作成は db.batch（D1 側の
    // 暗黙トランザクション）で一体化する。2文目の timer_id は1文目の結果を
    // 待てないため last_insert_rowid()（直前の INSERT の rowid）で参照する。
    const now = new Date()
    const insertTimer = db
      .insert(timers)
      .values({
        userId,
        name: input.name,
        sortIndex: nextSortIndex,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (input.unitTimers.length === 0) {
      const [[timer]] = await db.batch([insertTimer])
      if (!timer) throw new Error('Failed to create timer')
      return toTimer({ ...timer, unitTimers: [] })
    }

    const [[timer], createdUnits] = await db.batch([
      insertTimer,
      db
        .insert(unitTimers)
        .values(
          input.unitTimers.map((u, index) => ({
            timerId: sql<number>`last_insert_rowid()`,
            name: u.name,
            sortIndex: index,
            duration: u.duration,
            countSound: u.countSound,
            countSoundLast3Sec: u.countSoundLast3Sec,
            endSound: u.endSound,
            createdAt: now,
            updatedAt: now,
          })),
        )
        .returning(),
    ])

    if (!timer) throw new Error('Failed to create timer')

    return toTimer({ ...timer, unitTimers: createdUnits })
  }

  async update(userId: number, timerId: number, input: TimerInput): Promise<Timer> {
    // 所有権チェックを兼ねた更新を先に行う（不存在・非所有なら unitTimers に触れない）。
    // D1 は対話的トランザクション（BEGIN/SAVEPOINT）を拒否するため、ユニットタイマーの
    // 全置換（削除+作成）は db.batch に一括して原子性を保つ。
    const [updated] = await db
      .update(timers)
      .set({ name: input.name, updatedAt: new Date() })
      .where(and(eq(timers.id, timerId), eq(timers.userId, userId)))
      .returning()

    if (!updated) {
      throw new Error('Timer not found or not owned by user')
    }

    // 既存のユニットタイマーを削除
    const deleteUnits = db.delete(unitTimers).where(eq(unitTimers.timerId, timerId))

    if (input.unitTimers.length === 0) {
      await db.batch([deleteUnits])
    } else {
      // 削除と新しいユニットタイマーの作成を一括実行する
      const now = new Date()
      await db.batch([
        deleteUnits,
        db.insert(unitTimers).values(
          input.unitTimers.map((u, index) => ({
            timerId,
            name: u.name,
            sortIndex: index,
            duration: u.duration,
            countSound: u.countSound,
            countSoundLast3Sec: u.countSoundLast3Sec,
            endSound: u.endSound,
            createdAt: now,
            updatedAt: now,
          })),
        ),
      ])
    }

    // 更新後のタイマーを取得
    const timer = await findTimerWithUnits(timerId, userId)

    if (!timer) {
      throw new Error('Timer not found')
    }

    return toTimer(timer)
  }

  async updateSortOrder(userId: number, timersInput: TimerSortOrderInput[]): Promise<void> {
    await bulkUpdateSortOrder(db, 'timers', userId, timersInput)
  }

  async delete(userId: number, timerId: number): Promise<void> {
    const [deleted] = await db
      .delete(timers)
      .where(and(eq(timers.id, timerId), eq(timers.userId, userId)))
      .returning({ id: timers.id })

    if (!deleted) {
      throw new Error('Timer not found or not owned by user')
    }
  }
}

// シングルトンインスタンス
export const timerRepository = new DrizzleTimerRepository()
