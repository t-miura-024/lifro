import type { Exercise } from '@/server/domain/entities'
import type { ExerciseSortOrderInput, IExerciseRepository } from '@/server/domain/repositories'
import { prisma } from '../../database/prisma/client'

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
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
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
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
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
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt,
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
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt,
    }
  }

  async updateSortOrder(userId: number, exercises: ExerciseSortOrderInput[]): Promise<void> {
    await prisma.$transaction(
      exercises.map((e) =>
        prisma.exercise.update({
          where: {
            id: e.id,
            userId, // 所有者チェック
          },
          data: { sortIndex: e.sortIndex },
        }),
      ),
    )
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
