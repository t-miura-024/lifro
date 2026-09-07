import { exerciseService, statisticsService } from '@/server/application/services'
import { calculateDateRange } from '@/server/orpc/procedures/statistics-helpers'
import { z } from 'zod'
import { authed } from '../base'

const presetSchema = z.enum(['1month', '3months', '6months', '1year', 'all']).optional()

const periodSchema = z.object({
  preset: presetSchema,
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional(),
})

const timeGranularitySchema = z.enum(['day', 'week', 'month'])

const bodyPartGranularitySchema = z.enum(['category', 'bodyPart']).default('category')

const periodWithTimeGranularitySchema = periodSchema.extend({
  granularity: timeGranularitySchema,
})

export const getSummary = authed.handler(async ({ context }) => {
  return statisticsService.getSummary(context.userId)
})

export const listExercises = authed.handler(async ({ context }) => {
  return exerciseService.getAllExercises(context.userId)
})

export const getVolumeTab = authed
  .input(periodWithTimeGranularitySchema)
  .handler(async ({ context, input }) => {
    const { granularity, preset, customStartDate, customEndDate } = input
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)

    const [volumeByExercise, exerciseVolumeTotals] = await Promise.all([
      statisticsService.getVolumeByExercise(context.userId, startDate, endDate, granularity),
      statisticsService.getExerciseVolumeTotals(context.userId, startDate, endDate),
    ])

    const totalVolume = exerciseVolumeTotals.reduce((sum, t) => sum + t.volume, 0)

    return {
      totalVolume,
      volumeByExercise,
      exerciseVolumeTotals,
    }
  })

export const getWeightTab = authed
  .input(
    periodWithTimeGranularitySchema.extend({
      exerciseId: z.coerce.number(),
    }),
  )
  .handler(async ({ context, input }) => {
    const { exerciseId, granularity, preset, customStartDate, customEndDate } = input
    const { startDate, endDate } = calculateDateRange(
      preset,
      customStartDate,
      customEndDate,
      '3months',
    )

    const [maxWeightHistory, oneRMHistory] = await Promise.all([
      statisticsService.getMaxWeightHistory(
        context.userId,
        exerciseId,
        startDate,
        endDate,
        granularity,
      ),
      statisticsService.getOneRMHistory(
        context.userId,
        exerciseId,
        startDate,
        endDate,
        granularity,
      ),
    ])

    return {
      maxWeightHistory,
      oneRMHistory,
    }
  })

export const getContinuityTab = authed
  .input(periodWithTimeGranularitySchema)
  .handler(async ({ context, input }) => {
    const { granularity, preset, customStartDate, customEndDate } = input
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)

    const [stats, daysByPeriod, exerciseDays] = await Promise.all([
      statisticsService.getContinuityStats(context.userId, startDate, endDate),
      statisticsService.getTrainingDaysByPeriod(context.userId, startDate, endDate, granularity),
      statisticsService.getExerciseTrainingDays(context.userId, startDate, endDate),
    ])

    return {
      stats,
      daysByPeriod,
      exerciseDays,
    }
  })

export const getVolumeByExercise = authed
  .input(periodWithTimeGranularitySchema)
  .handler(async ({ context, input }) => {
    const { granularity, preset, customStartDate, customEndDate } = input
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
    return statisticsService.getVolumeByExercise(context.userId, startDate, endDate, granularity)
  })

export const getVolumeByBodyPart = authed
  .input(
    periodWithTimeGranularitySchema.extend({
      bodyPartGranularity: bodyPartGranularitySchema,
    }),
  )
  .handler(async ({ context, input }) => {
    const { granularity, bodyPartGranularity, preset, customStartDate, customEndDate } = input
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
    return statisticsService.getVolumeByBodyPart(
      context.userId,
      startDate,
      endDate,
      granularity,
      bodyPartGranularity,
    )
  })

