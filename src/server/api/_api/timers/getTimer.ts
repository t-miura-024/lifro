import { Hono } from 'hono'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { timerService } from '@/server/application/services'

export const getTimer = new Hono<AuthEnv>().get('/:id', async (c) => {
  const userId = c.get('userId')
  const timerId = Number(c.req.param('id'))
  const timer = await timerService.getTimer(userId, timerId)
  return c.json(timer)
})
