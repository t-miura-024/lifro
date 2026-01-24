import { Hono } from 'hono'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { trainingService } from '@/server/application/services'

export const deleteTraining = new Hono<AuthEnv>().delete('/:date', async (c) => {
  const userId = c.get('userId')
  const dateStr = c.req.param('date') // YYYY-MM-DD形式
  await trainingService.deleteTraining(userId, dateStr)
  return c.json({ success: true })
})
