import { prisma } from '@/server/infrastructure/database/prisma/client'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

/** 時間粒度 */
export type TimeGranularity = 'day' | 'week' | 'month'

/** 期間ボリュームデータ */
export type PeriodVolume = {
  period: string // YYYY-MM-DD (day), YYYY-Www (week), YYYY-MM (month)
  volume: number
}

/** 種目別ボリュームデータ（積み上げグラフ用） */
export type ExerciseVolumeByPeriod = {
  period: string
  exerciseId: number
  exerciseName: string
  volume: number
  setCount: number
}

/** 種目別ボリューム合計（リスト用） */
export type ExerciseVolumeTotal = {
  exerciseId: number
  exerciseName: string
  volume: number
  setCount: number
}

/** 種目別の最大重量推移 */
export type MaxWeightRecord = {
  period: string
  weight: number
}

/** 種目別の1RM推移 */
export type OneRMRecord = {
  period: string
  oneRM: number
}

/** 統計サマリー */
export type StatsSummary = {
  totalVolume: number
  totalSets: number
  totalWorkouts: number
  currentStreak: number
  maxStreak: number
}

/** 継続統計 */
export type ContinuityStats = {
  totalDays: number
  currentStreakWeeks: number
  currentStreakMonths: number
}

/** 期間ごとのトレーニング日数 */
export type TrainingDaysByPeriod = {
  period: string
  days: number
}

/** 種目別トレーニング日数（リスト用） */
export type ExerciseTrainingDays = {
  exerciseId: number
  exerciseName: string
  days: number
}

export class StatisticsService {
  /**
   * 日付を期間キーに変換
   */
  private formatPeriodKey(date: dayjs.Dayjs, granularity: TimeGranularity): string {
    switch (granularity) {
      case 'day':
        return date.format('YYYY-MM-DD')
      case 'week':
        return `${date.isoWeekYear()}-W${String(date.isoWeek()).padStart(2, '0')}`
      case 'month':
        return date.format('YYYY-MM')
    }
  }

  /**
   * 期間内の全期間キーを生成
   */
  private generatePeriodKeys(
    startDate: Date,
    endDate: Date,
    granularity: TimeGranularity,
  ): string[] {
    const keys: string[] = []
    let current = dayjs(startDate)
    const end = dayjs(endDate)
    const seen = new Set<string>()

    while (current.isBefore(end) || current.isSame(end, 'day')) {
      const key = this.formatPeriodKey(current, granularity)
      if (!seen.has(key)) {
        seen.add(key)
        keys.push(key)
      }
      current = current.add(1, 'day')
    }

    return keys
  }

  /**
   * 種目別ボリュームを期間ごとに取得（積み上げグラフ用）
   */
  async getVolumeByExercise(
    userId: number,
    startDate: Date,
    endDate: Date,
    granularity: TimeGranularity,
  ): Promise<ExerciseVolumeByPeriod[]> {
    const sets = await prisma.set.findMany({
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
      orderBy: { date: 'asc' },
    })

    // 期間 × 種目 でボリュームとセット数を集計
    const volumeMap = new Map<string, { volume: number; setCount: number; exerciseName: string }>()
    for (const set of sets) {
      const periodKey = this.formatPeriodKey(dayjs(set.date), granularity)
      const mapKey = `${periodKey}:${set.exerciseId}`
      const existing = volumeMap.get(mapKey) || {
        volume: 0,
        setCount: 0,
        exerciseName: set.exercise.name,
      }
      volumeMap.set(mapKey, {
        volume: existing.volume + set.weight * set.reps,
        setCount: existing.setCount + 1,
        exerciseName: set.exercise.name,
      })
    }

    const result: ExerciseVolumeByPeriod[] = []
    for (const [mapKey, data] of volumeMap.entries()) {
      const [period, exerciseIdStr] = mapKey.split(':')
      result.push({
        period,
        exerciseId: Number(exerciseIdStr),
        exerciseName: data.exerciseName,
        volume: data.volume,
        setCount: data.setCount,
      })
    }

    return result.sort((a, b) => a.period.localeCompare(b.period))
  }

