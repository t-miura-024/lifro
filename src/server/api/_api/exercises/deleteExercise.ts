import { Hono } from 'hono'
import type { AuthEnv } from '@/server/api/middleware/auth'
import { exerciseService } from '@/server/application/services'

export const deleteExercise = new Hono<AuthEnv>().delete('/:id', async (c) => {
  const userId = c.get('userId')
  const exerciseId = Number(c.req.param('id'))
  await exerciseService.deleteExercise(userId, exerciseId)
  return c.json({ success: true })
})
