import { cacheService } from '@/server/infrastructure/cache'
import { db } from '@/server/infrastructure/database/drizzle/client'
import { toLocalDateString } from '@/server/shared/date-utils'
import {
  formatPeriodKey,
  toPeriodKey,
  type PeriodGranularity,
} from '@/server/shared/period'
import { getPeriodExprSql } from '@/server/infrastructure/repositories/drizzle/statistics-sql'
import { sql } from 'drizzle-orm'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

/** 不正period行の縮退通知。warn政策は呼び出し側（application層）が持つ。 */
const warnInvalidPeriod = (message: string): void => {
  console.warn(message)
}

/** 時間粒度（infra 共通の PeriodGranularity と同義。公開名は保つ） */
export type TimeGranularity = PeriodGranularity

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

/** 部位別ボリューム合計（リスト用） */
export type BodyPartVolumeTotal = {
  bodyPartId: number
  category: string
  bodyPartName: string
  volume: number
  setCount: number
}

/** 部位別ボリュームデータ（グラフ用） */
export type BodyPartVolumeByPeriod = {
  period: string
  bodyPartId: number
  category: string
  bodyPartName: string
  volume: number
}

/** 部位別トレーニング日数（リスト用） */
export type BodyPartTrainingDays = {
  bodyPartId: number
  category: string
  bodyPartName: string
  days: number
}

/** 部位統計の集計粒度 */
export type BodyPartGranularity = 'category' | 'bodyPart'

export class StatisticsService {
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
      const key = formatPeriodKey(current, granularity)
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
    const startStr = toLocalDateString(startDate)
    const endStr = toLocalDateString(endDate)
    const cacheKey = cacheService.buildKey(
      userId,
      'statistics',
      'getVolumeByExercise',
      `${startStr}_${endStr}_${granularity}`,
    )

    return cacheService.through(cacheKey, async () => {
      const periodExpr = getPeriodExprSql(sql`s.date`, granularity)

      const results = await db.all<
        {
          period: string
          exercise_id: number
          exercise_name: string
          volume: number
          set_count: number
        }>
      (sql`
        SELECT
          ${periodExpr} as period,
          s.exercise_id,
          e.name as exercise_name,
          CAST(SUM(s.weight * s.reps) AS REAL) as volume,
          CAST(COUNT(*) AS INTEGER) as set_count
        FROM sets s
        JOIN exercises e ON e.id = s.exercise_id
        WHERE s.user_id = ${userId}
          AND s.date >= ${startStr}
          AND s.date <= ${endStr}
        GROUP BY 1, s.exercise_id, e.name
        ORDER BY period ASC
      `)

      // 不正period行は warn して skip し、残り集計を返す
      const mapped: ExerciseVolumeByPeriod[] = []
      for (const r of results) {
        const period = toPeriodKey(r.period, granularity, warnInvalidPeriod)
        if (period === null) continue
        mapped.push({
          period,
          exerciseId: r.exercise_id,
          exerciseName: r.exercise_name,
          volume: r.volume,
          setCount: Number(r.set_count),
        })
      }
      return mapped
    })
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
    const startStr = toLocalDateString(startDate)
    const endStr = toLocalDateString(endDate)
    const cacheKey = cacheService.buildKey(
      userId,
      'statistics',
      'getExerciseVolumeTotals',
      `${startStr}_${endStr}`,
    )

    return cacheService.through(cacheKey, async () => {
      const results = await db.all<
        {
          exercise_id: number
          exercise_name: string
          volume: number
          set_count: number
        }>
      (sql`
        SELECT
          s.exercise_id,
          e.name as exercise_name,
          CAST(SUM(s.weight * s.reps) AS REAL) as volume,
          CAST(COUNT(*) AS INTEGER) as set_count
        FROM sets s
        JOIN exercises e ON e.id = s.exercise_id
        WHERE s.user_id = ${userId}
          AND s.date >= ${startStr}
          AND s.date <= ${endStr}
        GROUP BY s.exercise_id, e.name
        ORDER BY volume DESC
      `)

      return results.map((r) => ({
        exerciseId: r.exercise_id,
        exerciseName: r.exercise_name,
        volume: r.volume,
        setCount: Number(r.set_count),
      }))
    })
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
    const startStr = toLocalDateString(startDate)
    const endStr = toLocalDateString(endDate)
    const cacheKey = cacheService.buildKey(
      userId,
      'statistics',
      'getVolumeByPeriod',
      `${startStr}_${endStr}_${granularity}`,
    )

