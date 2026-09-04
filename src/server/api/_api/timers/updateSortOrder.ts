import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { timerService } from '@/server/application/services'

const sortOrderSchema = z.object({
  timers: z.array(
    z.object({
      id: z.number(),
      sortIndex: z.number(),
    }),
  ),
})

export const updateSortOrder = new Hono<AuthEnv>().put(
  '/sort-order',
  zValidator('json', sortOrderSchema),
  async (c) => {
    const userId = c.get('userId')
    const { timers } = c.req.valid('json')
    await timerService.updateSortOrder(userId, timers)
    return c.json({ success: true })
  },
)
