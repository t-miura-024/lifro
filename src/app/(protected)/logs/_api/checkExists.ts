import { Hono } from 'hono'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { trainingService } from '@/server/application/services'

export const checkExists = new Hono<AuthEnv>().get('/:date/exists', async (c) => {
  const userId = c.get('userId')
  const dateStr = c.req.param('date') // YYYY-MM-DD形式
  const training = await trainingService.getTrainingByDate(userId, dateStr)
  const exists = training !== null && training.sets.length > 0
  return c.json({ exists })
})
