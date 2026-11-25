import type { Routine, RoutineInput, RoutineItem } from '@/server/domain/entities'
import type { IRoutineRepository, RoutineSortOrderInput } from '@/server/domain/repositories'
import { type SQL, and, asc, eq, inArray, max, sql } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import { db } from '../../database/drizzle/client'
import { routineItems, routines } from '../../database/drizzle/schema'
import { toISOString } from './helper'
import { bulkUpdateSortOrder } from './sort-order-helper'

// Drizzleの行型からドメインエンティティへの変換
type DrizzleRoutineRow = typeof routines.$inferSelect & {
  routineItems: (typeof routineItems.$inferSelect)[]
}

type RoutineItemRow = typeof routineItems.$inferSelect

function toRoutineItem(item: RoutineItemRow): RoutineItem {
  return {
    id: item.id,
    routineId: item.routineId,
    exerciseId: item.exerciseId,
    sortIndex: item.sortIndex,
    setCount: item.setCount,
    targetReps: item.targetReps,
    createdAt: toISOString(item.createdAt),
    updatedAt: toISOString(item.updatedAt),
  }
}

function toRoutine(routine: DrizzleRoutineRow): Routine {
  return {
    id: routine.id,
    userId: routine.userId,
    name: routine.name,
    sortIndex: routine.sortIndex,
    createdAt: toISOString(routine.createdAt),
    updatedAt: toISOString(routine.updatedAt),
    routineItems: routine.routineItems.map(toRoutineItem).sort((a, b) => a.sortIndex - b.sortIndex),
  }
}

/**
 * ルーティン名の一意制約違反を、呼び出し側が扱いやすいエラーへ変換する。
 * D1 のエラーは Drizzle にラップされる場合があるため cause も辿る。
 */
function isDuplicateNameError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.message.includes('UNIQUE constraint failed: routines.user_id, routines.name')) {
    return true
  }
  return isDuplicateNameError(error.cause)
}

function rethrowCreateOrUpdateError(error: unknown): never {
  if (isDuplicateNameError(error)) {
    throw new Error('同名のルーティンが既に存在します')
  }
  throw error
}

async function findItemsByRoutineIds(routineIds: number[]): Promise<Map<number, RoutineItemRow[]>> {
  const byRoutineId = new Map<number, RoutineItemRow[]>()
  if (routineIds.length === 0) return byRoutineId

  // D1 の1文あたり bound parameter 上限は 100。routineId 1件あたり1変数なので
  // 90件ごとに分割し、結果を結合する。
  const allRows: RoutineItemRow[] = []
  for (let i = 0; i < routineIds.length; i += 90) {
    const chunk = routineIds.slice(i, i + 90)
    const rows = await db
      .select()
      .from(routineItems)
      .where(inArray(routineItems.routineId, chunk))
      .orderBy(asc(routineItems.sortIndex))
    allRows.push(...rows)
  }

  for (const row of allRows) {
    const list = byRoutineId.get(row.routineId) ?? []
    list.push(row)
    byRoutineId.set(row.routineId, list)
  }
  return byRoutineId
}

async function findRoutineWithItems(
  routineId: number,
  userId?: number,
): Promise<DrizzleRoutineRow | null> {
  const routineRows = await db
    .select()
    .from(routines)
    .where(
      userId !== undefined
        ? and(eq(routines.id, routineId), eq(routines.userId, userId))
        : eq(routines.id, routineId),
    )
    .limit(1)
  const routine = routineRows[0]
  if (!routine) return null

  const itemsByRoutineId = await findItemsByRoutineIds([routineId])

  return { ...routine, routineItems: itemsByRoutineId.get(routineId) ?? [] }
}

/** D1 の1文あたり bound parameter 上限を避けるための1文あたりの行数（7カラム/行） */
const ROUTINE_ITEMS_PER_STATEMENT = 12

function insertRoutineItems(
  routineId: number | SQL<number>,
  items: RoutineInput['routineItems'],
  now: Date,
): BatchItem<'sqlite'>[] {
  const statements: BatchItem<'sqlite'>[] = []
  for (let i = 0; i < items.length; i += ROUTINE_ITEMS_PER_STATEMENT) {
    const chunk = items.slice(i, i + ROUTINE_ITEMS_PER_STATEMENT)
    statements.push(
      db.insert(routineItems).values(
        chunk.map((item, index) => ({
          routineId,
          exerciseId: item.exerciseId,
          sortIndex: i + index,
          setCount: item.setCount,
          targetReps: item.targetReps,
          createdAt: now,
          updatedAt: now,
        })),
      ),
    )
  }
  return statements
}

