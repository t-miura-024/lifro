import type { Exercise } from '@/server/domain/entities'
import type { IExerciseRepository } from '@/server/domain/repositories'
import { prisma } from '../../database/prisma/client'

export class PrismaExerciseRepository implements IExerciseRepository {
  async findAllByUserId(userId: number): Promise<Exercise[]> {
    const exercises = await prisma.exercise.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    })

    return exercises.map((e) => ({
      id: e.id,
      userId: e.userId,
      name: e.name,
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
      orderBy: { name: 'asc' },
    })

    return exercises.map((e) => ({
      id: e.id,
      userId: e.userId,
      name: e.name,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }))
  }

  async create(userId: number, name: string): Promise<Exercise> {
    const exercise = await prisma.exercise.create({
      data: {
        userId,
        name,
      },
    })

    return {
      id: exercise.id,
      userId: exercise.userId,
      name: exercise.name,
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt,
    }
  }

  async delete(userId: number, exerciseId: number): Promise<void> {
    await prisma.exercise.delete({
      where: {
        id: exerciseId,
        userId, // 所有者チェック
      },
    })
  }
}

// シングルトンインスタンス
export const exerciseRepository = new PrismaExerciseRepository()
