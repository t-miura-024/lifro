import { Hono } from 'hono'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { statisticsService } from '@/server/application/services'

export const getSummary = new Hono<AuthEnv>().get('/summary', async (c) => {
  const userId = c.get('userId')
  const summary = await statisticsService.getSummary(userId)
  return c.json(summary)
})
