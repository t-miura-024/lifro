import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { trainingService } from '@/server/application/services'

const querySchema = z.object({
  excludeDate: z.string().optional(), // YYYY-MM-DD形式
})

export const getLatestSets = new Hono<AuthEnv>().get(
  '/exercises/:exerciseId/latest-sets',
  zValidator('query', querySchema),
  async (c) => {
    const userId = c.get('userId')
    const exerciseId = Number(c.req.param('exerciseId'))
    const { excludeDate } = c.req.valid('query')
    const latestSets = await trainingService.getLatestExerciseSets(userId, exerciseId, excludeDate)
    return c.json(latestSets)
  },
)
