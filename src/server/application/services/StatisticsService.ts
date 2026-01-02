import { prisma } from '@/server/infrastructure/database/prisma/client'
import dayjs from 'dayjs'

/** 日別ボリュームデータ */
export type DailyVolume = {
  date: string // YYYY-MM-DD
  volume: number
}

/** 種目別の最大重量推移 */
export type MaxWeightRecord = {
  date: string // YYYY-MM-DD
  weight: number
}

/** 統計サマリー */
export type StatsSummary = {
  totalVolume: number
  totalSets: number
  totalWorkouts: number
  currentStreak: number
  maxStreak: number
}

export class StatisticsService {
  /**
   * 指定期間の日別ボリュームを取得
   */
  async getDailyVolumes(userId: number, startDate: Date, endDate: Date): Promise<DailyVolume[]> {
    const sets = await prisma.set.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    })

    // 日付ごとにボリュームを集計
    const volumeMap = new Map<string, number>()
    for (const set of sets) {
      const dateKey = dayjs(set.date).format('YYYY-MM-DD')
      const volume = set.weight * set.reps
      volumeMap.set(dateKey, (volumeMap.get(dateKey) || 0) + volume)
    }

    // 期間内の全日付を生成（データがない日は 0）
    const result: DailyVolume[] = []
    let current = dayjs(startDate)
    const end = dayjs(endDate)

    while (current.isBefore(end) || current.isSame(end, 'day')) {
      const dateKey = current.format('YYYY-MM-DD')
      result.push({
        date: dateKey,
        volume: volumeMap.get(dateKey) || 0,
      })
      current = current.add(1, 'day')
    }

    return result
  }

  /**
   * 種目別の最大重量推移を取得
   */
  async getMaxWeightHistory(
    userId: number,
    exerciseId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<MaxWeightRecord[]> {
    const sets = await prisma.set.findMany({
      where: {
        userId,
        exerciseId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    })

    // 日付ごとの最大重量を集計
    const maxWeightMap = new Map<string, number>()
    for (const set of sets) {
      const dateKey = dayjs(set.date).format('YYYY-MM-DD')
      const currentMax = maxWeightMap.get(dateKey) || 0
      if (set.weight > currentMax) {
        maxWeightMap.set(dateKey, set.weight)
      }
    }

    return Array.from(maxWeightMap.entries())
      .map(([date, weight]) => ({ date, weight }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * 統計サマリーを取得
   */
  async getSummary(userId: number): Promise<StatsSummary> {
    // 全セット取得
    const sets = await prisma.set.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    })

    if (sets.length === 0) {
      return {
        totalVolume: 0,
        totalSets: 0,
        totalWorkouts: 0,
        currentStreak: 0,
        maxStreak: 0,
      }
    }

    // 総ボリューム
    const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0)

    // 総セット数
    const totalSets = sets.length

    // ユニークな日付数 = トレーニング日数
    const uniqueDates = new Set(sets.map((s) => dayjs(s.date).format('YYYY-MM-DD')))
    const totalWorkouts = uniqueDates.size

    // 継続日数の計算
    const sortedDates = Array.from(uniqueDates).sort().reverse()
    const { currentStreak, maxStreak } = this.calculateStreaks(sortedDates)

    return {
      totalVolume,
      totalSets,
      totalWorkouts,
      currentStreak,
      maxStreak,
    }
  }

  /**
   * 継続日数を計算
   */
  private calculateStreaks(sortedDatesDesc: string[]): {
    currentStreak: number
    maxStreak: number
  } {
    if (sortedDatesDesc.length === 0) {
      return { currentStreak: 0, maxStreak: 0 }
    }

    let currentStreak = 0
    let maxStreak = 0
    let streak = 1

    const today = dayjs().format('YYYY-MM-DD')
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')

    // 現在の継続は今日または昨日から始まっている場合のみカウント
    const latestDate = sortedDatesDesc[0]
    const isCurrentStreakActive = latestDate === today || latestDate === yesterday

    for (let i = 1; i < sortedDatesDesc.length; i++) {
      const currentDate = dayjs(sortedDatesDesc[i - 1])
      const previousDate = dayjs(sortedDatesDesc[i])
      const diff = currentDate.diff(previousDate, 'day')

      if (diff === 1) {
        streak++
      } else {
        if (i === 1 || isCurrentStreakActive) {
          currentStreak = streak
        }
        maxStreak = Math.max(maxStreak, streak)
        streak = 1
      }
    }

    // 最後のストリークを評価
    if (isCurrentStreakActive && currentStreak === 0) {
      currentStreak = streak
    }
    maxStreak = Math.max(maxStreak, streak)

    return { currentStreak, maxStreak }
  }
}

// シングルトンインスタンス
export const statisticsService = new StatisticsService()
