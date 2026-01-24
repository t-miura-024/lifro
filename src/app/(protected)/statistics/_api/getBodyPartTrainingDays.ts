import { Hono } from 'hono'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import type { BodyPartGranularity } from '@/server/application/services/StatisticsService'
import { statisticsService } from '@/server/application/services'
import { calculateDateRange } from './helpers'

export const getBodyPartTrainingDays = new Hono<AuthEnv>().get(
  '/body-part-training-days',
  async (c) => {
    const userId = c.get('userId')
    const { preset, startDate: customStartDate, endDate: customEndDate, granularity } = c.req.query()
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate)

    const bodyPartGranularity: BodyPartGranularity =
      granularity === 'bodyPart' ? 'bodyPart' : 'category'

    const days = await statisticsService.getBodyPartTrainingDays(
      userId,
      startDate,
      endDate,
      bodyPartGranularity,
    )
    return c.json(days)
  },
)
