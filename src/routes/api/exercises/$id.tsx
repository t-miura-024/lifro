import { toOrpcResponse as toResponse } from '@/server/orpc/http'
import { call } from '@orpc/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/exercises/$id')({
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
            router.exercises.update,
            { id: Number(params.id), name: body.name },
            { context },
          )
          return Response.json(result)
        } catch (e) {
          return toResponse(e)
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          const [{ createORPCContext }, { router }] = await Promise.all([
            import('@/server/orpc/context'),
            import('@/server/orpc/router'),
          ])
          const context = await createORPCContext(request.headers)
          const result = await call(router.exercises.remove, { id: Number(params.id) }, { context })
          return Response.json(result)
        } catch (e) {
          return toResponse(e)
        }
      },
    },
  },
})
