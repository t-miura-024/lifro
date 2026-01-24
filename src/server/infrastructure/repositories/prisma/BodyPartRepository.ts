import type { BodyPart, BodyPartCategory } from '@/server/domain/entities'
import type { IBodyPartRepository } from '@/server/domain/repositories'
import { prisma } from '../../database/prisma/client'
import { toISOString } from './helper'

export class PrismaBodyPartRepository implements IBodyPartRepository {
  async findAll(): Promise<BodyPart[]> {
    const bodyParts = await prisma.bodyPart.findMany({
      orderBy: [{ category: 'asc' }, { sortIndex: 'asc' }],
    })

    return bodyParts.map((bp) => ({
      id: bp.id,
      category: bp.category as BodyPartCategory,
      name: bp.name,
      sortIndex: bp.sortIndex,
      createdAt: toISOString(bp.createdAt),
      updatedAt: toISOString(bp.updatedAt),
    }))
  }

  async findByCategory(category: BodyPartCategory): Promise<BodyPart[]> {
    const bodyParts = await prisma.bodyPart.findMany({
      where: { category },
      orderBy: { sortIndex: 'asc' },
    })

    return bodyParts.map((bp) => ({
      id: bp.id,
      category: bp.category as BodyPartCategory,
      name: bp.name,
      sortIndex: bp.sortIndex,
      createdAt: toISOString(bp.createdAt),
      updatedAt: toISOString(bp.updatedAt),
    }))
  }

  async findById(id: number): Promise<BodyPart | null> {
    const bodyPart = await prisma.bodyPart.findUnique({
      where: { id },
    })

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
export const bodyPartRepository = new PrismaBodyPartRepository()
