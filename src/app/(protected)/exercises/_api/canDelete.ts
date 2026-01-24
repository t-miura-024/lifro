import { Hono } from 'hono'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { exerciseService } from '@/server/application/services'

export const canDelete = new Hono<AuthEnv>().get('/:id/can-delete', async (c) => {
  const userId = c.get('userId')
  const exerciseId = Number(c.req.param('id'))
  const canDelete = await exerciseService.canDelete(userId, exerciseId)
  return c.json({ canDelete })
})
