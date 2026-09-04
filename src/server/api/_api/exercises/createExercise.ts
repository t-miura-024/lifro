import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { exerciseService } from '@/server/application/services'

const createExerciseSchema = z.object({
  name: z.string().min(1),
})

export const createExercise = new Hono<AuthEnv>().post(
  '/',
  zValidator('json', createExerciseSchema),
  async (c) => {
    const userId = c.get('userId')
    const { name } = c.req.valid('json')
    const exercise = await exerciseService.createExercise(userId, name)
    return c.json(exercise, 201)
  },
)
