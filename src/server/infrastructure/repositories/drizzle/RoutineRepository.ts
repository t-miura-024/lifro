import type { Routine, RoutineInput, RoutineSet } from '@/server/domain/entities'
import type { IRoutineRepository, RoutineSortOrderInput } from '@/server/domain/repositories'
import { DuplicateRoutineNameError } from '@/server/domain/routine-errors'
import { type SQL, and, asc, eq, inArray, max, sql } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import { db } from '../../database/drizzle/client'
import { routineSets, routines } from '../../database/drizzle/schema'
import { toISOString } from './helper'
import { bulkUpdateSortOrder } from './sort-order-helper'

// Drizzleの行型からドメインエンティティへの変換
type DrizzleRoutineRow = typeof routines.$inferSelect & {
  routineSets: (typeof routineSets.$inferSelect)[]
}

type RoutineSetRow = typeof routineSets.$inferSelect

function toRoutineSet(set: RoutineSetRow): RoutineSet {
  return {
    id: set.id,
    routineId: set.routineId,
    exerciseId: set.exerciseId,
    sortIndex: set.sortIndex,
    targetReps: set.targetReps,
    createdAt: toISOString(set.createdAt),
    updatedAt: toISOString(set.updatedAt),
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
    routineSets: routine.routineSets.map(toRoutineSet).sort((a, b) => a.sortIndex - b.sortIndex),
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
    throw new DuplicateRoutineNameError()
  }
  throw error
}

async function findSetsByRoutineIds(routineIds: number[]): Promise<Map<number, RoutineSetRow[]>> {
  const byRoutineId = new Map<number, RoutineSetRow[]>()
  if (routineIds.length === 0) return byRoutineId

  // D1 の1文あたり bound parameter 上限は 100。routineId 1件あたり1変数なので
  // 90件ごとに分割し、結果を結合する。
  const allRows: RoutineSetRow[] = []
  for (let i = 0; i < routineIds.length; i += 90) {
    const chunk = routineIds.slice(i, i + 90)
    const rows = await db
      .select()
      .from(routineSets)
      .where(inArray(routineSets.routineId, chunk))
      .orderBy(asc(routineSets.sortIndex))
    allRows.push(...rows)
  }

  for (const row of allRows) {
    const list = byRoutineId.get(row.routineId) ?? []
    list.push(row)
    byRoutineId.set(row.routineId, list)
  }
  return byRoutineId
}

async function findRoutineWithSets(
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

  const setsByRoutineId = await findSetsByRoutineIds([routineId])

  return { ...routine, routineSets: setsByRoutineId.get(routineId) ?? [] }
}

/** D1 の1文あたり bound parameter 上限を避けるための1文あたりの行数（6カラム/行） */
const ROUTINE_SETS_PER_STATEMENT = 15

function insertRoutineSets(
  routineId: number | SQL<number>,
  sets: RoutineInput['routineSets'],
  now: Date,
): BatchItem<'sqlite'>[] {
  const statements: BatchItem<'sqlite'>[] = []
  for (let i = 0; i < sets.length; i += ROUTINE_SETS_PER_STATEMENT) {
    const chunk = sets.slice(i, i + ROUTINE_SETS_PER_STATEMENT)
    statements.push(
      db.insert(routineSets).values(
        chunk.map((set, index) => ({
          routineId,
          exerciseId: set.exerciseId,
          sortIndex: i + index,
          targetReps: set.targetReps,
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

    const setsByRoutineId = await findSetsByRoutineIds(routineRows.map((r) => r.id))

    return routineRows.map((routine) =>
      toRoutine({ ...routine, routineSets: setsByRoutineId.get(routine.id) ?? [] }),
    )
  }

  async findById(userId: number, routineId: number): Promise<Routine | null> {
    const routine = await findRoutineWithSets(routineId, userId)
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
    // 2文目以降の routine_id は1文目の結果を待てないため、同一ユーザーの最新行を
    // 参照するサブクエリで補う。last_insert_rowid() は複数行 VALUES で行ごとに
    // 評価され、子行を挿入した時点で自身の rowid を返してしまうため使わない。
    const now = new Date()
    const routineIdRef = sql<number>`(SELECT id FROM routines WHERE user_id = ${userId} ORDER BY id DESC LIMIT 1)`
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
      if (input.routineSets.length === 0) {
        const [[routine]] = await db.batch([insertRoutine])
        if (!routine) throw new Error('Failed to create routine')
        return toRoutine({ ...routine, routineSets: [] })
      }

      const [[routine]] = await db.batch([
        insertRoutine,
        ...insertRoutineSets(routineIdRef, input.routineSets, now),
      ] as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])

      if (!routine) throw new Error('Failed to create routine')

      const created = await findRoutineWithSets(routine.id, userId)
      if (!created) throw new Error('Failed to create routine')

      return toRoutine(created)
    } catch (error) {
      rethrowCreateOrUpdateError(error)
    }
  }

  async update(userId: number, routineId: number, input: RoutineInput): Promise<Routine> {
    // 所有権チェックを兼ねた更新を先に行う（不存在・非所有ならセット行に触れない）。
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

    // セット行は全置換（そのルーティンの行を全削除→再INSERT。ログ保存と同じ方式）。
    const deleteSets = db.delete(routineSets).where(eq(routineSets.routineId, routineId))
    const now = new Date()
    const insertStatements = insertRoutineSets(routineId, input.routineSets, now)

    if (insertStatements.length === 0) {
      await db.batch([deleteSets])
    } else {
      await db.batch([deleteSets, ...insertStatements] as [
        BatchItem<'sqlite'>,
        ...BatchItem<'sqlite'>[],
      ])
    }

    const routine = await findRoutineWithSets(routineId, userId)
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
