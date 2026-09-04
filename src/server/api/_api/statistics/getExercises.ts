import { Hono } from 'hono'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { exerciseService } from '@/server/application/services'

export const getExercises = new Hono<AuthEnv>().get('/exercises', async (c) => {
  const userId = c.get('userId')
  const exercises = await exerciseService.getAllExercises(userId)
  return c.json(exercises)
})