  /**
   * 種目別ボリューム合計を取得（リスト用、ボリューム降順）
   */
  async getExerciseVolumeTotals(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<ExerciseVolumeTotal[]> {
    const sets = await prisma.set.findMany({
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
    })

    const volumeMap = new Map<number, { volume: number; setCount: number; exerciseName: string }>()
    for (const set of sets) {
      const existing = volumeMap.get(set.exerciseId) || {
        volume: 0,
        setCount: 0,
        exerciseName: set.exercise.name,
      }
      volumeMap.set(set.exerciseId, {
        volume: existing.volume + set.weight * set.reps,
        setCount: existing.setCount + 1,
        exerciseName: set.exercise.name,
      })
    }

    return Array.from(volumeMap.entries())
      .map(([exerciseId, data]) => ({
        exerciseId,
        exerciseName: data.exerciseName,
        volume: data.volume,
        setCount: data.setCount,
      }))
      .sort((a, b) => b.volume - a.volume)
  }

  /**
   * 期間ごとの合計ボリュームを取得
   */
  async getVolumeByPeriod(
    userId: number,
    startDate: Date,
    endDate: Date,
    granularity: TimeGranularity,
  ): Promise<PeriodVolume[]> {
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

    // 期間ごとにボリュームを集計
    const volumeMap = new Map<string, number>()
    for (const set of sets) {
      const periodKey = this.formatPeriodKey(dayjs(set.date), granularity)
      const volume = set.weight * set.reps
      volumeMap.set(periodKey, (volumeMap.get(periodKey) || 0) + volume)
    }

    // 期間内の全期間キーを生成（データがない期間は 0）
    const periodKeys = this.generatePeriodKeys(startDate, endDate, granularity)
    return periodKeys.map((period) => ({
      period,
      volume: volumeMap.get(period) || 0,
    }))
  }

  /**
   * 種目別の最大重量推移を取得
   */
  async getMaxWeightHistory(
    userId: number,
    exerciseId: number,
    startDate: Date,
    endDate: Date,
    granularity: TimeGranularity,
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

    // 期間ごとの最大重量を集計
    const maxWeightMap = new Map<string, number>()
    for (const set of sets) {
      const periodKey = this.formatPeriodKey(dayjs(set.date), granularity)
      const currentMax = maxWeightMap.get(periodKey) || 0
      if (set.weight > currentMax) {
        maxWeightMap.set(periodKey, set.weight)
      }
    }

    // 期間内の全期間キーを生成
    const periodKeys = this.generatePeriodKeys(startDate, endDate, granularity)
    const result: MaxWeightRecord[] = []
    for (const period of periodKeys) {
      const weight = maxWeightMap.get(period)
      if (weight !== undefined) {
        result.push({ period, weight })
      }
    }

    return result
  }

  /**
   * 種目別の1RM推移を取得
   * 1RM = weight × (1 + reps / 29.5)
   */
  async getOneRMHistory(
    userId: number,
    exerciseId: number,
    startDate: Date,
    endDate: Date,
    granularity: TimeGranularity,
  ): Promise<OneRMRecord[]> {
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

    // 期間ごとの最大1RMを集計
    const oneRMMap = new Map<string, number>()
    for (const set of sets) {
      const periodKey = this.formatPeriodKey(dayjs(set.date), granularity)
      const oneRM = set.weight * (1 + set.reps / 29.5)
      const currentMax = oneRMMap.get(periodKey) || 0
      if (oneRM > currentMax) {
        oneRMMap.set(periodKey, oneRM)
      }
    }

    // 期間内の全期間キーを生成
    const periodKeys = this.generatePeriodKeys(startDate, endDate, granularity)
    const result: OneRMRecord[] = []
    for (const period of periodKeys) {
      const oneRM = oneRMMap.get(period)
      if (oneRM !== undefined) {
        result.push({ period, oneRM: Math.round(oneRM * 10) / 10 })
      }
    }

    return result
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
   * 継続統計を取得（日数、連続週数、連続月数）
   */
  async getContinuityStats(userId: number, startDate: Date, endDate: Date): Promise<ContinuityStats> {
    const sets = await prisma.set.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    if (sets.length === 0) {
      return {
        totalDays: 0,
        currentStreakWeeks: 0,
        currentStreakMonths: 0,
      }
    }

    // ユニークな日付
    const uniqueDates = new Set(sets.map((s) => dayjs(s.date).format('YYYY-MM-DD')))
    const totalDays = uniqueDates.size

    // 全期間のデータを取得して週/月の連続を計算
    const allSets = await prisma.set.findMany({
      where: { userId },
    })

    const allUniqueDates = new Set(allSets.map((s) => dayjs(s.date).format('YYYY-MM-DD')))

    // 週ごとのトレーニング有無
    const weeksWithTraining = new Set<string>()
    for (const dateStr of allUniqueDates) {
      const date = dayjs(dateStr)
      weeksWithTraining.add(`${date.isoWeekYear()}-W${String(date.isoWeek()).padStart(2, '0')}`)
    }

    // 月ごとのトレーニング有無
    const monthsWithTraining = new Set<string>()
    for (const dateStr of allUniqueDates) {
      const date = dayjs(dateStr)
      monthsWithTraining.add(date.format('YYYY-MM'))
    }

    const currentStreakWeeks = this.calculatePeriodStreak(
      Array.from(weeksWithTraining).sort().reverse(),
      'week',
    )
    const currentStreakMonths = this.calculatePeriodStreak(
      Array.from(monthsWithTraining).sort().reverse(),
      'month',
    )

    return {
      totalDays,
      currentStreakWeeks,
      currentStreakMonths,
    }
  }

  /**
   * 期間ごとのトレーニング日数を取得（グラフ用）
   */
  async getTrainingDaysByPeriod(
    userId: number,
    startDate: Date,
    endDate: Date,
    granularity: TimeGranularity,
  ): Promise<TrainingDaysByPeriod[]> {
    const sets = await prisma.set.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // 日付ごとにユニークにしてから期間ごとに日数をカウント
    const uniqueDates = new Set(sets.map((s) => dayjs(s.date).format('YYYY-MM-DD')))
    const daysMap = new Map<string, Set<string>>()

    for (const dateStr of uniqueDates) {
      const date = dayjs(dateStr)
      const periodKey = this.formatPeriodKey(date, granularity)
      if (!daysMap.has(periodKey)) {
        daysMap.set(periodKey, new Set())
      }
      daysMap.get(periodKey)!.add(dateStr)
    }

    // 期間内の全期間キーを生成
    const periodKeys = this.generatePeriodKeys(startDate, endDate, granularity)
    return periodKeys.map((period) => ({
      period,
      days: daysMap.get(period)?.size || 0,
    }))
  }

  /**
   * 種目別トレーニング日数を取得（リスト用、日数降順）
   */
  async getExerciseTrainingDays(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<ExerciseTrainingDays[]> {
    const sets = await prisma.set.findMany({
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
    })

    // 種目ごとにユニークな日付をカウント
    const exerciseDaysMap = new Map<number, { name: string; dates: Set<string> }>()
    for (const set of sets) {
      const dateStr = dayjs(set.date).format('YYYY-MM-DD')
      if (!exerciseDaysMap.has(set.exerciseId)) {
        exerciseDaysMap.set(set.exerciseId, { name: set.exercise.name, dates: new Set() })
      }
      exerciseDaysMap.get(set.exerciseId)!.dates.add(dateStr)
    }

    return Array.from(exerciseDaysMap.entries())
      .map(([exerciseId, data]) => ({
        exerciseId,
        exerciseName: data.name,
        days: data.dates.size,
      }))
      .sort((a, b) => b.days - a.days)
  }

  /**
   * 週/月の連続継続を計算
   */
  private calculatePeriodStreak(sortedPeriodsDesc: string[], type: 'week' | 'month'): number {
    if (sortedPeriodsDesc.length === 0) {
      return 0
    }

    const today = dayjs()
    const currentPeriod =
      type === 'week'
        ? `${today.isoWeekYear()}-W${String(today.isoWeek()).padStart(2, '0')}`
        : today.format('YYYY-MM')
    const previousPeriod =
      type === 'week'
        ? `${today.subtract(1, 'week').isoWeekYear()}-W${String(today.subtract(1, 'week').isoWeek()).padStart(2, '0')}`
        : today.subtract(1, 'month').format('YYYY-MM')

    // 現在の期間または前の期間にトレーニングがなければ0
    const latestPeriod = sortedPeriodsDesc[0]
    if (latestPeriod !== currentPeriod && latestPeriod !== previousPeriod) {
      return 0
    }

    let streak = 1
    for (let i = 1; i < sortedPeriodsDesc.length; i++) {
      const current = sortedPeriodsDesc[i - 1]
      const prev = sortedPeriodsDesc[i]

      const expectedPrev = this.getPreviousPeriod(current, type)
      if (prev === expectedPrev) {
        streak++
      } else {
        break
      }
    }

    return streak
  }

  /**
   * 前の期間を取得
   */
  private getPreviousPeriod(period: string, type: 'week' | 'month'): string {
    if (type === 'month') {
      const [year, month] = period.split('-').map(Number)
      const date = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).subtract(1, 'month')
      return date.format('YYYY-MM')
    }
    // week: YYYY-Www
    const match = period.match(/(\d{4})-W(\d{2})/)
    if (!match) return ''
    const [, yearStr, weekStr] = match
    const year = Number(yearStr)
    const week = Number(weekStr)

    // ISO週の前週を計算
    // ISO週番号1の月曜日を基準に計算
    const jan4 = dayjs(`${year}-01-04`)
    const firstMondayOfYear = jan4.subtract(jan4.day() === 0 ? 6 : jan4.day() - 1, 'day')
    const targetMonday = firstMondayOfYear.add((week - 1) * 7, 'day')
    const prevWeekDate = targetMonday.subtract(1, 'week')

    return `${prevWeekDate.isoWeekYear()}-W${String(prevWeekDate.isoWeek()).padStart(2, '0')}`
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
