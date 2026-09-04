/**
 * `_api` 群の単一集約点（arch-1）。
 * `hono-app.ts` は本 barrel 経由でのみ `_api` 群を参照する。新規 route の追加は
 * 本ファイルへの再 export 1 行＋`hono-app.ts` のルート表への 1 行追加に限定し、
 * `hono-app.ts` への直 import を増やさない。
 * `src/app` 配下からの再 export であり依存方向の倒立自体は M5 移設
 * （`docs/migration-cutover.md` 手順8: `src/server/api/_api/` への移設）まで残る
 * 暫定措置。移設時は本ファイルの参照元を付け替えて本ファイルを削除する。
 */

// Exercises API
export { canDelete as exerciseCanDelete } from '@/app/(protected)/exercises/_api/canDelete'
export { createExercise } from '@/app/(protected)/exercises/_api/createExercise'
export { deleteExercise } from '@/app/(protected)/exercises/_api/deleteExercise'
export { getBodyParts } from '@/app/(protected)/exercises/_api/getBodyParts'
export { getExercises } from '@/app/(protected)/exercises/_api/getExercises'
export { getExercisesWithBodyParts } from '@/app/(protected)/exercises/_api/getExercisesWithBodyParts'
export { searchExercises } from '@/app/(protected)/exercises/_api/searchExercises'
export { updateExercise } from '@/app/(protected)/exercises/_api/updateExercise'
export { updateExerciseBodyParts } from '@/app/(protected)/exercises/_api/updateExerciseBodyParts'
export { updateSortOrder as exerciseUpdateSortOrder } from '@/app/(protected)/exercises/_api/updateSortOrder'

// Trainings API
export { checkExists } from '@/app/(protected)/logs/_api/checkExists'
export { deleteTraining } from '@/app/(protected)/logs/_api/deleteTraining'
export { getExerciseHistory } from '@/app/(protected)/logs/_api/getExerciseHistory'
export { getLatestSets } from '@/app/(protected)/logs/_api/getLatestSets'
export { getLatestSetsMultiple } from '@/app/(protected)/logs/_api/getLatestSetsMultiple'
export { getMemos } from '@/app/(protected)/logs/_api/getMemos'
export { getTrainingByDate } from '@/app/(protected)/logs/_api/getTrainingByDate'
export { getTrainings } from '@/app/(protected)/logs/_api/getTrainings'
export { getYearMonths } from '@/app/(protected)/logs/_api/getYearMonths'
export { saveMemos } from '@/app/(protected)/logs/_api/saveMemos'
export { upsertTraining } from '@/app/(protected)/logs/_api/upsertTraining'

// Statistics API
export { getBodyPartTrainingDays } from '@/app/(protected)/statistics/_api/getBodyPartTrainingDays'
export { getBodyPartVolumeTotals } from '@/app/(protected)/statistics/_api/getBodyPartVolumeTotals'
export { getContinuityStats } from '@/app/(protected)/statistics/_api/getContinuityStats'
export { getContinuityTab } from '@/app/(protected)/statistics/_api/getContinuityTab'
export { getExercises as getStatisticsExercises } from '@/app/(protected)/statistics/_api/getExercises'
export { getExerciseTrainingDays } from '@/app/(protected)/statistics/_api/getExerciseTrainingDays'
export { getExerciseVolumeTotals } from '@/app/(protected)/statistics/_api/getExerciseVolumeTotals'
export { getMaxWeightHistory } from '@/app/(protected)/statistics/_api/getMaxWeightHistory'
export { getOneRMHistory } from '@/app/(protected)/statistics/_api/getOneRMHistory'
export { getSummary } from '@/app/(protected)/statistics/_api/getSummary'
export { getTotalVolume } from '@/app/(protected)/statistics/_api/getTotalVolume'
export { getTrainingDaysByPeriod } from '@/app/(protected)/statistics/_api/getTrainingDaysByPeriod'
export { getVolumeByBodyPart } from '@/app/(protected)/statistics/_api/getVolumeByBodyPart'
export { getVolumeByExercise } from '@/app/(protected)/statistics/_api/getVolumeByExercise'
export { getVolumeTab } from '@/app/(protected)/statistics/_api/getVolumeTab'
export { getWeightTab } from '@/app/(protected)/statistics/_api/getWeightTab'

// Timers API
export { createTimer } from '@/app/(protected)/timers/_api/createTimer'
export { deleteTimer } from '@/app/(protected)/timers/_api/deleteTimer'
export { getSounds } from '@/app/(protected)/timers/_api/getSounds'
export { getTimer } from '@/app/(protected)/timers/_api/getTimer'
export { getTimers } from '@/app/(protected)/timers/_api/getTimers'
export { updateSortOrder as timerUpdateSortOrder } from '@/app/(protected)/timers/_api/updateSortOrder'
export { updateTimer } from '@/app/(protected)/timers/_api/updateTimer'
