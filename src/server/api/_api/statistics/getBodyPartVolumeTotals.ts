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
  granularity: z.enum(['category', 'bodyPart']).default('category'),
})

export const getBodyPartVolumeTotals = new Hono<AuthEnv>().get(
  '/body-part-volume-totals',
  zValidator('query', querySchema),
  async (c) => {
    const userId = c.get('userId')
    const { preset, customStartDate, customEndDate, granularity } = c.req.valid('query')
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
    const data = await statisticsService.getBodyPartVolumeTotals(userId, startDate, endDate, granularity)
    return c.json(data)
  },
)
