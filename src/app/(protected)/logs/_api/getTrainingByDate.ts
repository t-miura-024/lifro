import { Hono } from 'hono'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { trainingService } from '@/server/application/services'

export const getTrainingByDate = new Hono<AuthEnv>().get('/:date', async (c) => {
  const userId = c.get('userId')
  const dateStr = c.req.param('date') // YYYY-MM-DD形式
  const training = await trainingService.getTrainingByDate(userId, dateStr)
  return c.json(training)
})
