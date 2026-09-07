/**
 * REST 契約（TanStack file routes）の薄いクライアント。
 *
 * 各 procedure の入出力型は `@/server/orpc/router` 由来
 *（`InferRouterInputs` / `InferRouterOutputs`）で付ける。
 * 手書きの minimal interface 重複定義は持たない。残すのは表示用の
 * 小さな union（`Preset` / `TimeGranularity` / `BodyPartGranularity`）と
 * `TimerInput`（`timers.create` 由来の別名）のみ。
 * ランタイム（動詞・パス・クエリキー名）は変更禁止。
 */

import { apiPath } from '@/lib/api-paths'
import type { AppRouter } from '@/server/orpc/router'
import type { InferRouterInputs, InferRouterOutputs } from '@orpc/server'

type Outputs = InferRouterOutputs<AppRouter>
type Inputs = InferRouterInputs<AppRouter>

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, path: string, body: unknown) {
    super(`request failed: ${status} ${path}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = undefined
    }
    throw new ApiError(res.status, path, body)
  }
  try {
    return (await res.json()) as T
  } catch (error) {
    // status 0はトランスポート層のパース失敗を表す。HTTP statusとの混同を避けるため
    // 成功レスポンスのパース失敗時はHTTPステータスを用いない。
    throw new ApiError(0, path, { parseError: String(error) })
  }
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      sp.set(key, String(value))
    }
  }
  const q = sp.toString()
  return q ? `${path}?${q}` : path
}

/* ---------- 共有の表示用型（router と同値。'custom' は含めない） ---------- */

export type TimeGranularity = 'day' | 'week' | 'month'
export type Preset = '1month' | '3months' | '6months' | '1year' | 'all'
export type BodyPartGranularity = 'category' | 'bodyPart'

/** `timers.create` 由来。update は `(id, data: TimerInput)` で受ける。 */
export type TimerInput = Inputs['timers']['create']

/* ---------- 統計系の period mapping 反復用ヘルパー ---------- */

/* z.coerce.number() の入力型は unknown になるため、id・年月・exerciseId は
 * client 側で number に整形する（procedure 側は触らない）。 */

type PeriodQueryInput = {
  preset?: Inputs['statistics']['getVolumeTab']['preset']
  customStartDate?: string
  customEndDate?: string
  granularity?: Inputs['statistics']['getVolumeTab']['granularity']
  exerciseId?: number
  bodyPartGranularity?: Inputs['statistics']['getVolumeByBodyPart']['bodyPartGranularity']
}

function toPeriodQuery(p: PeriodQueryInput): Record<string, string | number | undefined> {
  return {
    granularity: p.granularity,
    preset: p.preset,
    customStartDate: p.customStartDate,
    customEndDate: p.customEndDate,
    exerciseId: p.exerciseId,
    bodyPartGranularity: p.bodyPartGranularity,
  }
}

/* ---------- クライアント本体 ---------- */

export const orpc = {
  exercises: {
    listBodyParts(): Promise<Outputs['exercises']['listBodyParts']> {
      return req<Outputs['exercises']['listBodyParts']>(apiPath.exercisesBodyParts)
    },
    listWithBodyParts(): Promise<Outputs['exercises']['listWithBodyParts']> {
      return req<Outputs['exercises']['listWithBodyParts']>(apiPath.exercisesWithBodyParts)
    },
    search(q: Inputs['exercises']['search']['q']): Promise<Outputs['exercises']['search']> {
      return req<Outputs['exercises']['search']>(withQuery(apiPath.exercisesSearch, { q }))
    },
    updateSortOrder(
      exercises: Inputs['exercises']['updateSortOrder']['exercises'],
    ): Promise<Outputs['exercises']['updateSortOrder']> {
      return req<Outputs['exercises']['updateSortOrder']>(
        apiPath.exercisesSortOrder,
        jsonInit('PUT', { exercises }),
      )
    },
    list(): Promise<Outputs['exercises']['list']> {
      return req<Outputs['exercises']['list']>(apiPath.exercises)
    },
    create(name: Inputs['exercises']['create']['name']): Promise<Outputs['exercises']['create']> {
      return req<Outputs['exercises']['create']>(apiPath.exercises, jsonInit('POST', { name }))
    },
    canDelete(id: number): Promise<Outputs['exercises']['canDelete']> {
      return req<Outputs['exercises']['canDelete']>(apiPath.exercisesCanDelete(id))
    },
    updateBodyParts(
      exerciseId: number,
      bodyParts: Inputs['exercises']['updateBodyParts']['bodyParts'],
    ): Promise<Outputs['exercises']['updateBodyParts']> {
      return req<Outputs['exercises']['updateBodyParts']>(
        apiPath.exercisesBodyPartsById(exerciseId),
        jsonInit('PUT', { bodyParts }),
      )
    },
    update(
      id: number,
      name: Inputs['exercises']['update']['name'],
    ): Promise<Outputs['exercises']['update']> {
      return req<Outputs['exercises']['update']>(
        apiPath.exercisesById(id),
        jsonInit('PUT', { name }),
      )
    },
    remove(id: number): Promise<Outputs['exercises']['remove']> {
      return req<Outputs['exercises']['remove']>(apiPath.exercisesById(id), { method: 'DELETE' })
    },
  },

  logs: {
    listYearMonths(): Promise<Outputs['logs']['listYearMonths']> {
      return req<Outputs['logs']['listYearMonths']>(apiPath.logsYearMonths)
    },
    getLatestSetsMultiple(
      exerciseIds: Inputs['logs']['getLatestSetsMultiple']['exerciseIds'],
      excludeDate?: Inputs['logs']['getLatestSetsMultiple']['excludeDate'],
    ): Promise<Outputs['logs']['getLatestSetsMultiple']> {
      return req<Outputs['logs']['getLatestSetsMultiple']>(
        withQuery(apiPath.logsLatestSetsMultiple, {
          exerciseIds: exerciseIds.join(','),
          excludeDate,
        }),
      )
    },
    // サーバパリティのため残す。旧UIでも未使用だった。
    getExerciseHistory(
      exerciseId: number,
      excludeDate?: Inputs['logs']['getExerciseHistory']['excludeDate'],
    ): Promise<Outputs['logs']['getExerciseHistory']> {
      return req<Outputs['logs']['getExerciseHistory']>(
        withQuery(apiPath.logsExerciseHistory(exerciseId), { excludeDate }),
      )
    },
    getLatestSets(
      exerciseId: number,
      excludeDate?: Inputs['logs']['getLatestSets']['excludeDate'],
    ): Promise<Outputs['logs']['getLatestSets']> {
      return req<Outputs['logs']['getLatestSets']>(
        withQuery(apiPath.logsLatestSets(exerciseId), { excludeDate }),
      )
    },
    listByMonth(year: number, month: number): Promise<Outputs['logs']['listByMonth']> {
      return req<Outputs['logs']['listByMonth']>(withQuery(apiPath.logs, { year, month }))
    },
    checkExists(
      date: Inputs['logs']['checkExists']['date'],
    ): Promise<Outputs['logs']['checkExists']> {
      return req<Outputs['logs']['checkExists']>(apiPath.logsExists(date))
    },
    getMemos(date: Inputs['logs']['getMemos']['date']): Promise<Outputs['logs']['getMemos']> {
      return req<Outputs['logs']['getMemos']>(apiPath.logsMemos(date))
    },
    saveMemos(
      date: Inputs['logs']['saveMemos']['date'],
      memos: Inputs['logs']['saveMemos']['memos'],
    ): Promise<Outputs['logs']['saveMemos']> {
      return req<Outputs['logs']['saveMemos']>(apiPath.logsMemos(date), jsonInit('PUT', { memos }))
    },
    getByDate(date: Inputs['logs']['getByDate']['date']): Promise<Outputs['logs']['getByDate']> {
      return req<Outputs['logs']['getByDate']>(apiPath.logsByDate(date))
    },
    upsert(
      date: Inputs['logs']['upsert']['date'],
      sets: Inputs['logs']['upsert']['sets'],
    ): Promise<Outputs['logs']['upsert']> {
      return req<Outputs['logs']['upsert']>(apiPath.logsByDate(date), jsonInit('PUT', { sets }))
    },
    remove(date: Inputs['logs']['remove']['date']): Promise<Outputs['logs']['remove']> {
      return req<Outputs['logs']['remove']>(apiPath.logsByDate(date), {
        method: 'DELETE',
      })
    },
  },

  statistics: {
    getSummary(): Promise<Outputs['statistics']['getSummary']> {
      return req<Outputs['statistics']['getSummary']>(apiPath.statisticsSummary)
    },
    listExercises(): Promise<Outputs['statistics']['listExercises']> {
      return req<Outputs['statistics']['listExercises']>(apiPath.statisticsExercises)
    },
    getVolumeTab(
      params: Inputs['statistics']['getVolumeTab'],
    ): Promise<Outputs['statistics']['getVolumeTab']> {
      return req<Outputs['statistics']['getVolumeTab']>(
        withQuery(apiPath.statisticsVolume, toPeriodQuery(params)),
      )
    },
    getWeightTab(
      params: Omit<Inputs['statistics']['getWeightTab'], 'exerciseId'> & { exerciseId: number },
    ): Promise<Outputs['statistics']['getWeightTab']> {
      return req<Outputs['statistics']['getWeightTab']>(
        withQuery(apiPath.statisticsWeight, toPeriodQuery(params)),
      )
    },
    getContinuityTab(
      params: Inputs['statistics']['getContinuityTab'],
    ): Promise<Outputs['statistics']['getContinuityTab']> {
      return req<Outputs['statistics']['getContinuityTab']>(
        withQuery(apiPath.statisticsContinuity, toPeriodQuery(params)),
      )
    },
    getVolumeByExercise(
      params: Inputs['statistics']['getVolumeByExercise'],
    ): Promise<Outputs['statistics']['getVolumeByExercise']> {
      return req<Outputs['statistics']['getVolumeByExercise']>(
        withQuery(apiPath.statisticsVolumeByExercise, toPeriodQuery(params)),
      )
    },
    getVolumeByBodyPart(
      params: Inputs['statistics']['getVolumeByBodyPart'],
    ): Promise<Outputs['statistics']['getVolumeByBodyPart']> {
      return req<Outputs['statistics']['getVolumeByBodyPart']>(
        withQuery(apiPath.statisticsVolumeByBodyPart, toPeriodQuery(params)),
      )
    },
    getExerciseVolumeTotals(
      params: Inputs['statistics']['getExerciseVolumeTotals'],
    ): Promise<Outputs['statistics']['getExerciseVolumeTotals']> {
      return req<Outputs['statistics']['getExerciseVolumeTotals']>(
        withQuery(apiPath.statisticsExerciseVolumeTotals, toPeriodQuery(params)),
      )
    },
    getBodyPartVolumeTotals(
      params: Inputs['statistics']['getBodyPartVolumeTotals'],
    ): Promise<Outputs['statistics']['getBodyPartVolumeTotals']> {
      return req<Outputs['statistics']['getBodyPartVolumeTotals']>(
        withQuery(apiPath.statisticsBodyPartVolumeTotals, toPeriodQuery(params)),
      )
    },
    getTotalVolume(
      params: Inputs['statistics']['getTotalVolume'],
    ): Promise<Outputs['statistics']['getTotalVolume']> {
      return req<Outputs['statistics']['getTotalVolume']>(
        withQuery(apiPath.statisticsTotalVolume, toPeriodQuery(params)),
      )
    },
    getMaxWeightHistory(
      params: Omit<Inputs['statistics']['getMaxWeightHistory'], 'exerciseId'> & {
        exerciseId: number
      },
    ): Promise<Outputs['statistics']['getMaxWeightHistory']> {
      return req<Outputs['statistics']['getMaxWeightHistory']>(
        withQuery(apiPath.statisticsMaxWeightHistory, toPeriodQuery(params)),
      )
    },
    getOneRMHistory(
      params: Omit<Inputs['statistics']['getOneRMHistory'], 'exerciseId'> & { exerciseId: number },
    ): Promise<Outputs['statistics']['getOneRMHistory']> {
      return req<Outputs['statistics']['getOneRMHistory']>(
        withQuery(apiPath.statisticsOneRMHistory, toPeriodQuery(params)),
      )
    },
    getContinuityStats(
      params: Inputs['statistics']['getContinuityStats'],
    ): Promise<Outputs['statistics']['getContinuityStats']> {
      return req<Outputs['statistics']['getContinuityStats']>(
        withQuery(apiPath.statisticsContinuityStats, toPeriodQuery(params)),
      )
    },
    getTrainingDaysByPeriod(
      params: Inputs['statistics']['getTrainingDaysByPeriod'],
    ): Promise<Outputs['statistics']['getTrainingDaysByPeriod']> {
      return req<Outputs['statistics']['getTrainingDaysByPeriod']>(
        withQuery(apiPath.statisticsTrainingDaysByPeriod, toPeriodQuery(params)),
      )
    },
    getExerciseTrainingDays(
      params: Inputs['statistics']['getExerciseTrainingDays'],
    ): Promise<Outputs['statistics']['getExerciseTrainingDays']> {
      return req<Outputs['statistics']['getExerciseTrainingDays']>(
        withQuery(apiPath.statisticsExerciseTrainingDays, toPeriodQuery(params)),
      )
    },
    getBodyPartTrainingDays(
      params: Inputs['statistics']['getBodyPartTrainingDays'],
    ): Promise<Outputs['statistics']['getBodyPartTrainingDays']> {
      return req<Outputs['statistics']['getBodyPartTrainingDays']>(
        withQuery(apiPath.statisticsBodyPartTrainingDays, toPeriodQuery(params)),
      )
    },
  },

  timers: {
    listSounds(): Promise<Outputs['timers']['listSounds']> {
      return req<Outputs['timers']['listSounds']>(apiPath.timersSounds)
    },
    updateSortOrder(
      timers: Inputs['timers']['updateSortOrder']['timers'],
    ): Promise<Outputs['timers']['updateSortOrder']> {
      return req<Outputs['timers']['updateSortOrder']>(
        apiPath.timersSortOrder,
        jsonInit('PUT', { timers }),
      )
    },
    list(): Promise<Outputs['timers']['list']> {
      return req<Outputs['timers']['list']>(apiPath.timers)
    },
    create(data: TimerInput): Promise<Outputs['timers']['create']> {
      return req<Outputs['timers']['create']>(apiPath.timers, jsonInit('POST', data))
    },
    get(id: number): Promise<Outputs['timers']['get']> {
      return req<Outputs['timers']['get']>(apiPath.timersById(id))
    },
    update(id: number, data: TimerInput): Promise<Outputs['timers']['update']> {
      return req<Outputs['timers']['update']>(apiPath.timersById(id), jsonInit('PUT', data))
    },
    remove(id: number): Promise<Outputs['timers']['remove']> {
      return req<Outputs['timers']['remove']>(apiPath.timersById(id), { method: 'DELETE' })
    },
  },

  health(): Promise<{ status: string }> {
    return req<{ status: string }>(apiPath.health)
  },
}
