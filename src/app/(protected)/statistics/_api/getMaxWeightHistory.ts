import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { statisticsService } from '@/server/application/services'
import { calculateDateRange } from './helpers'

const querySchema = z.object({
  exerciseId: z.string().transform(Number),
  granularity: z.enum(['day', 'week', 'month']),
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional(),
})

export const getMaxWeightHistory = new Hono<AuthEnv>().get(
  '/max-weight-history',
  zValidator('query', querySchema),
  async (c) => {
    const userId = c.get('userId')
    const { exerciseId, granularity, preset, customStartDate, customEndDate } = c.req.valid('query')
    const { startDate, endDate } = calculateDateRange(
      preset,
      customStartDate,
      customEndDate,
      '3months',
    )
    const data = await statisticsService.getMaxWeightHistory(
      userId,
      exerciseId,
      startDate,
      endDate,
      granularity,
    )
    return c.json(data)
  },
)
