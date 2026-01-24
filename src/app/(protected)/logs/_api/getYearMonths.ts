import { Hono } from 'hono'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { trainingService } from '@/server/application/services'

export const getYearMonths = new Hono<AuthEnv>().get('/year-months', async (c) => {
  const userId = c.get('userId')
  const yearMonths = await trainingService.getAvailableYearMonths(userId)
  return c.json(yearMonths)
})
