import { bodyPartService, exerciseService } from '@/server/application/services'
import { ORPCError } from '@orpc/server'
import { z } from 'zod'
import { authed } from '../base'

export const listBodyParts = authed.handler(async () => {
  return bodyPartService.getAllBodyParts()
})

export const listWithBodyParts = authed.handler(async ({ context }) => {
  return bodyPartService.getExercisesWithBodyParts(context.userId)
})

export const search = authed
  .input(z.object({ q: z.string().default('') }))
  .handler(async ({ context, input }) => {
    return exerciseService.searchExercises(context.userId, input.q)
  })

export const updateSortOrder = authed
  .input(
    z.object({
      exercises: z.array(
        z.object({
          id: z.number(),
          sortIndex: z.number(),
        }),
      ),
    }),
  )
  .handler(async ({ context, input }) => {
    await exerciseService.updateSortOrder(context.userId, input.exercises)
    return { success: true }
  })

export const list = authed.handler(async ({ context }) => {
  return exerciseService.getAllExercises(context.userId)
})

export const create = authed
  .input(z.object({ name: z.string().min(1) }))
  .handler(async ({ context, input }) => {
    return exerciseService.createExercise(context.userId, input.name)
  })

export const canDelete = authed
  .input(z.object({ id: z.coerce.number() }))
  .handler(async ({ context, input }) => {
    const canDelete = await exerciseService.canDelete(context.userId, input.id)
    return { canDelete }
  })

export const updateBodyParts = authed
  .input(
    z.object({
      exerciseId: z.coerce.number(),
      bodyParts: z.array(
        z.object({
          bodyPartId: z.number().int().positive(),
          loadRatio: z.number().int().min(0).max(100),
        }),
      ),
    }),
  )
  .handler(async ({ context, input }) => {
    // 旧Hono updateExerciseBodyParts.ts と同一仕様: 空配列はクリア操作として
    // 素通しし、合計検証は非空時のみ適用する。
    if (input.bodyParts.length > 0) {
      const totalRatio = input.bodyParts.reduce((sum, bp) => sum + bp.loadRatio, 0)
      if (totalRatio !== 100) {
        throw new ORPCError('BAD_REQUEST', { message: '負荷割合の合計は100%にしてください' })
      }
    }
    await bodyPartService.updateExerciseBodyParts(context.userId, input.exerciseId, input.bodyParts)
    return { success: true }
  })

export const update = authed
  .input(z.object({ id: z.coerce.number(), name: z.string().min(1) }))
  .handler(async ({ context, input }) => {
    return exerciseService.updateExercise(context.userId, input.id, input.name)
  })

export const remove = authed
  .input(z.object({ id: z.coerce.number() }))
  .handler(async ({ context, input }) => {
    await exerciseService.deleteExercise(context.userId, input.id)
    return { success: true }
  })

export const exercisesRouter = {
  listBodyParts,
  listWithBodyParts,
  search,
  updateSortOrder,
  list,
  create,
  canDelete,
  updateBodyParts,
  update,
  remove,
}
