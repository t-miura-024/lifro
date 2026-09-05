import { Hono } from 'hono'
import type { AuthEnv } from '@/server/api/middleware/auth'
import { timerService } from '@/server/application/services'

export const deleteTimer = new Hono<AuthEnv>().delete('/:id', async (c) => {
  const userId = c.get('userId')
  const timerId = Number(c.req.param('id'))
  await timerService.deleteTimer(userId, timerId)
  return c.json({ success: true })
})
