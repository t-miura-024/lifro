import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { statisticsService } from '@/server/application/services'
import { calculateDateRange } from './helpers'

const querySchema = z.object({
  granularity: z.enum(['day', 'week', 'month']),
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional(),
})

export const getContinuityTab = new Hono<AuthEnv>().get(
  '/continuity',
  zValidator('query', querySchema),
  async (c) => {
    const userId = c.get('userId')
    const { granularity, preset, customStartDate, customEndDate } = c.req.valid('query')
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)

    const [stats, daysByPeriod, exerciseDays] = await Promise.all([
      statisticsService.getContinuityStats(userId, startDate, endDate),
      statisticsService.getTrainingDaysByPeriod(userId, startDate, endDate, granularity),
      statisticsService.getExerciseTrainingDays(userId, startDate, endDate),
    ])

    return c.json({
      stats,
      daysByPeriod,
      exerciseDays,
    })
  },
)
