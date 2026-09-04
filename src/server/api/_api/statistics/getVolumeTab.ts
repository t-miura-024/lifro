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

export const getVolumeTab = new Hono<AuthEnv>().get(
  '/volume',
  zValidator('query', querySchema),
  async (c) => {
    const userId = c.get('userId')
    const { granularity, preset, customStartDate, customEndDate } = c.req.valid('query')
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)

    const [volumeByExercise, exerciseVolumeTotals] = await Promise.all([
      statisticsService.getVolumeByExercise(userId, startDate, endDate, granularity),
      statisticsService.getExerciseVolumeTotals(userId, startDate, endDate),
    ])

    const totalVolume = exerciseVolumeTotals.reduce((sum, t) => sum + t.volume, 0)

    return c.json({
      totalVolume,
      volumeByExercise,
      exerciseVolumeTotals,
    })
  },
)
