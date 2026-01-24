import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { timerService } from '@/server/application/services'

const unitTimerInputSchema = z.object({
  id: z.number().optional(),
  sortIndex: z.number(),
  duration: z.number(),
  countSound: z.string().nullable(),
  countSoundLast3Sec: z.string().nullable(),
  endSound: z.string().nullable(),
})

const timerInputSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  sortIndex: z.number(),
  unitTimers: z.array(unitTimerInputSchema),
})

export const updateTimer = new Hono<AuthEnv>().put(
  '/:id',
  zValidator('json', timerInputSchema),
  async (c) => {
    const userId = c.get('userId')
    const timerId = Number(c.req.param('id'))
    const input = c.req.valid('json')
    const timer = await timerService.updateTimer(userId, timerId, input)
    return c.json(timer)
  },
)
