import { Hono } from 'hono'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { bodyPartService } from '@/server/application/services'

export const getExercisesWithBodyParts = new Hono<AuthEnv>().get(
  '/with-body-parts',
  async (c) => {
    const userId = c.get('userId')
    const exercises = await bodyPartService.getExercisesWithBodyParts(userId)
    return c.json(exercises)
  },
)
