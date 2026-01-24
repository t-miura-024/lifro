import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { trainingService } from '@/server/application/services'

const setInputSchema = z.object({
  id: z.number().optional(),
  exerciseId: z.number(),
  weight: z.number(),
  reps: z.number(),
  sortIndex: z.number(),
})

const upsertTrainingSchema = z.object({
  sets: z.array(setInputSchema),
})

export const upsertTraining = new Hono<AuthEnv>().put(
  '/:date',
  zValidator('json', upsertTrainingSchema),
  async (c) => {
    const userId = c.get('userId')
    const dateStr = c.req.param('date') // YYYY-MM-DD形式
    const { sets } = c.req.valid('json')
    const training = await trainingService.saveTraining(userId, dateStr, sets)
    return c.json(training)
  },
)
