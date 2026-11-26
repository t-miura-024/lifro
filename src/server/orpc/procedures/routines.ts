import { routineService } from '@/server/application/services'
import { DuplicateRoutineNameError } from '@/server/domain/routine-errors'
import { ORPCError } from '@orpc/server'
import { z } from 'zod'
import { authed } from '../base'

const routineSetInputSchema = z.object({
  exerciseId: z.number(),
  sortIndex: z.number(),
  targetReps: z.number().nullable(),
})

const routineInputSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  sortIndex: z.number(),
  routineSets: z.array(routineSetInputSchema),
})

export const updateSortOrder = authed
  .input(
    z.object({
      routines: z.array(
        z.object({
          id: z.number(),
          sortIndex: z.number(),
        }),
      ),
    }),
  )
  .handler(async ({ context, input }) => {
    await routineService.updateSortOrder(context.userId, input.routines)
    return { success: true }
  })

export const list = authed.handler(async ({ context }) => {
  return routineService.getAllRoutines(context.userId)
})

/**
 * ドメインエラーを HTTP クライアントへそのまま提示できる ORPCError へ写像する。
 * 写像しないエラーは従来どおり 500（汎用文言）に落とす。
 */
function rethrowAsOrpcError(error: unknown): never {
  if (error instanceof DuplicateRoutineNameError) {
    throw new ORPCError('CONFLICT', { message: error.message })
  }
  throw error
}

export const create = authed.input(routineInputSchema).handler(async ({ context, input }) => {
  try {
    return await routineService.createRoutine(context.userId, input)
  } catch (error) {
    rethrowAsOrpcError(error)
  }
})

export const get = authed
  .input(z.object({ id: z.coerce.number() }))
  .handler(async ({ context, input }) => {
    return routineService.getRoutine(context.userId, input.id)
  })

export const update = authed
  .input(routineInputSchema.extend({ id: z.coerce.number() }))
  .handler(async ({ context, input }) => {
    const { id, ...data } = input
    try {
      return await routineService.updateRoutine(context.userId, id, data)
    } catch (error) {
      rethrowAsOrpcError(error)
    }
  })

export const remove = authed
  .input(z.object({ id: z.coerce.number() }))
  .handler(async ({ context, input }) => {
    await routineService.deleteRoutine(context.userId, input.id)
    return { success: true }
  })

export const routinesRouter = {
  updateSortOrder,
  list,
  create,
  get,
  update,
  remove,
}
