import type { Exercise } from '@/server/domain/entities'
import type { ExerciseSortOrderInput, IExerciseRepository } from '@/server/domain/repositories'
import { and, asc, eq, max, sql } from 'drizzle-orm'
import { db } from '../../database/drizzle/client'
import { exercises, sets } from '../../database/drizzle/schema'
import { toISOString } from './helper'
import { bulkUpdateSortOrder } from './sort-order-helper'

/** LIKEパターンの特殊文字（\, %, _）をエスケープする */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

export class DrizzleExerciseRepository implements IExerciseRepository {
  async findAllByUserId(userId: number): Promise<Exercise[]> {
    const rows = await db
      .select()
      .from(exercises)
      .where(eq(exercises.userId, userId))
      .orderBy(asc(exercises.sortIndex))

    return rows.map((e) => ({
      id: e.id,
      userId: e.userId,
      name: e.name,
      sortIndex: e.sortIndex,
      createdAt: toISOString(e.createdAt),
      updatedAt: toISOString(e.updatedAt),
    }))
  }

  async searchByName(userId: number, query: string): Promise<Exercise[]> {
    const pattern = `%${escapeLikePattern(query)}%`
    const rows = await db
      .select()
      .from(exercises)
      .where(
        and(eq(exercises.userId, userId), sql`${exercises.name} COLLATE NOCASE LIKE ${pattern} ESCAPE '\\'`),
      )
      .orderBy(asc(exercises.sortIndex))

    return rows.map((e) => ({
      id: e.id,
      userId: e.userId,
      name: e.name,
      sortIndex: e.sortIndex,
      createdAt: toISOString(e.createdAt),
      updatedAt: toISOString(e.updatedAt),
    }))
  }

  async create(userId: number, name: string): Promise<Exercise> {
    // 現在の最大sortIndexを取得
    const maxRows = await db
      .select({ value: max(exercises.sortIndex) })
      .from(exercises)
      .where(eq(exercises.userId, userId))
    const nextSortIndex = (maxRows[0]?.value ?? -1) + 1

    const [exercise] = await db
      .insert(exercises)
      .values({
        userId,
        name,
        sortIndex: nextSortIndex,
        updatedAt: new Date(),
      })
      .returning()

    if (!exercise) throw new Error('Failed to create exercise')

    return {
      id: exercise.id,
      userId: exercise.userId,
      name: exercise.name,
      sortIndex: exercise.sortIndex,
      createdAt: toISOString(exercise.createdAt),
      updatedAt: toISOString(exercise.updatedAt),
    }
  }

  async update(userId: number, exerciseId: number, name: string): Promise<Exercise> {
    const [exercise] = await db
      .update(exercises)
      .set({ name, updatedAt: new Date() })
      .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)))
      .returning()

    if (!exercise) {
      throw new Error('Exercise not found or not owned by user')
    }

    return {
      id: exercise.id,
      userId: exercise.userId,
      name: exercise.name,
      sortIndex: exercise.sortIndex,
      createdAt: toISOString(exercise.createdAt),
      updatedAt: toISOString(exercise.updatedAt),
    }
  }

  async updateSortOrder(userId: number, exercisesInput: ExerciseSortOrderInput[]): Promise<void> {
    await bulkUpdateSortOrder(
      db,
      'exercises',
      userId,
      exercisesInput,
    )
  }

  async delete(userId: number, exerciseId: number): Promise<void> {
    const [deleted] = await db
      .delete(exercises)
      .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)))
      .returning({ id: exercises.id })

    if (!deleted) {
      throw new Error('Exercise not found or not owned by user')
    }
  }

  async hasRelatedSets(userId: number, exerciseId: number): Promise<boolean> {
    const rows = await db
      .select({ id: sets.id })
      .from(sets)
      .where(and(eq(sets.exerciseId, exerciseId), eq(sets.userId, userId)))
      .limit(1)
    return rows.length > 0
  }
}

// シングルトンインスタンス
export const exerciseRepository = new DrizzleExerciseRepository()
