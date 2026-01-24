import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { exerciseService } from '@/server/application/services'

const searchQuerySchema = z.object({
  q: z.string().optional().default(''),
})

export const searchExercises = new Hono<AuthEnv>().get(
  '/search',
  zValidator('query', searchQuerySchema),
  async (c) => {
    const userId = c.get('userId')
    const { q } = c.req.valid('query')
    const exercises = await exerciseService.searchExercises(userId, q)
    return c.json(exercises)
  },
)
