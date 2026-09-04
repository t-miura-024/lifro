import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { statisticsService } from '@/server/application/services'
import { calculateDateRange } from './helpers'

const querySchema = z.object({
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional(),
})

export const getExerciseVolumeTotals = new Hono<AuthEnv>().get(
  '/exercise-volume-totals',
  zValidator('query', querySchema),
  async (c) => {
    const userId = c.get('userId')
    const { preset, customStartDate, customEndDate } = c.req.valid('query')
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
    const data = await statisticsService.getExerciseVolumeTotals(userId, startDate, endDate)
    return c.json(data)
  },
)
