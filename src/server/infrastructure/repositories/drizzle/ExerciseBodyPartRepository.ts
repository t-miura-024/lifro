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
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../database/drizzle/client'
import { bodyParts, exerciseBodyParts, exercises } from '../../database/drizzle/schema'
import { toISOString } from './helper'

type BodyPartRow = typeof bodyParts.$inferSelect
type ExerciseBodyPartRow = typeof exerciseBodyParts.$inferSelect & {
  bodyPart: BodyPartRow
}

function toBodyPart(bp: BodyPartRow) {
  return {
    id: bp.id,
    category: bp.category as BodyPartCategory,
    name: bp.name,
    sortIndex: bp.sortIndex,
    createdAt: toISOString(bp.createdAt),
    updatedAt: toISOString(bp.updatedAt),
  }
}

function toExerciseBodyPart(ebp: ExerciseBodyPartRow): ExerciseBodyPart {
  return {
    id: ebp.id,
    exerciseId: ebp.exerciseId,
    bodyPartId: ebp.bodyPartId,
    loadRatio: ebp.loadRatio,
    createdAt: toISOString(ebp.createdAt),
    updatedAt: toISOString(ebp.updatedAt),
    bodyPart: toBodyPart(ebp.bodyPart),
  }
}

export class DrizzleExerciseBodyPartRepository implements IExerciseBodyPartRepository {
  async findByExerciseId(exerciseId: number): Promise<ExerciseBodyPart[]> {
    const rows = await db
      .select({ exerciseBodyPart: exerciseBodyParts, bodyPart: bodyParts })
      .from(exerciseBodyParts)
      .innerJoin(bodyParts, eq(exerciseBodyParts.bodyPartId, bodyParts.id))
      .where(eq(exerciseBodyParts.exerciseId, exerciseId))
      .orderBy(desc(exerciseBodyParts.loadRatio))

    return rows.map((r) =>
      toExerciseBodyPart({ ...r.exerciseBodyPart, bodyPart: r.bodyPart }),
    )
  }

  async saveAll(
    userId: number,
    exerciseId: number,
    bodyPartsInput: ExerciseBodyPartInput[],
  ): Promise<ExerciseBodyPart[]> {
    // 所有者チェック
    const exerciseRows = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)))
      .limit(1)
    if (exerciseRows.length === 0) {
      throw new Error('Exercise not found or not owned by user')
    }

    // 負荷割合の合計が100%かチェック
    const totalRatio = bodyPartsInput.reduce((sum, bp) => sum + bp.loadRatio, 0)
    if (bodyPartsInput.length > 0 && totalRatio !== 100) {
      throw new Error('Total load ratio must be 100%')
    }

    // トランザクションで全置換
    await db.transaction(async (tx) => {
      // 既存の紐付けを削除
      await tx.delete(exerciseBodyParts).where(eq(exerciseBodyParts.exerciseId, exerciseId))

      // 新しい紐付けを作成
      if (bodyPartsInput.length > 0) {
        const now = new Date()
        await tx.insert(exerciseBodyParts).values(
          bodyPartsInput.map((bp) => ({
            exerciseId,
            bodyPartId: bp.bodyPartId,
            loadRatio: bp.loadRatio,
            createdAt: now,
            updatedAt: now,
          })),
        )
      }
    })

    return this.findByExerciseId(exerciseId)
  }

  async findAllWithBodyParts(userId: number): Promise<ExerciseWithBodyParts[]> {
    const exerciseRows = await db
      .select()
      .from(exercises)
      .where(eq(exercises.userId, userId))
      .orderBy(asc(exercises.sortIndex))

    if (exerciseRows.length === 0) return []

    // 紐付けをIN一括で取得し、メモリ上で種目ごとに結合する
    const ebpRows = await db
      .select({ exerciseBodyPart: exerciseBodyParts, bodyPart: bodyParts })
      .from(exerciseBodyParts)
      .innerJoin(bodyParts, eq(exerciseBodyParts.bodyPartId, bodyParts.id))
      .where(
        inArray(
          exerciseBodyParts.exerciseId,
          exerciseRows.map((e) => e.id),
        ),
      )
      .orderBy(desc(exerciseBodyParts.loadRatio))

    const bodyPartsByExerciseId = new Map<number, ExerciseBodyPart[]>()
    for (const r of ebpRows) {
      const list = bodyPartsByExerciseId.get(r.exerciseBodyPart.exerciseId) ?? []
      list.push(toExerciseBodyPart({ ...r.exerciseBodyPart, bodyPart: r.bodyPart }))
      bodyPartsByExerciseId.set(r.exerciseBodyPart.exerciseId, list)
    }

    const result: ExerciseWithBodyParts[] = exerciseRows.map((e) => {
      const bodyPartsList = bodyPartsByExerciseId.get(e.id) ?? []

      // 主要カテゴリ = 負荷割合が最も高い部位のカテゴリ
      const primaryCategory =
        bodyPartsList.length > 0
          ? (bodyPartsList[0].bodyPart?.category as BodyPartCategory)
          : null

      return {
        id: e.id,
        userId: e.userId,
        name: e.name,
        sortIndex: e.sortIndex,
        createdAt: toISOString(e.createdAt),
        updatedAt: toISOString(e.updatedAt),
        bodyParts: bodyPartsList,
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
export const exerciseBodyPartRepository = new DrizzleExerciseBodyPartRepository()
