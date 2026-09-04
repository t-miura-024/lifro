import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { trainingMemoService } from '@/server/application/services'

const memoInputSchema = z.object({
  id: z.number().optional(),
  content: z.string(),
})

const saveMemosSchema = z.object({
  memos: z.array(memoInputSchema),
})

export const saveMemos = new Hono<AuthEnv>().put(
  '/:date/memos',
  zValidator('json', saveMemosSchema),
  async (c) => {
    const userId = c.get('userId')
    const dateStr = c.req.param('date') // YYYY-MM-DD形式
    const { memos } = c.req.valid('json')
    const savedMemos = await trainingMemoService.saveMemos(userId, dateStr, memos)
    return c.json(savedMemos)
  },
)
