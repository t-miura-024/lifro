import { Hono } from 'hono'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { timerService } from '@/server/application/services'

export const deleteTimer = new Hono<AuthEnv>().delete('/:id', async (c) => {
  const userId = c.get('userId')
  const timerId = Number(c.req.param('id'))
  await timerService.deleteTimer(userId, timerId)
  return c.json({ success: true })
})
