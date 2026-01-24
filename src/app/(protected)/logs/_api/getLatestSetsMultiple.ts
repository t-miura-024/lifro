import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { trainingService } from '@/server/application/services'

const requestSchema = z.object({
  exerciseIds: z.array(z.number()),
  excludeDate: z.string().optional(), // YYYY-MM-DD形式
})

export const getLatestSetsMultiple = new Hono<AuthEnv>().post(
  '/exercises/latest-sets-multiple',
  zValidator('json', requestSchema),
  async (c) => {
    const userId = c.get('userId')
    const { exerciseIds, excludeDate } = c.req.valid('json')
    const resultMap = await trainingService.getLatestExerciseSetsMultiple(
      userId,
      exerciseIds,
      excludeDate,
    )
    // MapをRecordに変換（JSONシリアライズ可能にする）
    return c.json(Object.fromEntries(resultMap))
  },
)
