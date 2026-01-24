import { Hono } from 'hono'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import { trainingMemoService } from '@/server/application/services'

export const getMemos = new Hono<AuthEnv>().get('/:date/memos', async (c) => {
  const userId = c.get('userId')
  const dateStr = c.req.param('date') // YYYY-MM-DD形式
  const memos = await trainingMemoService.getMemosByDate(userId, dateStr)
  return c.json(memos)
})
