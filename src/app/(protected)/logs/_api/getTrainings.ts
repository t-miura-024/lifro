import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { trainingService } from '@/server/application/services'

const querySchema = z.object({
  year: z.string().transform(Number),
  month: z.string().transform(Number),
})

export const getTrainings = new Hono<AuthEnv>().get(
  '/',
  zValidator('query', querySchema),
  async (c) => {
    const userId = c.get('userId')
    const { year, month } = c.req.valid('query')
    const trainings = await trainingService.getMonthlyTrainings(userId, year, month)
    return c.json(trainings)
  },
)
