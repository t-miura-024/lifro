import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { statisticsService } from '@/server/application/services'
import { calculateDateRange } from './helpers'

const querySchema = z.object({
  granularity: z.enum(['day', 'week', 'month']),
  bodyPartGranularity: z.enum(['category', 'bodyPart']).default('category'),
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional(),
})

export const getVolumeByBodyPart = new Hono<AuthEnv>().get(
  '/volume-by-body-part',
  zValidator('query', querySchema),
  async (c) => {
    const userId = c.get('userId')
    const { granularity, bodyPartGranularity, preset, customStartDate, customEndDate } = c.req.valid('query')
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)
    const data = await statisticsService.getVolumeByBodyPart(
      userId,
      startDate,
      endDate,
      granularity,
      bodyPartGranularity,
    )
    return c.json(data)
  },
)