export class DrizzleRoutineRepository implements IRoutineRepository {
  async findAllByUserId(userId: number): Promise<Routine[]> {
    const routineRows = await db
      .select()
      .from(routines)
      .where(eq(routines.userId, userId))
      .orderBy(asc(routines.sortIndex))

    if (routineRows.length === 0) return []

    const itemsByRoutineId = await findItemsByRoutineIds(routineRows.map((r) => r.id))

    return routineRows.map((routine) =>
      toRoutine({ ...routine, routineItems: itemsByRoutineId.get(routine.id) ?? [] }),
    )
  }

  async findById(userId: number, routineId: number): Promise<Routine | null> {
    const routine = await findRoutineWithItems(routineId, userId)
    return routine ? toRoutine(routine) : null
  }

  async create(userId: number, input: RoutineInput): Promise<Routine> {
    // 現在の最大sortIndexを取得（timers と同じく新規は末尾へ追加）
    const maxRows = await db
      .select({ value: max(routines.sortIndex) })
      .from(routines)
      .where(eq(routines.userId, userId))
    const nextSortIndex = (maxRows[0]?.value ?? -1) + 1

    // D1 は BEGIN/SAVEPOINT を拒否するため db.batch で一体化する。
    // 2文目の routine_id は1文目の結果を待てないため last_insert_rowid() で参照する。
    const now = new Date()
    const insertRoutine = db
      .insert(routines)
      .values({
        userId,
        name: input.name,
        sortIndex: nextSortIndex,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    try {
      if (input.routineItems.length === 0) {
        const [[routine]] = await db.batch([insertRoutine])
        if (!routine) throw new Error('Failed to create routine')
        return toRoutine({ ...routine, routineItems: [] })
      }

      const [[routine], ...createdItemChunks] = await db.batch([
        insertRoutine,
        ...insertRoutineItems(sql<number>`last_insert_rowid()`, input.routineItems, now),
      ] as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])

      if (!routine) throw new Error('Failed to create routine')

      return toRoutine({
        ...routine,
        routineItems: createdItemChunks.flat(),
      })
    } catch (error) {
      rethrowCreateOrUpdateError(error)
    }
  }

  async update(userId: number, routineId: number, input: RoutineInput): Promise<Routine> {
    // 所有権チェックを兼ねた更新を先に行う（不存在・非所有なら項目に触れない）。
    let updated: typeof routines.$inferSelect | undefined
    try {
      const rows = await db
        .update(routines)
        .set({ name: input.name, updatedAt: new Date() })
        .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
        .returning()
      updated = rows[0]
    } catch (error) {
      rethrowCreateOrUpdateError(error)
    }

    if (!updated) {
      throw new Error('Routine not found or not owned by user')
    }

    const deleteItems = db.delete(routineItems).where(eq(routineItems.routineId, routineId))
    const now = new Date()
    const insertStatements = insertRoutineItems(routineId, input.routineItems, now)

    if (insertStatements.length === 0) {
      await db.batch([deleteItems])
    } else {
      await db.batch([deleteItems, ...insertStatements] as [
        BatchItem<'sqlite'>,
        ...BatchItem<'sqlite'>[],
      ])
    }

    const routine = await findRoutineWithItems(routineId, userId)
    if (!routine) {
      throw new Error('Routine not found')
    }

    return toRoutine(routine)
  }

  async updateSortOrder(userId: number, routinesInput: RoutineSortOrderInput[]): Promise<void> {
    await bulkUpdateSortOrder(db, 'routines', userId, routinesInput)
  }

  async delete(userId: number, routineId: number): Promise<void> {
    const [deleted] = await db
      .delete(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
      .returning({ id: routines.id })

    if (!deleted) {
      throw new Error('Routine not found or not owned by user')
    }
  }
}

// シングルトンインスタンス
export const routineRepository = new DrizzleRoutineRepository()
