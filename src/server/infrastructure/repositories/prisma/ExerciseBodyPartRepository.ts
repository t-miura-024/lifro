import type {
  BodyPartCategory,
  ExerciseBodyPart,
  ExerciseWithBodyParts,
} from '@/server/domain/entities'
import { BodyPartCategoryOrder } from '@/server/domain/entities'
import type {
  ExerciseBodyPartInput,
  IExerciseBodyPartRepository,
} from '@/server/domain/repositories'
import { prisma } from '../../database/prisma/client'
import { toISOString } from './helper'

export class PrismaExerciseBodyPartRepository implements IExerciseBodyPartRepository {
  async findByExerciseId(exerciseId: number): Promise<ExerciseBodyPart[]> {
    const exerciseBodyParts = await prisma.exerciseBodyPart.findMany({
      where: { exerciseId },
      include: { bodyPart: true },
      orderBy: { loadRatio: 'desc' },
    })

    return exerciseBodyParts.map((ebp) => ({
      id: ebp.id,
      exerciseId: ebp.exerciseId,
      bodyPartId: ebp.bodyPartId,
      loadRatio: ebp.loadRatio,
      createdAt: toISOString(ebp.createdAt),
      updatedAt: toISOString(ebp.updatedAt),
      bodyPart: {
        id: ebp.bodyPart.id,
        category: ebp.bodyPart.category as BodyPartCategory,
        name: ebp.bodyPart.name,
        sortIndex: ebp.bodyPart.sortIndex,
        createdAt: toISOString(ebp.bodyPart.createdAt),
        updatedAt: toISOString(ebp.bodyPart.updatedAt),
      },
    }))
  }

  async saveAll(
    userId: number,
    exerciseId: number,
    bodyParts: ExerciseBodyPartInput[],
  ): Promise<ExerciseBodyPart[]> {
    // 所有者チェック
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId, userId },
    })
    if (!exercise) {
      throw new Error('Exercise not found or not owned by user')
    }

    // 負荷割合の合計が100%かチェック
    const totalRatio = bodyParts.reduce((sum, bp) => sum + bp.loadRatio, 0)
    if (bodyParts.length > 0 && totalRatio !== 100) {
      throw new Error('Total load ratio must be 100%')
    }

    // トランザクションで全置換
    await prisma.$transaction(async (tx) => {
      // 既存の紐付けを削除
      await tx.exerciseBodyPart.deleteMany({
        where: { exerciseId },
      })

      // 新しい紐付けを作成
      if (bodyParts.length > 0) {
        await tx.exerciseBodyPart.createMany({
          data: bodyParts.map((bp) => ({
            exerciseId,
            bodyPartId: bp.bodyPartId,
            loadRatio: bp.loadRatio,
          })),
        })
      }
    })

    return this.findByExerciseId(exerciseId)
  }

  async findAllWithBodyParts(userId: number): Promise<ExerciseWithBodyParts[]> {
    const exercises = await prisma.exercise.findMany({
      where: { userId },
      include: {
        exerciseBodyParts: {
          include: { bodyPart: true },
          orderBy: { loadRatio: 'desc' },
        },
      },
      orderBy: { sortIndex: 'asc' },
    })

    const result: ExerciseWithBodyParts[] = exercises.map((e) => {
      const bodyParts = e.exerciseBodyParts.map((ebp) => ({
        id: ebp.id,
        exerciseId: ebp.exerciseId,
        bodyPartId: ebp.bodyPartId,
        loadRatio: ebp.loadRatio,
        createdAt: toISOString(ebp.createdAt),
        updatedAt: toISOString(ebp.updatedAt),
        bodyPart: {
          id: ebp.bodyPart.id,
          category: ebp.bodyPart.category as BodyPartCategory,
          name: ebp.bodyPart.name,
          sortIndex: ebp.bodyPart.sortIndex,
          createdAt: toISOString(ebp.bodyPart.createdAt),
          updatedAt: toISOString(ebp.bodyPart.updatedAt),
        },
      }))

      // 主要カテゴリ = 負荷割合が最も高い部位のカテゴリ
      const primaryCategory =
        bodyParts.length > 0 ? (bodyParts[0].bodyPart?.category as BodyPartCategory) : null

      return {
        id: e.id,
        userId: e.userId,
        name: e.name,
        sortIndex: e.sortIndex,
        createdAt: toISOString(e.createdAt),
        updatedAt: toISOString(e.updatedAt),
        bodyParts,
        primaryCategory,
      }
    })

    // 主要カテゴリ順 → sortIndex順でソート
    result.sort((a, b) => {
      const categoryOrderA = a.primaryCategory
        ? BodyPartCategoryOrder.indexOf(a.primaryCategory)
        : Number.MAX_SAFE_INTEGER
      const categoryOrderB = b.primaryCategory
        ? BodyPartCategoryOrder.indexOf(b.primaryCategory)
        : Number.MAX_SAFE_INTEGER

      if (categoryOrderA !== categoryOrderB) {
        return categoryOrderA - categoryOrderB
      }
      return a.sortIndex - b.sortIndex
    })

    return result
  }
}

// シングルトンインスタンス
export const exerciseBodyPartRepository = new PrismaExerciseBodyPartRepository()
