import { Prisma } from '@prisma/client'
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
   * PostgreSQL用の期間フォーマット文字列を取得（Prisma.rawで使用）
   */
  private getPeriodFormatSql(granularity: TimeGranularity): Prisma.Sql {
    switch (granularity) {
      case 'day':
        return Prisma.raw("'YYYY-MM-DD'")
      case 'week':
        return Prisma.raw("'IYYY-\"W\"IW'")
      case 'month':
        return Prisma.raw("'YYYY-MM'")
    }
  }

  /**
   * 期間内の全期間キーを生成（最適化版）
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

    // 粒度に応じたステップで進む
    const step = granularity === 'day' ? 'day' : granularity === 'week' ? 'week' : 'month'

    while (current.isBefore(end) || current.isSame(end, 'day')) {
      const key = this.formatPeriodKey(current, granularity)
      if (!seen.has(key)) {
        seen.add(key)
        keys.push(key)
      }
      current = current.add(1, step)
    }

    return keys
  }

  /**
   * 種目別ボリュームを期間ごとに取得（積み上げグラフ用）
   * SQL集計版
   */
  async getVolumeByExercise(
    userId: number,
    startDate: Date,
    endDate: Date,
    granularity: TimeGranularity,
  ): Promise<ExerciseVolumeByPeriod[]> {
    const periodFormatSql = this.getPeriodFormatSql(granularity)

    const results = await prisma.$queryRaw<
      Array<{
        period: string
        exercise_id: number
        exercise_name: string
        volume: number
        set_count: bigint
      }>
    >`
      SELECT
        to_char(s.date, ${periodFormatSql}) as period,
        s.exercise_id,
        e.name as exercise_name,
        SUM(s.weight * s.reps)::float as volume,
        COUNT(*)::bigint as set_count
      FROM sets s
      JOIN exercises e ON e.id = s.exercise_id
      WHERE s.user_id = ${userId}
        AND s.date >= ${startDate}
        AND s.date <= ${endDate}
      GROUP BY 1, s.exercise_id, e.name
      ORDER BY period ASC
    `

    return results.map((r) => ({
      period: r.period,
      exerciseId: r.exercise_id,
      exerciseName: r.exercise_name,
      volume: r.volume,
      setCount: Number(r.set_count),
    }))
  }

  /**
   * 種目別ボリューム合計を取得（リスト用、ボリューム降順）
   * SQL集計版
   */
  async getExerciseVolumeTotals(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<ExerciseVolumeTotal[]> {
    const results = await prisma.$queryRaw<
      Array<{
        exercise_id: number
        exercise_name: string
        volume: number
        set_count: bigint
      }>
    >`
      SELECT
        s.exercise_id,
        e.name as exercise_name,
        SUM(s.weight * s.reps)::float as volume,
        COUNT(*)::bigint as set_count
      FROM sets s
      JOIN exercises e ON e.id = s.exercise_id
      WHERE s.user_id = ${userId}
        AND s.date >= ${startDate}
        AND s.date <= ${endDate}
      GROUP BY s.exercise_id, e.name
      ORDER BY volume DESC
    `

    return results.map((r) => ({
      exerciseId: r.exercise_id,
      exerciseName: r.exercise_name,
      volume: r.volume,
      setCount: Number(r.set_count),
    }))
  }

  /**
   * 期間ごとの合計ボリュームを取得
   * SQL集計版
   */
  async getVolumeByPeriod(
    userId: number,
    startDate: Date,
    endDate: Date,
    granularity: TimeGranularity,
  ): Promise<PeriodVolume[]> {
    const periodFormatSql = this.getPeriodFormatSql(granularity)

    const results = await prisma.$queryRaw<
      Array<{
        period: string
        volume: number
      }>
    >`
      SELECT
        to_char(date, ${periodFormatSql}) as period,
        SUM(weight * reps)::float as volume
      FROM sets
      WHERE user_id = ${userId}
        AND date >= ${startDate}
        AND date <= ${endDate}
      GROUP BY 1
    `

    // 結果をMapに変換
    const volumeMap = new Map<string, number>()
    for (const r of results) {
      volumeMap.set(r.period, r.volume)
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
   * SQL集計版
   */
  async getMaxWeightHistory(
    userId: number,
    exerciseId: number,
    startDate: Date,
    endDate: Date,
    granularity: TimeGranularity,
  ): Promise<MaxWeightRecord[]> {
    const periodFormatSql = this.getPeriodFormatSql(granularity)

    const results = await prisma.$queryRaw<
      Array<{
        period: string
        max_weight: number
      }>
    >`
      SELECT
        to_char(date, ${periodFormatSql}) as period,
        MAX(weight)::float as max_weight
      FROM sets
      WHERE user_id = ${userId}
        AND exercise_id = ${exerciseId}
        AND date >= ${startDate}
        AND date <= ${endDate}
      GROUP BY 1
      ORDER BY period ASC
    `

    // 結果をMapに変換
    const maxWeightMap = new Map<string, number>()
    for (const r of results) {
      maxWeightMap.set(r.period, r.max_weight)
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
   * SQL集計版
   */
  async getOneRMHistory(
    userId: number,
    exerciseId: number,
    startDate: Date,
    endDate: Date,
    granularity: TimeGranularity,
  ): Promise<OneRMRecord[]> {
    const periodFormatSql = this.getPeriodFormatSql(granularity)

    const results = await prisma.$queryRaw<
      Array<{
        period: string
        max_one_rm: number
      }>
    >`
      SELECT
        to_char(date, ${periodFormatSql}) as period,
        MAX(weight * (1 + reps / 29.5))::float as max_one_rm
      FROM sets
      WHERE user_id = ${userId}
        AND exercise_id = ${exerciseId}
        AND date >= ${startDate}
        AND date <= ${endDate}
      GROUP BY 1
      ORDER BY period ASC
    `

    // 結果をMapに変換
    const oneRMMap = new Map<string, number>()
    for (const r of results) {
      oneRMMap.set(r.period, r.max_one_rm)
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
   * SQL集計版
   */
  async getSummary(userId: number): Promise<StatsSummary> {
    // 集計クエリ
    const statsResult = await prisma.$queryRaw<
      Array<{
        total_volume: number | null
        total_sets: bigint
        total_workouts: bigint
      }>
    >`
      SELECT
        SUM(weight * reps)::float as total_volume,
        COUNT(*)::bigint as total_sets,
        COUNT(DISTINCT date)::bigint as total_workouts
      FROM sets
      WHERE user_id = ${userId}
    `

    const stats = statsResult[0]
    if (!stats || stats.total_sets === BigInt(0)) {
      return {
        totalVolume: 0,
        totalSets: 0,
        totalWorkouts: 0,
        currentStreak: 0,
        maxStreak: 0,
      }
    }

    // ストリーク計算用に日付のみ取得
    const datesResult = await prisma.$queryRaw<Array<{ date: Date }>>`
      SELECT DISTINCT date
      FROM sets
      WHERE user_id = ${userId}
      ORDER BY date DESC
    `

    const sortedDates = datesResult.map((r) => dayjs(r.date).format('YYYY-MM-DD'))
    const { currentStreak, maxStreak } = this.calculateStreaks(sortedDates)

    return {
      totalVolume: stats.total_volume || 0,
      totalSets: Number(stats.total_sets),
      totalWorkouts: Number(stats.total_workouts),
      currentStreak,
      maxStreak,
    }
  }

  /**
   * 継続統計を取得（日数、連続週数、連続月数）
   * SQL集計版（二重クエリ問題を修正）
   */
  async getContinuityStats(userId: number, startDate: Date, endDate: Date): Promise<ContinuityStats> {
    // 期間内のユニーク日数を取得
    const totalDaysResult = await prisma.$queryRaw<Array<{ total_days: bigint }>>`
      SELECT COUNT(DISTINCT date)::bigint as total_days
      FROM sets
      WHERE user_id = ${userId}
        AND date >= ${startDate}
        AND date <= ${endDate}
    `

    const totalDays = Number(totalDaysResult[0]?.total_days || 0)

    if (totalDays === 0) {
      return {
        totalDays: 0,
        currentStreakWeeks: 0,
        currentStreakMonths: 0,
      }
    }

    // ストリーク計算用：直近1年分の日付を取得（全件取得を回避）
    const oneYearAgo = dayjs().subtract(1, 'year').toDate()
    const datesResult = await prisma.$queryRaw<Array<{ date: Date }>>`
      SELECT DISTINCT date
      FROM sets
      WHERE user_id = ${userId}
        AND date >= ${oneYearAgo}
      ORDER BY date DESC
    `

    const allUniqueDates = datesResult.map((r) => dayjs(r.date).format('YYYY-MM-DD'))

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
   * SQL集計版
   */
  async getTrainingDaysByPeriod(
    userId: number,
    startDate: Date,
    endDate: Date,
    granularity: TimeGranularity,
  ): Promise<TrainingDaysByPeriod[]> {
    const periodFormatSql = this.getPeriodFormatSql(granularity)

    const results = await prisma.$queryRaw<
      Array<{
        period: string
        days: bigint
      }>
    >`
      SELECT
        to_char(date, ${periodFormatSql}) as period,
        COUNT(DISTINCT date)::bigint as days
      FROM sets
      WHERE user_id = ${userId}
        AND date >= ${startDate}
        AND date <= ${endDate}
      GROUP BY 1
    `

    // 結果をMapに変換
    const daysMap = new Map<string, number>()
    for (const r of results) {
      daysMap.set(r.period, Number(r.days))
    }

    // 期間内の全期間キーを生成
    const periodKeys = this.generatePeriodKeys(startDate, endDate, granularity)
    return periodKeys.map((period) => ({
      period,
      days: daysMap.get(period) || 0,
    }))
  }

  /**
   * 種目別トレーニング日数を取得（リスト用、日数降順）
   * SQL集計版
   */
  async getExerciseTrainingDays(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<ExerciseTrainingDays[]> {
    const results = await prisma.$queryRaw<
      Array<{
        exercise_id: number
        exercise_name: string
        days: bigint
      }>
    >`
      SELECT
        s.exercise_id,
        e.name as exercise_name,
        COUNT(DISTINCT s.date)::bigint as days
      FROM sets s
      JOIN exercises e ON e.id = s.exercise_id
      WHERE s.user_id = ${userId}
        AND s.date >= ${startDate}
        AND s.date <= ${endDate}
      GROUP BY s.exercise_id, e.name
      ORDER BY days DESC
    `

    return results.map((r) => ({
      exerciseId: r.exercise_id,
      exerciseName: r.exercise_name,
      days: Number(r.days),
    }))
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
