import type { SoundFile } from '@/constants/sounds'
import { timerService } from '@/server/application/services'
import { z } from 'zod'
import soundsManifest from '../../../../public/sounds/manifest.json'
import { authed } from '../base'

const soundFileSchema = z.object({
  filename: z.string().min(1).max(255).regex(/^[^/\\]+$/, 'invalid filename'),
  name: z.string().min(1).max(255),
})

const unitTimerInputSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
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

export const listSounds = authed.handler(async () => {
  // 旧Hono getSounds.tsと同一契約: manifest取得失敗時は空配列を返す（200）。互換維持のため変更しない。
  // SSRF根治のため自己HTTP fetchは行わず、ビルド時生成のmanifest.jsonをimportする。
  const validated = z.array(soundFileSchema).max(5000).safeParse(soundsManifest)
  if (!validated.success) {
    console.error('Invalid sound manifest shape')
    return [] as SoundFile[]
  }
  return validated.data
})

export const updateSortOrder = authed
  .input(
    z.object({
      timers: z.array(
        z.object({
          id: z.number(),
          sortIndex: z.number(),
        }),
      ),
    }),
  )
  .handler(async ({ context, input }) => {
    await timerService.updateSortOrder(context.userId, input.timers)
    return { success: true }
  })

export const list = authed.handler(async ({ context }) => {
  return timerService.getAllTimers(context.userId)
})

export const create = authed.input(timerInputSchema).handler(async ({ context, input }) => {
  return timerService.createTimer(context.userId, input)
})

export const get = authed
  .input(z.object({ id: z.coerce.number() }))
  .handler(async ({ context, input }) => {
    return timerService.getTimer(context.userId, input.id)
  })

export const update = authed
  .input(timerInputSchema.extend({ id: z.coerce.number() }))
  .handler(async ({ context, input }) => {
    const { id, ...data } = input
    return timerService.updateTimer(context.userId, id, data)
  })

export const remove = authed
  .input(z.object({ id: z.coerce.number() }))
  .handler(async ({ context, input }) => {
    await timerService.deleteTimer(context.userId, input.id)
    return { success: true }
  })

export const timersRouter = {
  listSounds,
  updateSortOrder,
  list,
  create,
  get,
  update,
  remove,
}
