import type {
  ExerciseHistory,
  LatestExerciseSets,
  SetInput,
  Training,
  TrainingSummary,
  YearMonth,
} from '@/server/domain/entities'
import type { ITrainingRepository } from '@/server/domain/repositories'
import { prisma } from '../../database/prisma/client'

export class PrismaTrainingRepository implements ITrainingRepository {
  async findByMonth(userId: number, year: number, month: number): Promise<TrainingSummary[]> {
    // 月の開始日と終了日を計算
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // 月末日

    // セットとメモを並列で取得
    const [sets, memos] = await Promise.all([
      prisma.set.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          exercise: true,
        },
        orderBy: [{ date: 'desc' }, { sortIndex: 'asc' }],
      }),
      prisma.trainingMemo.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: { date: true },
        distinct: ['date'],
      }),
    ])

    // メモがある日付のセット
    const datesWithMemo = new Set(memos.map((m) => m.date.toISOString().split('T')[0]))

    // 日付ごとにグループ化して集約
    const grouped = new Map<string, typeof sets>()
    for (const set of sets) {
      const dateKey = set.date.toISOString().split('T')[0]
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, [])
      }
      grouped.get(dateKey)?.push(set)
    }

    const summaries: TrainingSummary[] = []
    for (const [dateKey, dateSets] of grouped) {
      const exerciseNames = [...new Set(dateSets.map((s) => s.exercise.name))]
      const totalVolume = dateSets.reduce((sum, s) => sum + s.weight * s.reps, 0)
      summaries.push({
        date: new Date(dateKey),
        exerciseNames,
        totalVolume,
        setCount: dateSets.length,
        hasMemo: datesWithMemo.has(dateKey),
      })
    }

    return summaries
  }

  async findByDate(userId: number, date: Date): Promise<Training | null> {
    const sets = await prisma.set.findMany({
      where: {
        userId,
        date,
      },
      include: {
        exercise: true,
      },
      orderBy: { sortIndex: 'asc' },
    })

    if (sets.length === 0) {
      return null
    }

    return {
      date,
      userId,
      sets: sets.map((s) => ({
        id: s.id,
        exerciseId: s.exerciseId,
        userId: s.userId,
        weight: s.weight,
        reps: s.reps,
        date: s.date,
        sortIndex: s.sortIndex,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        exercise: {
          id: s.exercise.id,
          userId: s.exercise.userId,
          name: s.exercise.name,
          sortIndex: s.exercise.sortIndex,
          createdAt: s.exercise.createdAt,
          updatedAt: s.exercise.updatedAt,
        },
      })),
    }
  }

  async save(userId: number, date: Date, sets: SetInput[]): Promise<Training> {
    // トランザクションで既存セットの削除と新規セットの作成を行う
    await prisma.$transaction(async (tx) => {
      // 既存のセットを削除
      await tx.set.deleteMany({
        where: { userId, date },
      })

      // 新規セットを作成
      if (sets.length > 0) {
        await tx.set.createMany({
          data: sets.map((s) => ({
            exerciseId: s.exerciseId,
            userId,
            weight: s.weight,
            reps: s.reps,
            date,
            sortIndex: s.sortIndex,
          })),
        })
      }
    })

    // 保存後のデータを取得して返す
    const result = await this.findByDate(userId, date)
    return result ?? { date, userId, sets: [] }
  }

  async deleteByDate(userId: number, date: Date): Promise<void> {
    await prisma.set.deleteMany({
      where: { userId, date },
    })
  }

  async getLatestHistory(
    userId: number,
    exerciseId: number,
    excludeDate?: Date,
  ): Promise<ExerciseHistory | null> {
    // 指定種目の最新セットを取得
    const latestSet = await prisma.set.findFirst({
      where: {
        userId,
        exerciseId,
        ...(excludeDate && {
          date: { not: excludeDate },
        }),
      },
      include: {
        exercise: true,
      },
      orderBy: [{ date: 'desc' }, { sortIndex: 'desc' }],
    })

    if (!latestSet) {
      return null
    }

    return {
      exerciseId: latestSet.exerciseId,
      exerciseName: latestSet.exercise.name,
      weight: latestSet.weight,
      reps: latestSet.reps,
      date: latestSet.date,
    }
  }

  async getLatestExerciseSets(
    userId: number,
    exerciseId: number,
    excludeDate?: Date,
  ): Promise<LatestExerciseSets | null> {
    // 指定種目の最新実施日を取得
    const latestSet = await prisma.set.findFirst({
      where: {
        userId,
        exerciseId,
        ...(excludeDate && {
          date: { not: excludeDate },
        }),
      },
      orderBy: [{ date: 'desc' }],
    })

    if (!latestSet) {
      return null
    }

    // その日の当該種目の全セットを取得
    const sets = await prisma.set.findMany({
      where: {
        userId,
        exerciseId,
        date: latestSet.date,
      },
      include: {
        exercise: true,
      },
      orderBy: { sortIndex: 'asc' },
    })

    if (sets.length === 0) {
      return null
    }

    return {
      exerciseId: sets[0].exerciseId,
      exerciseName: sets[0].exercise.name,
      date: sets[0].date,
      sets: sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        sortIndex: s.sortIndex,
      })),
    }
  }

  async getAvailableYearMonths(userId: number): Promise<YearMonth[]> {
    // セットが存在する日付を取得し、年月でグループ化
    const dates = await prisma.set.findMany({
      where: { userId },
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'desc' },
    })

    // 年月でユニーク化（降順を維持）
    const yearMonthSet = new Set<string>()
    const result: YearMonth[] = []

    for (const { date } of dates) {
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const key = `${year}-${month}`
      if (!yearMonthSet.has(key)) {
        yearMonthSet.add(key)
        result.push({ year, month })
      }
    }

    return result
  }
}

// シングルトンインスタンス
export const trainingRepository = new PrismaTrainingRepository()
