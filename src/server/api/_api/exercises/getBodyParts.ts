import { Hono } from 'hono'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { bodyPartService } from '@/server/application/services'

export const getBodyParts = new Hono<AuthEnv>().get('/body-parts', async (c) => {
  const bodyParts = await bodyPartService.getAllBodyParts()
  return c.json(bodyParts)
})
