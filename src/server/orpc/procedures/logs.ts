import { trainingMemoService, trainingService } from '@/server/application/services'
import { z } from 'zod'
import { authed } from '../base'
import { assertValidDateString } from './statistics-helpers'

export const listYearMonths = authed.handler(async ({ context }) => {
  return trainingService.getAvailableYearMonths(context.userId)
})

// NOTE: 旧Hono実体 (`getLatestSetsMultiple.ts`) では POST
// `/exercises/latest-sets-multiple` だったが、読取専用のため
// mutation ではなく query 相当（参照系 procedure）として定義する。
export const getLatestSetsMultiple = authed
  .input(
    z.object({
      exerciseIds: z.array(z.number().int().positive()).max(100),
      excludeDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid date')
        .refine((v) => {
          assertValidDateString(v, '除外日')
          return true
        })
        .optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    const resultMap = await trainingService.getLatestExerciseSetsMultiple(
      context.userId,
      input.exerciseIds,
      input.excludeDate,
    )
    return Object.fromEntries(resultMap)
  })

export const getExerciseHistory = authed
  .input(
    z.object({
      exerciseId: z.coerce.number(),
      excludeDate: z.string().optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    const history = await trainingService.getLatestExerciseHistory(
      context.userId,
      input.exerciseId,
      input.excludeDate,
    )
    if (!history) return null
    return { weight: history.weight, reps: history.reps }
  })

export const getLatestSets = authed
  .input(
    z.object({
      exerciseId: z.coerce.number(),
      excludeDate: z.string().optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    return trainingService.getLatestExerciseSets(
      context.userId,
      input.exerciseId,
      input.excludeDate,
    )
  })

export const listByMonth = authed
  .input(
    z.object({
      year: z.coerce.number(),
      month: z.coerce.number(),
    }),
  )
  .handler(async ({ context, input }) => {
    return trainingService.getMonthlyTrainings(context.userId, input.year, input.month)
  })

export const checkExists = authed
  .input(z.object({ date: z.string() }))
  .handler(async ({ context, input }) => {
    const training = await trainingService.getTrainingByDate(context.userId, input.date)
    return { exists: training !== null && training.sets.length > 0 }
  })

export const getMemos = authed
  .input(z.object({ date: z.string() }))
  .handler(async ({ context, input }) => {
    return trainingMemoService.getMemosByDate(context.userId, input.date)
  })

export const saveMemos = authed
  .input(
    z.object({
      date: z.string(),
      memos: z.array(z.object({ id: z.number().optional(), content: z.string() })),
    }),
  )
  .handler(async ({ context, input }) => {
    return trainingMemoService.saveMemos(context.userId, input.date, input.memos)
  })

export const getByDate = authed
  .input(z.object({ date: z.string() }))
  .handler(async ({ context, input }) => {
    return trainingService.getTrainingByDate(context.userId, input.date)
  })

export const upsert = authed
  .input(
    z.object({
      date: z.string(),
      sets: z.array(
        z.object({
          id: z.number().optional(),
          exerciseId: z.number(),
          weight: z.number(),
          reps: z.number(),
          sortIndex: z.number(),
        }),
      ),
    }),
  )
  .handler(async ({ context, input }) => {
    return trainingService.saveTraining(context.userId, input.date, input.sets)
  })

export const remove = authed
  .input(z.object({ date: z.string() }))
  .handler(async ({ context, input }) => {
    await trainingService.deleteTraining(context.userId, input.date)
    return { success: true }
  })

export const logsRouter = {
  listYearMonths,
  getLatestSetsMultiple,
  getExerciseHistory,
  getLatestSets,
  listByMonth,
  checkExists,
  getMemos,
  saveMemos,
  getByDate,
  upsert,
  remove,
}
