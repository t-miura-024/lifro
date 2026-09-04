import type { AuthEnv } from '@/server/api/middleware/auth'
import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'
import { HEALTH_PAYLOAD } from './health'
// `_api` 群は barrel（`./route-handlers`）経由でのみ参照する。新規 route の追加は
// barrel への再 export 1 行＋対応 factory 内の `.route()` 1 行追加に限定し、
// 本ファイルへの直 import を増やさない。
import {
  checkExists,
  createExercise,
  createTimer,
  deleteExercise,
  deleteTimer,
  deleteTraining,
  exerciseCanDelete,
  exerciseUpdateSortOrder,
  getBodyPartTrainingDays,
  getBodyPartVolumeTotals,
  getBodyParts,
  getContinuityStats,
  getContinuityTab,
  getExerciseHistory,
  getExerciseTrainingDays,
  getExerciseVolumeTotals,
  getExercises,
  getExercisesWithBodyParts,
  getLatestSets,
  getLatestSetsMultiple,
  getMaxWeightHistory,
  getMemos,
  getOneRMHistory,
  getSounds,
  getStatisticsExercises,
  getSummary,
  getTimer,
  getTimers,
  getTotalVolume,
  getTrainingByDate,
  getTrainingDaysByPeriod,
  getTrainings,
  getVolumeByBodyPart,
  getVolumeByExercise,
  getVolumeTab,
  getWeightTab,
  getYearMonths,
  saveMemos,
  searchExercises,
  timerUpdateSortOrder,
  updateExercise,
  updateExerciseBodyParts,
  updateTimer,
  upsertTraining,
} from './route-handlers'

// NOTE: 系統ごとの factory 4 分割をデータテーブル＋単一ループに畳む案は不採用。
// Hono のルート型推論は `.route()` のテキスト上のチェインからのみ組み立てられ、
// ループで回すと schema 型が消去される。`AppType` が空 schema 化すると
// `hc<AppType>` の型付き client（`src/lib/hono-client.ts`）が全ページで
// unknown 化し `tsc` が破壊される（実測で確認）。振る舞い不変を優先し、チェイン形式を
// 維持する。shotgun 側の緩和は barrel（`./route-handlers`）への一本化で代替する。
// Exercises サブアプリ
function buildExercisesApp(mw: MiddlewareHandler<AuthEnv>) {
  return new Hono<AuthEnv>()
    .use('*', mw)
    .route('/', getBodyParts)
    .route('/', getExercisesWithBodyParts)
    .route('/', searchExercises)
    .route('/', exerciseUpdateSortOrder)
    .route('/', getExercises)
    .route('/', createExercise)
    .route('/', exerciseCanDelete)
    .route('/', updateExerciseBodyParts)
    .route('/', updateExercise)
    .route('/', deleteExercise)
}

// Trainings サブアプリ
function buildTrainingsApp(mw: MiddlewareHandler<AuthEnv>) {
  return new Hono<AuthEnv>()
    .use('*', mw)
    .route('/', getYearMonths)
    .route('/', getLatestSetsMultiple)
    .route('/', getExerciseHistory)
    .route('/', getLatestSets)
    .route('/', getTrainings)
    .route('/', checkExists)
    .route('/', getMemos)
    .route('/', saveMemos)
    .route('/', getTrainingByDate)
    .route('/', upsertTraining)
    .route('/', deleteTraining)
}

// Statistics サブアプリ
function buildStatisticsApp(mw: MiddlewareHandler<AuthEnv>) {
  return new Hono<AuthEnv>()
    .use('*', mw)
    .route('/', getSummary)
    .route('/', getStatisticsExercises)
    .route('/', getVolumeTab)
    .route('/', getWeightTab)
    .route('/', getContinuityTab)
    .route('/', getVolumeByExercise)
    .route('/', getVolumeByBodyPart)
    .route('/', getExerciseVolumeTotals)
    .route('/', getBodyPartVolumeTotals)
    .route('/', getTotalVolume)
    .route('/', getMaxWeightHistory)
    .route('/', getOneRMHistory)
    .route('/', getContinuityStats)
    .route('/', getTrainingDaysByPeriod)
    .route('/', getExerciseTrainingDays)
    .route('/', getBodyPartTrainingDays)
}

// Timers サブアプリ
function buildTimersApp(mw: MiddlewareHandler<AuthEnv>) {
  return new Hono<AuthEnv>()
    .use('*', mw)
    .route('/', getSounds)
    .route('/', timerUpdateSortOrder)
    .route('/', getTimers)
    .route('/', createTimer)
    .route('/', getTimer)
    .route('/', updateTimer)
    .route('/', deleteTimer)
}

/**
 * Hono 合成ルート。`_api` 群の参照は barrel（`./route-handlers`）経由に一本化している。
 * マウント側は使うミドルウェアを選ぶ: `src/routes/api.$.tsx` が
 * `buildApp(authMiddleware)` を `app.fetch` 直結で使う（Hono は WinterCG fetch
 * 互換のためアダプタ不要。`authMiddleware`＝better-auth 単経路）。
 * 本モジュールはミドルウェア自体を束ねない（ルート表＋factory のみ）。
 */
export function buildApp(mw: MiddlewareHandler<AuthEnv>) {
  return (
    new Hono()
      .basePath('/api')
      // health 契約の正本は `./health` の `HEALTH_PAYLOAD`。専用 file route
      // （`src/routes/api.health.tsx`）・splat 側の誤到達フォールバックと同一にする。
      // 本 Hono `/health` は直接 `app.fetch` する用法の互換のため残す。
      // `/api/health` は専用 file route が担当し、秘密欠落時も応答する。
      .get('/health', (c) => c.json({ ...HEALTH_PAYLOAD }))
      .route('/exercises', buildExercisesApp(mw))
      .route('/trainings', buildTrainingsApp(mw))
      .route('/statistics', buildStatisticsApp(mw))
      .route('/timers', buildTimersApp(mw))
  )
}

/** Hono API の共有型。 */
export type AppType = ReturnType<typeof buildApp>
