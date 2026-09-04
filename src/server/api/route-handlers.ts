/**
 * `_api` 群の単一集約点。
 * `hono-app.ts` は本 barrel 経由でのみ `_api` 群を参照する。新規 route の追加は
 * 本ファイルへの再 export 1 行＋`hono-app.ts` のルート表への 1 行追加に限定し、
 * `hono-app.ts` への直 import を増やさない。
 */

// Exercises API
export { canDelete as exerciseCanDelete } from '@/server/api/_api/exercises/canDelete'
export { createExercise } from '@/server/api/_api/exercises/createExercise'
export { deleteExercise } from '@/server/api/_api/exercises/deleteExercise'
export { getBodyParts } from '@/server/api/_api/exercises/getBodyParts'
export { getExercises } from '@/server/api/_api/exercises/getExercises'
export { getExercisesWithBodyParts } from '@/server/api/_api/exercises/getExercisesWithBodyParts'
export { searchExercises } from '@/server/api/_api/exercises/searchExercises'
export { updateExercise } from '@/server/api/_api/exercises/updateExercise'
export { updateExerciseBodyParts } from '@/server/api/_api/exercises/updateExerciseBodyParts'
export { updateSortOrder as exerciseUpdateSortOrder } from '@/server/api/_api/exercises/updateSortOrder'

// Trainings API
export { checkExists } from '@/server/api/_api/logs/checkExists'
export { deleteTraining } from '@/server/api/_api/logs/deleteTraining'
export { getExerciseHistory } from '@/server/api/_api/logs/getExerciseHistory'
export { getLatestSets } from '@/server/api/_api/logs/getLatestSets'
export { getLatestSetsMultiple } from '@/server/api/_api/logs/getLatestSetsMultiple'
export { getMemos } from '@/server/api/_api/logs/getMemos'
export { getTrainingByDate } from '@/server/api/_api/logs/getTrainingByDate'
export { getTrainings } from '@/server/api/_api/logs/getTrainings'
export { getYearMonths } from '@/server/api/_api/logs/getYearMonths'
export { saveMemos } from '@/server/api/_api/logs/saveMemos'
export { upsertTraining } from '@/server/api/_api/logs/upsertTraining'

// Statistics API
export { getBodyPartTrainingDays } from '@/server/api/_api/statistics/getBodyPartTrainingDays'
export { getBodyPartVolumeTotals } from '@/server/api/_api/statistics/getBodyPartVolumeTotals'
export { getContinuityStats } from '@/server/api/_api/statistics/getContinuityStats'
export { getContinuityTab } from '@/server/api/_api/statistics/getContinuityTab'
export { getExercises as getStatisticsExercises } from '@/server/api/_api/statistics/getExercises'
export { getExerciseTrainingDays } from '@/server/api/_api/statistics/getExerciseTrainingDays'
export { getExerciseVolumeTotals } from '@/server/api/_api/statistics/getExerciseVolumeTotals'
export { getMaxWeightHistory } from '@/server/api/_api/statistics/getMaxWeightHistory'
export { getOneRMHistory } from '@/server/api/_api/statistics/getOneRMHistory'
export { getSummary } from '@/server/api/_api/statistics/getSummary'
export { getTotalVolume } from '@/server/api/_api/statistics/getTotalVolume'
export { getTrainingDaysByPeriod } from '@/server/api/_api/statistics/getTrainingDaysByPeriod'
export { getVolumeByBodyPart } from '@/server/api/_api/statistics/getVolumeByBodyPart'
export { getVolumeByExercise } from '@/server/api/_api/statistics/getVolumeByExercise'
export { getVolumeTab } from '@/server/api/_api/statistics/getVolumeTab'
export { getWeightTab } from '@/server/api/_api/statistics/getWeightTab'

// Timers API
export { createTimer } from '@/server/api/_api/timers/createTimer'
export { deleteTimer } from '@/server/api/_api/timers/deleteTimer'
export { getSounds } from '@/server/api/_api/timers/getSounds'
export { getTimer } from '@/server/api/_api/timers/getTimer'
export { getTimers } from '@/server/api/_api/timers/getTimers'
export { updateSortOrder as timerUpdateSortOrder } from '@/server/api/_api/timers/updateSortOrder'
export { updateTimer } from '@/server/api/_api/timers/updateTimer'
