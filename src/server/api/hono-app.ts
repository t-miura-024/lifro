import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { HEALTH_PAYLOAD } from './health'
// `_api` 群は barrel（`./route-handlers`）経由でのみ参照する。新規 route の追加は
// barrel への再 export 1 行＋対応 factory 内の `.route()` 1 行追加に限定し、
// 本ファイルへの直 import を増やさない（arch-1。完全移設は M5 で `docs/migration-cutover.md`
// 手順8 の `src/server/api/_api/` へ）。
import {
  checkExists,
  createExercise,
  createTimer,
  deleteExercise,
  deleteTimer,
  deleteTraining,
  exerciseCanDelete,
  exerciseUpdateSortOrder,
  getBodyParts,
  getBodyPartTrainingDays,
  getBodyPartVolumeTotals,
  getContinuityStats,
  getContinuityTab,
  getExerciseHistory,
  getExercises,
  getExercisesWithBodyParts,
  getExerciseTrainingDays,
  getExerciseVolumeTotals,
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

// NOTE（arch-2 見送り理由）: 系統ごとの factory 4 分割をデータテーブル＋単一ループに
// 畳む案は不採用。Hono のルート型推論は `.route()` のテキスト上のチェインからのみ
// 組み立てられ、ループで回すと schema 型が消去される。`AppType` が空 schema 化すると
// `hc<AppType>` の型付き client（`src/app/_lib/hono/client.ts`）が全ページで
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
 * 暫定: `src/app` 依存の Hono 合成ルート（M5 で切替）。
 * 「フレームワーク非依存」を標榜していたが、実体は middleware と約40の `_api` を
 * Next 配下（`src/app/**`）から参照している。`src/app` 除去の瞬間に双方の
 * API entry が道連れで壊れる結合がある。M5 一括切替で `_api` 群を `src/app` 外の
 * 純粋層（移設先は `docs/migration-cutover.md` 手順8に記録）へ移設し、本コメントを
 * 除去する。それまでは両 entry が同一ルート定義を共有する。
 * `_api` 群の参照は barrel（`./route-handlers`）経由に一本化済み（arch-1）。
 * `src/app/api/[...route]/route.ts` からの逐語転記（`hono/vercel` の
 * `handle` 結合のみ分離）。マウント側は経路ごとに確定したミドルウェアを選ぶ:
 * - Next 側: `src/app/api/[...route]/route.ts` が `buildApp(authMiddlewareNext)` を使う
 *   （M5 一括切替まで温存。`authMiddlewareNext`＝legacy 単経路）
 * - Start 側: `src/routes/api.$.tsx` が `buildApp(authMiddleware)` を使う
 *   （`app.fetch` 直結。Hono は
 *   WinterCG fetch 互換のため `hono/vercel` 相当のアダプタは不要。
 *   これが Start/Vite 対応への交換にあたる。`authMiddleware`＝better-auth 単経路）
 * 本モジュールはミドルウェア自体を束ねない（ルート表＋単一ループのみ）。`app`／`appNext` の
 * 実体化は各 entry 側で行い、Start ビルドに旧ランタイム・Next ビルドに
 * better-auth 正本が混入しないようモジュールグラフを分離する（A2・C1）。
 */
export function buildApp(mw: MiddlewareHandler<AuthEnv>) {
  return new Hono()
    .basePath('/api')
    // health 契約の正本は `./health` の `HEALTH_PAYLOAD`。専用 file route
    // （`src/routes/api.health.tsx`）・splat 側の誤到達フォールバックと同一にする。
    // 本 Hono `/health` は Next 温存 entry（`src/app/api/[...route]/route.ts`）と
    // 直接 `app.fetch` する用法の互換のため残す（G3）。Start の `/api/health` は
    // 専用 file route が担当し、秘密欠落時も応答する。
    .get('/health', (c) => c.json({ ...HEALTH_PAYLOAD }))
    .route('/exercises', buildExercisesApp(mw))
    .route('/trainings', buildTrainingsApp(mw))
    .route('/statistics', buildStatisticsApp(mw))
    .route('/timers', buildTimersApp(mw))
}

/** Start 正本・Next 温存の両 entry が共有する Hono 型。 */
export type AppType = ReturnType<typeof buildApp>
