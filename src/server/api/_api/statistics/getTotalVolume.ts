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

export const getTotalVolume = new Hono<AuthEnv>().get(
  '/total-volume',
  zValidator('query', querySchema),
  async (c) => {
    const userId = c.get('userId')
    const { preset, customStartDate, customEndDate } = c.req.valid('query')
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
    const totals = await statisticsService.getExerciseVolumeTotals(userId, startDate, endDate)
    const totalVolume = totals.reduce((sum, t) => sum + t.volume, 0)
    return c.json({ totalVolume })
  },
)
