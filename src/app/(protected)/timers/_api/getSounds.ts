import { Hono } from 'hono'
import type { AuthEnv } from '@/app/_lib/hono/middleware/auth'
import type { SoundFile } from '@/constants/sounds'

export const getSounds = new Hono<AuthEnv>().get('/sounds', async (c) => {
  try {
    // リクエストヘッダーからホスト情報を取得
    const host = c.req.header('host') || 'localhost:3000'
    const protocol = c.req.header('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`

    const response = await fetch(`${baseUrl}/sounds/manifest.json`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('Failed to fetch sound manifest:', response.status)
      return c.json<SoundFile[]>([])
    }

    const sounds: SoundFile[] = await response.json()
    return c.json(sounds)
  } catch (error) {
    console.error('Failed to fetch sound manifest:', error)
    return c.json<SoundFile[]>([])
  }
})
