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
import type { BatchItem } from 'drizzle-orm/batch'
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

    return rows.map((r) => toExerciseBodyPart({ ...r.exerciseBodyPart, bodyPart: r.bodyPart }))
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

    // D1 は SQL の BEGIN/SAVEPOINT 文を拒否する（Cloudflare error 7500）ため
    // db.transaction は使えない。全置換の原子性は、D1 側で暗黙の
    // トランザクションとして実行される db.batch で保つ。
    const deleteExisting = db
      .delete(exerciseBodyParts)
      .where(eq(exerciseBodyParts.exerciseId, exerciseId))

    if (bodyPartsInput.length === 0) {
      // 既存の紐付けの削除のみ
      await db.batch([deleteExisting])
    } else {
      const now = new Date()
      // D1 の1文あたり bound parameter 上限は 100。1行あたり5カラムなので
      // 20 行まで。それ以上は複数の INSERT 文に分割し、同じ batch で原子性を保つ。
      const rowsPerStatement = 18
      const statements: BatchItem<'sqlite'>[] = [deleteExisting]
      for (let i = 0; i < bodyPartsInput.length; i += rowsPerStatement) {
        const chunk = bodyPartsInput.slice(i, i + rowsPerStatement)
        statements.push(
          db.insert(exerciseBodyParts).values(
            chunk.map((bp) => ({
              exerciseId,
              bodyPartId: bp.bodyPartId,
              loadRatio: bp.loadRatio,
              createdAt: now,
              updatedAt: now,
            })),
          ),
        )
      }
      await db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])
    }

    return this.findByExerciseId(exerciseId)
  }

  async findAllWithBodyParts(userId: number): Promise<ExerciseWithBodyParts[]> {
    const exerciseRows = await db
      .select()
      .from(exercises)
      .where(eq(exercises.userId, userId))
      .orderBy(asc(exercises.sortIndex))

    if (exerciseRows.length === 0) return []

    // 紐付けを取得し、メモリ上で種目ごとに結合する。
    // D1 の1文あたり bound parameter 上限を避けるため、exercise id の IN は
    // 使わず、所有者（userId）で結合して絞り込む。
    const ebpRows = await db
      .select({ exerciseBodyPart: exerciseBodyParts, bodyPart: bodyParts })
      .from(exerciseBodyParts)
      .innerJoin(bodyParts, eq(exerciseBodyParts.bodyPartId, bodyParts.id))
      .innerJoin(exercises, eq(exerciseBodyParts.exerciseId, exercises.id))
      .where(eq(exercises.userId, userId))
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
        bodyPartsList.length > 0 ? (bodyPartsList[0].bodyPart?.category as BodyPartCategory) : null

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
