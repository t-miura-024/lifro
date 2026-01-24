import type { Exercise } from '@/server/domain/entities'
import type { ExerciseSortOrderInput, IExerciseRepository } from '@/server/domain/repositories'
import { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma/client'
import { toISOString } from './helper'

export class PrismaExerciseRepository implements IExerciseRepository {
  async findAllByUserId(userId: number): Promise<Exercise[]> {
    const exercises = await prisma.exercise.findMany({
      where: { userId },
      orderBy: { sortIndex: 'asc' },
    })

    return exercises.map((e) => ({
      id: e.id,
      userId: e.userId,
      name: e.name,
      sortIndex: e.sortIndex,
      createdAt: toISOString(e.createdAt),
      updatedAt: toISOString(e.updatedAt),
    }))
  }

  async searchByName(userId: number, query: string): Promise<Exercise[]> {
    const exercises = await prisma.exercise.findMany({
      where: {
        userId,
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: { sortIndex: 'asc' },
    })

    return exercises.map((e) => ({
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
    const maxSortIndex = await prisma.exercise.aggregate({
      where: { userId },
      _max: { sortIndex: true },
    })
    const nextSortIndex = (maxSortIndex._max.sortIndex ?? -1) + 1

    const exercise = await prisma.exercise.create({
      data: {
        userId,
        name,
        sortIndex: nextSortIndex,
      },
    })

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
    const exercise = await prisma.exercise.update({
      where: {
        id: exerciseId,
        userId, // 所有者チェック
      },
      data: { name },
    })

    return {
      id: exercise.id,
      userId: exercise.userId,
      name: exercise.name,
      sortIndex: exercise.sortIndex,
      createdAt: toISOString(exercise.createdAt),
      updatedAt: toISOString(exercise.updatedAt),
    }
  }

  async updateSortOrder(userId: number, exercises: ExerciseSortOrderInput[]): Promise<void> {
    if (exercises.length === 0) return

    // VALUES句を構築: (id, sortIndex), (id, sortIndex), ...
    // Prisma.join を使用してSQLインジェクションを防ぐ
    const values = Prisma.join(
      exercises.map((e) => Prisma.sql`(${e.id}::int, ${e.sortIndex}::int)`),
    )

    // 1回のクエリで一括更新
    await prisma.$executeRaw`
      UPDATE exercises AS e
      SET sort_index = v.sort_index, updated_at = NOW()
      FROM (VALUES ${values}) AS v(id, sort_index)
      WHERE e.id = v.id AND e.user_id = ${userId}
    `
  }

  async delete(userId: number, exerciseId: number): Promise<void> {
    await prisma.exercise.delete({
      where: {
        id: exerciseId,
        userId, // 所有者チェック
      },
    })
  }

  async hasRelatedSets(userId: number, exerciseId: number): Promise<boolean> {
    const count = await prisma.set.count({
      where: {
        exerciseId,
        userId, // 所有者チェック
      },
    })
    return count > 0
  }
}

// シングルトンインスタンス
export const exerciseRepository = new PrismaExerciseRepository()
