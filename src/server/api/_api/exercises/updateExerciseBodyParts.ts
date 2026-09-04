import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { bodyPartService } from '@/server/application/services'

const bodyPartInputSchema = z.object({
  bodyPartId: z.number().int().positive(),
  loadRatio: z.number().int().min(0).max(100),
})

const requestSchema = z.object({
  bodyParts: z.array(bodyPartInputSchema),
})

export const updateExerciseBodyParts = new Hono<AuthEnv>().put(
  '/:exerciseId/body-parts',
  zValidator('json', requestSchema),
  async (c) => {
    const userId = c.get('userId')
    const exerciseId = Number(c.req.param('exerciseId'))
    const { bodyParts } = c.req.valid('json')

    // 負荷割合の合計が100%かチェック
    if (bodyParts.length > 0) {
      const totalRatio = bodyParts.reduce((sum, bp) => sum + bp.loadRatio, 0)
      if (totalRatio !== 100) {
        return c.json({ error: '負荷割合の合計は100%にしてください' }, 400)
      }
    }

    await bodyPartService.updateExerciseBodyParts(userId, exerciseId, bodyParts)
    return c.json({ success: true })
  },
)
