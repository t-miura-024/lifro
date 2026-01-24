import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { authMiddleware, type AuthEnv } from '@/app/_lib/hono/middleware/auth'

// Exercises API
import { canDelete as exerciseCanDelete } from '@/app/(protected)/exercises/_api/canDelete'
import { createExercise } from '@/app/(protected)/exercises/_api/createExercise'
import { deleteExercise } from '@/app/(protected)/exercises/_api/deleteExercise'
import { getBodyParts } from '@/app/(protected)/exercises/_api/getBodyParts'
import { getExercises } from '@/app/(protected)/exercises/_api/getExercises'
import { getExercisesWithBodyParts } from '@/app/(protected)/exercises/_api/getExercisesWithBodyParts'
import { searchExercises } from '@/app/(protected)/exercises/_api/searchExercises'
import { updateExercise } from '@/app/(protected)/exercises/_api/updateExercise'
import { updateExerciseBodyParts } from '@/app/(protected)/exercises/_api/updateExerciseBodyParts'
import { updateSortOrder as exerciseUpdateSortOrder } from '@/app/(protected)/exercises/_api/updateSortOrder'

// Trainings API
import { checkExists } from '@/app/(protected)/logs/_api/checkExists'
import { deleteTraining } from '@/app/(protected)/logs/_api/deleteTraining'
import { getExerciseHistory } from '@/app/(protected)/logs/_api/getExerciseHistory'
import { getLatestSets } from '@/app/(protected)/logs/_api/getLatestSets'
import { getLatestSetsMultiple } from '@/app/(protected)/logs/_api/getLatestSetsMultiple'
import { getMemos } from '@/app/(protected)/logs/_api/getMemos'
import { getTrainingByDate } from '@/app/(protected)/logs/_api/getTrainingByDate'
import { getTrainings } from '@/app/(protected)/logs/_api/getTrainings'
import { getYearMonths } from '@/app/(protected)/logs/_api/getYearMonths'
import { saveMemos } from '@/app/(protected)/logs/_api/saveMemos'
import { upsertTraining } from '@/app/(protected)/logs/_api/upsertTraining'

// Statistics API
import { getBodyPartTrainingDays } from '@/app/(protected)/statistics/_api/getBodyPartTrainingDays'
import { getBodyPartVolumeTotals } from '@/app/(protected)/statistics/_api/getBodyPartVolumeTotals'
import { getContinuityStats } from '@/app/(protected)/statistics/_api/getContinuityStats'
import { getContinuityTab } from '@/app/(protected)/statistics/_api/getContinuityTab'
import { getExercises as getStatisticsExercises } from '@/app/(protected)/statistics/_api/getExercises'
import { getExerciseTrainingDays } from '@/app/(protected)/statistics/_api/getExerciseTrainingDays'
import { getExerciseVolumeTotals } from '@/app/(protected)/statistics/_api/getExerciseVolumeTotals'
import { getMaxWeightHistory } from '@/app/(protected)/statistics/_api/getMaxWeightHistory'
import { getOneRMHistory } from '@/app/(protected)/statistics/_api/getOneRMHistory'
import { getSummary } from '@/app/(protected)/statistics/_api/getSummary'
import { getTotalVolume } from '@/app/(protected)/statistics/_api/getTotalVolume'
import { getTrainingDaysByPeriod } from '@/app/(protected)/statistics/_api/getTrainingDaysByPeriod'
import { getVolumeByBodyPart } from '@/app/(protected)/statistics/_api/getVolumeByBodyPart'
import { getVolumeByExercise } from '@/app/(protected)/statistics/_api/getVolumeByExercise'
import { getVolumeTab } from '@/app/(protected)/statistics/_api/getVolumeTab'
import { getWeightTab } from '@/app/(protected)/statistics/_api/getWeightTab'

// Timers API
import { createTimer } from '@/app/(protected)/timers/_api/createTimer'
import { deleteTimer } from '@/app/(protected)/timers/_api/deleteTimer'
import { getSounds } from '@/app/(protected)/timers/_api/getSounds'
import { getTimer } from '@/app/(protected)/timers/_api/getTimer'
import { getTimers } from '@/app/(protected)/timers/_api/getTimers'
import { updateSortOrder as timerUpdateSortOrder } from '@/app/(protected)/timers/_api/updateSortOrder'
import { updateTimer } from '@/app/(protected)/timers/_api/updateTimer'

// Exercises サブアプリ
const exercisesApp = new Hono<AuthEnv>()
  .use('*', authMiddleware)
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

// Trainings サブアプリ
const trainingsApp = new Hono<AuthEnv>()
  .use('*', authMiddleware)
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

// Statistics サブアプリ
const statisticsApp = new Hono<AuthEnv>()
  .use('*', authMiddleware)
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

// Timers サブアプリ
const timersApp = new Hono<AuthEnv>()
  .use('*', authMiddleware)
  .route('/', getSounds)
  .route('/', timerUpdateSortOrder)
  .route('/', getTimers)
  .route('/', createTimer)
  .route('/', getTimer)
  .route('/', updateTimer)
  .route('/', deleteTimer)

// メインアプリ
const app = new Hono()
  .basePath('/api')
  .get('/health', (c) => c.json({ status: 'ok' }))
  .route('/exercises', exercisesApp)
  .route('/trainings', trainingsApp)
  .route('/statistics', statisticsApp)
  .route('/timers', timersApp)

export type AppType = typeof app

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
