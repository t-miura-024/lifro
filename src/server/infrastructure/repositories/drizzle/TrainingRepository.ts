import type {
  ExerciseHistory,
  ExerciseVolume,
  LatestExerciseSets,
  SetInput,
  Training,
  TrainingMemo,
  TrainingSummary,
  YearMonth,
} from '@/server/domain/entities'
import type { ITrainingRepository } from '@/server/domain/repositories'
import { and, asc, desc, eq, gte, inArray, lte, ne, sql } from 'drizzle-orm'
import { db } from '../../database/drizzle/client'
import { exercises, sets, trainingMemos } from '../../database/drizzle/schema'
import { toDateString, toISOString, toLocalDateString } from './helper'

export class DrizzleTrainingRepository implements ITrainingRepository {
  async findByMonth(userId: number, year: number, month: number): Promise<TrainingSummary[]> {
    // 月の開始日と終了日をローカル日付で組み立てる（UTC変換すると前月末の混入・当月末の欠落が起きる）
    const startStr = toLocalDateString(new Date(year, month - 1, 1))
    const endStr = toLocalDateString(new Date(year, month, 0)) // 月末日

    // セットとメモを並列で取得
    const [setRows, memoRows] = await Promise.all([
      db
        .select({ set: sets, exercise: exercises })
        .from(sets)
        .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
        .where(
          and(
            eq(sets.userId, userId),
            gte(sets.date, startStr),
            lte(sets.date, endStr),
          ),
        )
        .orderBy(desc(sets.date), asc(sets.sortIndex)),
      db
        .select()
        .from(trainingMemos)
        .where(
          and(
            eq(trainingMemos.userId, userId),
            gte(trainingMemos.date, startStr),
            lte(trainingMemos.date, endStr),
          ),
        )
        .orderBy(asc(trainingMemos.createdAt)),
    ])

    // 日付ごとにメモをグループ化（string型に変換）
    const memosByDate = new Map<string, TrainingMemo[]>()
    for (const memo of memoRows) {
      const dateKey = toDateString(memo.date)
      if (!memosByDate.has(dateKey)) {
        memosByDate.set(dateKey, [])
      }
      memosByDate.get(dateKey)?.push({
        id: memo.id,
        userId: memo.userId,
        date: toDateString(memo.date),
        content: memo.content,
        createdAt: toISOString(memo.createdAt),
        updatedAt: toISOString(memo.updatedAt),
      })
    }

    // 日付ごとにグループ化して集約
    const grouped = new Map<string, typeof setRows>()
    for (const row of setRows) {
      const dateKey = toDateString(row.set.date)
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, [])
      }
      grouped.get(dateKey)?.push(row)
    }

    const summaries: TrainingSummary[] = []
    for (const [dateKey, dateSets] of grouped) {
      const exerciseNames = [...new Set(dateSets.map((s) => s.exercise.name))]
      const totalVolume = dateSets.reduce((sum, s) => sum + s.set.weight * s.set.reps, 0)

      // 種目ごとのボリュームを集計（sortIndex順を維持）
      const exerciseVolumeMap = new Map<number, ExerciseVolume>()
      for (const row of dateSets) {
        const current = exerciseVolumeMap.get(row.set.exerciseId)
        if (current) {
          current.volume += row.set.weight * row.set.reps
        } else {
          exerciseVolumeMap.set(row.set.exerciseId, {
            exerciseId: row.set.exerciseId,
            exerciseName: row.exercise.name,
            volume: row.set.weight * row.set.reps,
          })
        }
      }
      const exercisesList = [...exerciseVolumeMap.values()]

      summaries.push({
        date: dateKey, // string型
        exerciseNames,
        exercises: exercisesList,
        totalVolume,
        setCount: dateSets.length,
        memos: memosByDate.get(dateKey) || [],
      })
    }

    return summaries
  }

  async findByDate(userId: number, date: string): Promise<Training | null> {
    const rows = await db
      .select({ set: sets, exercise: exercises })
      .from(sets)
      .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
      .where(and(eq(sets.userId, userId), eq(sets.date, date)))
      .orderBy(asc(sets.sortIndex))

    if (rows.length === 0) {
      return null
    }

    return {
      date, // string型をそのまま返す
      userId,
      sets: rows.map((r) => ({
        id: r.set.id,
        exerciseId: r.set.exerciseId,
        userId: r.set.userId,
        weight: r.set.weight,
        reps: r.set.reps,
        date: toDateString(r.set.date),
        sortIndex: r.set.sortIndex,
        createdAt: toISOString(r.set.createdAt),
        updatedAt: toISOString(r.set.updatedAt),
        exercise: {
          id: r.exercise.id,
          userId: r.exercise.userId,
          name: r.exercise.name,
          sortIndex: r.exercise.sortIndex,
          createdAt: toISOString(r.exercise.createdAt),
          updatedAt: toISOString(r.exercise.updatedAt),
        },
      })),
    }
  }

  async save(userId: number, date: string, setsInput: SetInput[]): Promise<Training> {
    // トランザクションで既存セットの削除と新規セットの作成を行う
    await db.transaction(async (tx) => {
      // 既存のセットを削除
      await tx
        .delete(sets)
        .where(and(eq(sets.userId, userId), eq(sets.date, date)))

      // 新規セットを作成
      if (setsInput.length > 0) {
        const now = new Date()
        await tx.insert(sets).values(
          setsInput.map((s) => ({
            exerciseId: s.exerciseId,
            userId,
            weight: s.weight,
            reps: s.reps,
            date,
            sortIndex: s.sortIndex,
            createdAt: now,
            updatedAt: now,
          })),
        )
      }
    })

    // 保存後のデータを取得して返す
    const result = await this.findByDate(userId, date)
    return result ?? { date, userId, sets: [] }
  }

  async deleteByDate(userId: number, date: string): Promise<void> {
    await db.delete(sets).where(and(eq(sets.userId, userId), eq(sets.date, date)))
  }

  async getLatestHistory(
    userId: number,
    exerciseId: number,
    excludeDate?: string,
  ): Promise<ExerciseHistory | null> {
    // 指定種目の最新セットを取得
    const rows = await db
      .select({ set: sets, exercise: exercises })
      .from(sets)
      .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
      .where(
        and(
          eq(sets.userId, userId),
          eq(sets.exerciseId, exerciseId),
          ...(excludeDate ? [ne(sets.date, excludeDate)] : []),
        ),
      )
      .orderBy(desc(sets.date), desc(sets.sortIndex))
      .limit(1)

    const latestSet = rows[0]
    if (!latestSet) {
      return null
    }

    return {
      exerciseId: latestSet.set.exerciseId,
      exerciseName: latestSet.exercise.name,
      weight: latestSet.set.weight,
      reps: latestSet.set.reps,
      date: toDateString(latestSet.set.date),
    }
  }

  async getLatestExerciseSets(
    userId: number,
    exerciseId: number,
    excludeDate?: string,
  ): Promise<LatestExerciseSets | null> {
    // 指定種目の最新実施日を取得
    const latestRows = await db
      .select({ date: sets.date })
      .from(sets)
      .where(
        and(
          eq(sets.userId, userId),
          eq(sets.exerciseId, exerciseId),
          ...(excludeDate ? [ne(sets.date, excludeDate)] : []),
        ),
      )
      .orderBy(desc(sets.date))
      .limit(1)

    const latestSet = latestRows[0]
    if (!latestSet) {
      return null
    }

    // その日の当該種目の全セットを取得
    const rows = await db
      .select({ set: sets, exercise: exercises })
      .from(sets)
      .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
      .where(
        and(
          eq(sets.userId, userId),
          eq(sets.exerciseId, exerciseId),
          eq(sets.date, latestSet.date),
        ),
      )
      .orderBy(asc(sets.sortIndex))

    if (rows.length === 0) {
      return null
    }

    return {
      exerciseId: rows[0].set.exerciseId,
      exerciseName: rows[0].exercise.name,
      date: toDateString(rows[0].set.date),
      sets: rows.map((r) => ({
        weight: r.set.weight,
        reps: r.set.reps,
        sortIndex: r.set.sortIndex,
      })),
    }
  }

  async getLatestExerciseSetsMultiple(
    userId: number,
    exerciseIds: number[],
    excludeDate?: string,
  ): Promise<Map<number, LatestExerciseSets>> {
    if (exerciseIds.length === 0) {
      return new Map()
    }

    // 各種目の最新日付を取得するサブクエリを使用
    // まず全種目の全セットを取得し、種目ごとに最新日付のものだけをフィルタ
    const allRows = await db
      .select({ set: sets, exercise: exercises })
      .from(sets)
      .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
      .where(
        and(
          eq(sets.userId, userId),
          inArray(sets.exerciseId, exerciseIds),
          ...(excludeDate ? [ne(sets.date, excludeDate)] : []),
        ),
      )
      .orderBy(desc(sets.date), asc(sets.sortIndex))

    // 種目ごとの最新日付を特定
    const latestDateByExercise = new Map<number, string>()
    for (const row of allRows) {
      if (!latestDateByExercise.has(row.set.exerciseId)) {
        latestDateByExercise.set(row.set.exerciseId, toDateString(row.set.date))
      }
    }

    // 最新日付のセットのみをグルーピング
    const result = new Map<number, LatestExerciseSets>()
    for (const row of allRows) {
      const latestDate = latestDateByExercise.get(row.set.exerciseId)
      if (!latestDate || toDateString(row.set.date) !== latestDate) {
        continue
      }

      if (!result.has(row.set.exerciseId)) {
        result.set(row.set.exerciseId, {
          exerciseId: row.set.exerciseId,
          exerciseName: row.exercise.name,
          date: toDateString(row.set.date),
          sets: [],
        })
      }
      result.get(row.set.exerciseId)?.sets.push({
        weight: row.set.weight,
        reps: row.set.reps,
        sortIndex: row.set.sortIndex,
      })
    }

    return result
  }

  async getAvailableYearMonths(userId: number): Promise<YearMonth[]> {
    // SQLの集計でDBレベルで年月をグループ化（データ転送量削減）
    const result = await db.execute<{ year: number; month: number }>(sql`
      SELECT
        EXTRACT(YEAR FROM date)::int AS year,
        EXTRACT(MONTH FROM date)::int AS month
      FROM sets
      WHERE user_id = ${userId}
      GROUP BY year, month
      ORDER BY year DESC, month DESC
    `)
    return [...result]
  }
}

// シングルトンインスタンス
export const trainingRepository = new DrizzleTrainingRepository()
