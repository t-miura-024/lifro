import { toOrpcResponse as toResponse } from '@/server/orpc/http'
import { call } from '@orpc/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/exercises/$id/body-parts')({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        try {
          const [{ createORPCContext }, { router }] = await Promise.all([
            import('@/server/orpc/context'),
            import('@/server/orpc/router'),
          ])
          const context = await createORPCContext(request.headers)
          const body = await request.json()
          const result = await call(
            router.exercises.updateBodyParts,
            { exerciseId: Number(params.id), bodyParts: body.bodyParts },
            { context },
          )
          return Response.json(result)
        } catch (e) {
          return toResponse(e)
        }
      },
    },
  },
})