export const getExerciseVolumeTotals = authed
  .input(periodSchema)
  .handler(async ({ context, input }) => {
    const { preset, customStartDate, customEndDate } = input
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
    return statisticsService.getExerciseVolumeTotals(context.userId, startDate, endDate)
  })

export const getBodyPartVolumeTotals = authed
  .input(
    periodSchema.extend({
      bodyPartGranularity: bodyPartGranularitySchema,
    }),
  )
  .handler(async ({ context, input }) => {
    const { preset, customStartDate, customEndDate, bodyPartGranularity } = input
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
    return statisticsService.getBodyPartVolumeTotals(
      context.userId,
      startDate,
      endDate,
      bodyPartGranularity,
    )
  })

export const getTotalVolume = authed.input(periodSchema).handler(async ({ context, input }) => {
  const { preset, customStartDate, customEndDate } = input
  const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
  const totals = await statisticsService.getExerciseVolumeTotals(context.userId, startDate, endDate)
  const totalVolume = totals.reduce((sum, t) => sum + t.volume, 0)
  return { totalVolume }
})

export const getMaxWeightHistory = authed
  .input(
    periodWithTimeGranularitySchema.extend({
      exerciseId: z.coerce.number(),
    }),
  )
  .handler(async ({ context, input }) => {
    const { exerciseId, granularity, preset, customStartDate, customEndDate } = input
    const { startDate, endDate } = calculateDateRange(
      preset,
      customStartDate,
      customEndDate,
      '3months',
    )
    return statisticsService.getMaxWeightHistory(
      context.userId,
      exerciseId,
      startDate,
      endDate,
      granularity,
    )
  })

export const getOneRMHistory = authed
  .input(
    periodWithTimeGranularitySchema.extend({
      exerciseId: z.coerce.number(),
    }),
  )
  .handler(async ({ context, input }) => {
    const { exerciseId, granularity, preset, customStartDate, customEndDate } = input
    const { startDate, endDate } = calculateDateRange(
      preset,
      customStartDate,
      customEndDate,
      '3months',
    )
    return statisticsService.getOneRMHistory(
      context.userId,
      exerciseId,
      startDate,
      endDate,
      granularity,
    )
  })

export const getContinuityStats = authed.input(periodSchema).handler(async ({ context, input }) => {
  const { preset, customStartDate, customEndDate } = input
  const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
  return statisticsService.getContinuityStats(context.userId, startDate, endDate)
})

export const getTrainingDaysByPeriod = authed
  .input(periodWithTimeGranularitySchema)
  .handler(async ({ context, input }) => {
    const { granularity, preset, customStartDate, customEndDate } = input
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
    return statisticsService.getTrainingDaysByPeriod(
      context.userId,
      startDate,
      endDate,
      granularity,
    )
  })

export const getExerciseTrainingDays = authed
  .input(periodSchema)
  .handler(async ({ context, input }) => {
    const { preset, customStartDate, customEndDate } = input
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
    return statisticsService.getExerciseTrainingDays(context.userId, startDate, endDate)
  })

export const getBodyPartTrainingDays = authed
  .input(
    periodSchema.extend({
      bodyPartGranularity: bodyPartGranularitySchema,
    }),
  )
  .handler(async ({ context, input }) => {
    const { preset, customStartDate, customEndDate, bodyPartGranularity } = input
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
    return statisticsService.getBodyPartTrainingDays(
      context.userId,
      startDate,
      endDate,
      bodyPartGranularity,
    )
  })

export const statisticsRouter = {
  getSummary,
  listExercises,
  getVolumeTab,
  getWeightTab,
  getContinuityTab,
  getVolumeByExercise,
  getVolumeByBodyPart,
  getExerciseVolumeTotals,
  getBodyPartVolumeTotals,
  getTotalVolume,
  getMaxWeightHistory,
  getOneRMHistory,
  getContinuityStats,
  getTrainingDaysByPeriod,
  getExerciseTrainingDays,
  getBodyPartTrainingDays,
}
