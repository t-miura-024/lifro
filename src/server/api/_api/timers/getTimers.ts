import { Hono } from 'hono'
import type { AuthEnv } from '@/server/api/middleware/auth'
import { timerService } from '@/server/application/services'

export const getTimers = new Hono<AuthEnv>().get('/', async (c) => {
  const userId = c.get('userId')
  const timers = await timerService.getAllTimers(userId)
  return c.json(timers)
})
