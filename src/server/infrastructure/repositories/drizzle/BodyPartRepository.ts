import type { BodyPart, BodyPartCategory } from '@/server/domain/entities'
import type { IBodyPartRepository } from '@/server/domain/repositories'
import { asc, eq } from 'drizzle-orm'
import { db } from '../../database/drizzle/client'
import { bodyParts } from '../../database/drizzle/schema'
import { toISOString } from './helper'

export class DrizzleBodyPartRepository implements IBodyPartRepository {
  async findAll(): Promise<BodyPart[]> {
    const rows = await db
      .select()
      .from(bodyParts)
      .orderBy(asc(bodyParts.category), asc(bodyParts.sortIndex))

    return rows.map((bp) => ({
      id: bp.id,
      category: bp.category as BodyPartCategory,
      name: bp.name,
      sortIndex: bp.sortIndex,
      createdAt: toISOString(bp.createdAt),
      updatedAt: toISOString(bp.updatedAt),
    }))
  }

  async findByCategory(category: BodyPartCategory): Promise<BodyPart[]> {
    const rows = await db
      .select()
      .from(bodyParts)
      .where(eq(bodyParts.category, category))
      .orderBy(asc(bodyParts.sortIndex))

    return rows.map((bp) => ({
      id: bp.id,
      category: bp.category as BodyPartCategory,
      name: bp.name,
      sortIndex: bp.sortIndex,
      createdAt: toISOString(bp.createdAt),
      updatedAt: toISOString(bp.updatedAt),
    }))
  }

  async findById(id: number): Promise<BodyPart | null> {
    const rows = await db.select().from(bodyParts).where(eq(bodyParts.id, id)).limit(1)
    const bodyPart = rows[0]

    if (!bodyPart) return null

    return {
      id: bodyPart.id,
      category: bodyPart.category as BodyPartCategory,
      name: bodyPart.name,
      sortIndex: bodyPart.sortIndex,
      createdAt: toISOString(bodyPart.createdAt),
      updatedAt: toISOString(bodyPart.updatedAt),
    }
  }
}

// シングルトンインスタンス
export const bodyPartRepository = new DrizzleBodyPartRepository()
