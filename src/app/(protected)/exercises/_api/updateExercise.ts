import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { exerciseService } from '@/server/application/services'

const updateExerciseSchema = z.object({
  name: z.string().min(1),
})

export const updateExercise = new Hono<AuthEnv>().put(
  '/:id',
  zValidator('json', updateExerciseSchema),
  async (c) => {
    const userId = c.get('userId')
    const exerciseId = Number(c.req.param('id'))
    const { name } = c.req.valid('json')
    const exercise = await exerciseService.updateExercise(userId, exerciseId, name)
    return c.json(exercise)
  },
)