    return cacheService.through(cacheKey, async () => {
      const periodExpr = getPeriodExprSql(sql`date`, granularity)

      const results = await db.all<
        {
          period: string
          volume: number
        }>
      (sql`
        SELECT
          ${periodExpr} as period,
          CAST(SUM(weight * reps) AS REAL) as volume
        FROM sets
        WHERE user_id = ${userId}
          AND date >= ${startStr}
          AND date <= ${endStr}
        GROUP BY 1
      `)

      // 結果をMapに変換（不正period行は warn して skip し、残り集計を返す）
      const volumeMap = new Map<string, number>()
      for (const r of results) {
        const period = toPeriodKey(r.period, granularity, warnInvalidPeriod)
        if (period === null) continue
        volumeMap.set(period, r.volume)
      }

      // 期間内の全期間キーを生成（データがない期間は 0）
      const periodKeys = this.generatePeriodKeys(startDate, endDate, granularity)
      return periodKeys.map((period) => ({
        period,
        volume: volumeMap.get(period) || 0,
      }))
    })
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
    const startStr = toLocalDateString(startDate)
    const endStr = toLocalDateString(endDate)
    const cacheKey = cacheService.buildKey(
      userId,
      'statistics',
      'getMaxWeightHistory',
      `${exerciseId}_${startStr}_${endStr}_${granularity}`,
    )

    return cacheService.through(cacheKey, async () => {
      const periodExpr = getPeriodExprSql(sql`date`, granularity)

      const results = await db.all<
        {
          period: string
          max_weight: number
        }>
      (sql`
        SELECT
          ${periodExpr} as period,
          CAST(MAX(weight) AS REAL) as max_weight
        FROM sets
        WHERE user_id = ${userId}
          AND exercise_id = ${exerciseId}
          AND date >= ${startStr}
          AND date <= ${endStr}
        GROUP BY 1
        ORDER BY period ASC
      `)

      // 結果をMapに変換（不正period行は warn して skip し、残り集計を返す）
      const maxWeightMap = new Map<string, number>()
      for (const r of results) {
        const period = toPeriodKey(r.period, granularity, warnInvalidPeriod)
        if (period === null) continue
        maxWeightMap.set(period, r.max_weight)
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
    })
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
    const startStr = toLocalDateString(startDate)
    const endStr = toLocalDateString(endDate)
    const cacheKey = cacheService.buildKey(
      userId,
      'statistics',
      'getOneRMHistory',
      `${exerciseId}_${startStr}_${endStr}_${granularity}`,
    )

    return cacheService.through(cacheKey, async () => {
      const periodExpr = getPeriodExprSql(sql`date`, granularity)

      const results = await db.all<
        {
          period: string
          max_one_rm: number
        }>
      (sql`
        SELECT
          ${periodExpr} as period,
          CAST(MAX(weight * (1 + reps / 29.5)) AS REAL) as max_one_rm
        FROM sets
        WHERE user_id = ${userId}
          AND exercise_id = ${exerciseId}
          AND date >= ${startStr}
          AND date <= ${endStr}
        GROUP BY 1
        ORDER BY period ASC
      `)

      // 結果をMapに変換（不正period行は warn して skip し、残り集計を返す）
      const oneRMMap = new Map<string, number>()
      for (const r of results) {
        const period = toPeriodKey(r.period, granularity, warnInvalidPeriod)
        if (period === null) continue
        oneRMMap.set(period, r.max_one_rm)
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
    })
  }

  /**
   * 統計サマリーを取得
   * SQL集計版
   */
  async getSummary(userId: number): Promise<StatsSummary> {
    const cacheKey = cacheService.buildKey(userId, 'statistics', 'getSummary')

    return cacheService.through(cacheKey, async () => {
      // 集計クエリ
      const statsResult = await db.all<
        {
          total_volume: number | null
          total_sets: number
          total_workouts: number
        }>
      (sql`
        SELECT
          CAST(SUM(weight * reps) AS REAL) as total_volume,
          CAST(COUNT(*) AS INTEGER) as total_sets,
          CAST(COUNT(DISTINCT date) AS INTEGER) as total_workouts
        FROM sets
        WHERE user_id = ${userId}
      `)

      const stats = statsResult[0]
      if (!stats || Number(stats.total_sets) === 0) {
        return {
          totalVolume: 0,
          totalSets: 0,
          totalWorkouts: 0,
          currentStreak: 0,
          maxStreak: 0,
        }
      }

      // ストリーク計算用に日付のみ取得
      const datesResult = await db.all<{ date: string }>(sql`
        SELECT DISTINCT date
        FROM sets
        WHERE user_id = ${userId}
        ORDER BY date DESC
      `)

      const sortedDates = datesResult.map((r) => dayjs(r.date).format('YYYY-MM-DD'))
      const { currentStreak, maxStreak } = this.calculateStreaks(sortedDates)

      return {
        totalVolume: stats.total_volume || 0,
        totalSets: Number(stats.total_sets),
        totalWorkouts: Number(stats.total_workouts),
        currentStreak,
        maxStreak,
      }
    })
  }

  /**
   * 継続統計を取得（日数、連続週数、連続月数）
   * SQL集計版（二重クエリ問題を修正）
   */
  async getContinuityStats(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<ContinuityStats> {
    const startStr = toLocalDateString(startDate)
    const endStr = toLocalDateString(endDate)
    const cacheKey = cacheService.buildKey(
      userId,
      'statistics',
      'getContinuityStats',
      `${startStr}_${endStr}`,
    )

    return cacheService.through(cacheKey, async () => {
      // 期間内のユニーク日数を取得
      const totalDaysResult = await db.all<{ total_days: number }>(sql`
        SELECT CAST(COUNT(DISTINCT date) AS INTEGER) as total_days
        FROM sets
        WHERE user_id = ${userId}
          AND date >= ${startStr}
          AND date <= ${endStr}
      `)

      const totalDays = Number(totalDaysResult[0]?.total_days || 0)

      if (totalDays === 0) {
        return {
          totalDays: 0,
          currentStreakWeeks: 0,
          currentStreakMonths: 0,
        }
      }

      // ストリーク計算用：直近1年分の日付を取得（全件取得を回避）
      const oneYearAgoStr = dayjs().subtract(1, 'year').format('YYYY-MM-DD')
      const datesResult = await db.all<{ date: string }>(sql`
        SELECT DISTINCT date
        FROM sets
        WHERE user_id = ${userId}
          AND date >= ${oneYearAgoStr}
        ORDER BY date DESC
      `)

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
    })
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
    const startStr = toLocalDateString(startDate)
    const endStr = toLocalDateString(endDate)
    const cacheKey = cacheService.buildKey(
      userId,
      'statistics',
      'getTrainingDaysByPeriod',
      `${startStr}_${endStr}_${granularity}`,
    )

    return cacheService.through(cacheKey, async () => {
      const periodExpr = getPeriodExprSql(sql`date`, granularity)

      const results = await db.all<
        {
          period: string
          days: number
        }>
      (sql`
        SELECT
          ${periodExpr} as period,
          CAST(COUNT(DISTINCT date) AS INTEGER) as days
        FROM sets
        WHERE user_id = ${userId}
          AND date >= ${startStr}
          AND date <= ${endStr}
        GROUP BY 1
      `)

      // 結果をMapに変換（不正period行は warn して skip し、残り集計を返す）
      const daysMap = new Map<string, number>()
      for (const r of results) {
        const period = toPeriodKey(r.period, granularity, warnInvalidPeriod)
        if (period === null) continue
        daysMap.set(period, Number(r.days))
      }

      // 期間内の全期間キーを生成
      const periodKeys = this.generatePeriodKeys(startDate, endDate, granularity)
      return periodKeys.map((period) => ({
        period,
        days: daysMap.get(period) || 0,
      }))
    })
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
    const startStr = toLocalDateString(startDate)
    const endStr = toLocalDateString(endDate)
    const cacheKey = cacheService.buildKey(
      userId,
      'statistics',
      'getExerciseTrainingDays',
      `${startStr}_${endStr}`,
    )

    return cacheService.through(cacheKey, async () => {
      const results = await db.all<
        {
          exercise_id: number
          exercise_name: string
          days: number
        }>
      (sql`
        SELECT
          s.exercise_id,
          e.name as exercise_name,
          CAST(COUNT(DISTINCT s.date) AS INTEGER) as days
        FROM sets s
        JOIN exercises e ON e.id = s.exercise_id
        WHERE s.user_id = ${userId}
          AND s.date >= ${startStr}
          AND s.date <= ${endStr}
        GROUP BY s.exercise_id, e.name
        ORDER BY days DESC
      `)

      return results.map((r) => ({
        exerciseId: r.exercise_id,
        exerciseName: r.exercise_name,
        days: Number(r.days),
      }))
    })
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

  /**
   * 部位別ボリューム合計を取得（リスト用、ボリューム降順）
   * カテゴリ単位または部位単位で集計可能
   */
  async getBodyPartVolumeTotals(
    userId: number,
    startDate: Date,
    endDate: Date,
    granularity: BodyPartGranularity,
  ): Promise<BodyPartVolumeTotal[]> {
    const startStr = toLocalDateString(startDate)
    const endStr = toLocalDateString(endDate)
    const cacheKey = cacheService.buildKey(
      userId,
      'statistics',
      'getBodyPartVolumeTotals',
      `${startStr}_${endStr}_${granularity}`,
    )

    return cacheService.through(cacheKey, async () => {
      if (granularity === 'category') {
        // カテゴリ単位で集計
        const results = await db.all<
          {
            category: string
            volume: number
            set_count: number
          }>
        (sql`
          SELECT
            bp.category,
            CAST(SUM(s.weight * s.reps * ebp.load_ratio / 100.0) AS REAL) as volume,
            CAST(COUNT(*) AS INTEGER) as set_count
          FROM sets s
          JOIN exercise_body_parts ebp ON ebp.exercise_id = s.exercise_id
          JOIN body_parts bp ON bp.id = ebp.body_part_id
          WHERE s.user_id = ${userId}
            AND s.date >= ${startStr}
            AND s.date <= ${endStr}
          GROUP BY bp.category
          ORDER BY volume DESC
        `)

        return results.map((r) => ({
          bodyPartId: 0, // カテゴリ集計時は0
          category: r.category,
          bodyPartName: '', // カテゴリ集計時は空
          volume: r.volume,
          setCount: Number(r.set_count),
        }))
      }
      // 部位単位で集計
      const results = await db.all<
        {
          body_part_id: number
          category: string
          body_part_name: string
          volume: number
          set_count: number
        }>
      (sql`
          SELECT
            bp.id as body_part_id,
            bp.category,
            bp.name as body_part_name,
            CAST(SUM(s.weight * s.reps * ebp.load_ratio / 100.0) AS REAL) as volume,
            CAST(COUNT(*) AS INTEGER) as set_count
          FROM sets s
          JOIN exercise_body_parts ebp ON ebp.exercise_id = s.exercise_id
          JOIN body_parts bp ON bp.id = ebp.body_part_id
          WHERE s.user_id = ${userId}
            AND s.date >= ${startStr}
            AND s.date <= ${endStr}
          GROUP BY bp.id, bp.category, bp.name
          ORDER BY volume DESC
        `)

      return results.map((r) => ({
        bodyPartId: r.body_part_id,
        category: r.category,
        bodyPartName: r.body_part_name,
        volume: r.volume,
        setCount: Number(r.set_count),
      }))
    })
  }

  /**
   * 部位別ボリュームを期間ごとに取得（積み上げグラフ用）
   * カテゴリ単位または部位単位で集計可能
   */
  async getVolumeByBodyPart(
    userId: number,
    startDate: Date,
    endDate: Date,
    timeGranularity: TimeGranularity,
    bodyPartGranularity: BodyPartGranularity,
  ): Promise<BodyPartVolumeByPeriod[]> {
    const startStr = toLocalDateString(startDate)
    const endStr = toLocalDateString(endDate)
    const cacheKey = cacheService.buildKey(
      userId,
      'statistics',
      'getVolumeByBodyPart',
      `${startStr}_${endStr}_${timeGranularity}_${bodyPartGranularity}`,
    )

    return cacheService.through(cacheKey, async () => {
      const periodExpr = getPeriodExprSql(sql`s.date`, timeGranularity)

      if (bodyPartGranularity === 'category') {
        // カテゴリ単位で集計
        const results = await db.all<
          {
            period: string
            category: string
            volume: number
          }>
        (sql`
          SELECT
            ${periodExpr} as period,
            bp.category,
            CAST(SUM(s.weight * s.reps * ebp.load_ratio / 100.0) AS REAL) as volume
          FROM sets s
          JOIN exercise_body_parts ebp ON ebp.exercise_id = s.exercise_id
          JOIN body_parts bp ON bp.id = ebp.body_part_id
          WHERE s.user_id = ${userId}
            AND s.date >= ${startStr}
            AND s.date <= ${endStr}
          GROUP BY 1, bp.category
          ORDER BY period ASC
        `)

        // 不正period行は warn して skip し、残り集計を返す
        const mapped: BodyPartVolumeByPeriod[] = []
        for (const r of results) {
          const period = toPeriodKey(r.period, timeGranularity, warnInvalidPeriod)
          if (period === null) continue
          mapped.push({
            period,
            bodyPartId: 0,
            category: r.category,
            bodyPartName: '',
            volume: r.volume,
          })
        }
        return mapped
      }
      // 部位単位で集計
      const results = await db.all<
        {
          period: string
          body_part_id: number
          category: string
          body_part_name: string
          volume: number
        }>
      (sql`
          SELECT
            ${periodExpr} as period,
            bp.id as body_part_id,
            bp.category,
            bp.name as body_part_name,
            CAST(SUM(s.weight * s.reps * ebp.load_ratio / 100.0) AS REAL) as volume
          FROM sets s
          JOIN exercise_body_parts ebp ON ebp.exercise_id = s.exercise_id
          JOIN body_parts bp ON bp.id = ebp.body_part_id
          WHERE s.user_id = ${userId}
            AND s.date >= ${startStr}
            AND s.date <= ${endStr}
          GROUP BY 1, bp.id, bp.category, bp.name
          ORDER BY period ASC
        `)

      // 不正period行は warn して skip し、残り集計を返す
      const mapped: BodyPartVolumeByPeriod[] = []
      for (const r of results) {
        const period = toPeriodKey(r.period, timeGranularity, warnInvalidPeriod)
        if (period === null) continue
        mapped.push({
          period,
          bodyPartId: r.body_part_id,
          category: r.category,
          bodyPartName: r.body_part_name,
          volume: r.volume,
        })
      }
      return mapped
    })
  }

  /**
   * 部位別トレーニング日数を取得（リスト用、日数降順）
   * カテゴリ単位または部位単位で集計可能
   */
  async getBodyPartTrainingDays(
    userId: number,
    startDate: Date,
    endDate: Date,
    granularity: BodyPartGranularity,
  ): Promise<BodyPartTrainingDays[]> {
    const startStr = toLocalDateString(startDate)
    const endStr = toLocalDateString(endDate)
    const cacheKey = cacheService.buildKey(
      userId,
      'statistics',
      'getBodyPartTrainingDays',
      `${startStr}_${endStr}_${granularity}`,
    )

    return cacheService.through(cacheKey, async () => {
      if (granularity === 'category') {
        // カテゴリ単位で集計
        const results = await db.all<
          {
            category: string
            days: number
          }>
        (sql`
          SELECT
            bp.category,
            CAST(COUNT(DISTINCT s.date) AS INTEGER) as days
          FROM sets s
          JOIN exercise_body_parts ebp ON ebp.exercise_id = s.exercise_id
          JOIN body_parts bp ON bp.id = ebp.body_part_id
          WHERE s.user_id = ${userId}
            AND s.date >= ${startStr}
            AND s.date <= ${endStr}
          GROUP BY bp.category
          ORDER BY days DESC
        `)

        return results.map((r) => ({
          bodyPartId: 0,
          category: r.category,
          bodyPartName: '',
          days: Number(r.days),
        }))
      }
      // 部位単位で集計
      const results = await db.all<
        {
          body_part_id: number
          category: string
          body_part_name: string
          days: number
        }>
      (sql`
          SELECT
            bp.id as body_part_id,
            bp.category,
            bp.name as body_part_name,
            CAST(COUNT(DISTINCT s.date) AS INTEGER) as days
          FROM sets s
          JOIN exercise_body_parts ebp ON ebp.exercise_id = s.exercise_id
          JOIN body_parts bp ON bp.id = ebp.body_part_id
          WHERE s.user_id = ${userId}
            AND s.date >= ${startStr}
            AND s.date <= ${endStr}
          GROUP BY bp.id, bp.category, bp.name
          ORDER BY days DESC
        `)

      return results.map((r) => ({
        bodyPartId: r.body_part_id,
        category: r.category,
        bodyPartName: r.body_part_name,
        days: Number(r.days),
      }))
    })
  }
}

// シングルトンインスタンス
export const statisticsService = new StatisticsService()
