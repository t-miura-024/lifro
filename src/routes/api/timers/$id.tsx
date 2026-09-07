import { toOrpcResponse as toResponse } from '@/server/orpc/http'
import { call } from '@orpc/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/timers/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const [{ createORPCContext }, { router }] = await Promise.all([
            import('@/server/orpc/context'),
            import('@/server/orpc/router'),
          ])
          const context = await createORPCContext(request.headers)
          const result = await call(router.timers.get, { id: Number(params.id) }, { context })
          return Response.json(result)
        } catch (e) {
          return toResponse(e)
        }
      },
      PUT: async ({ request, params }) => {
        try {
          const [{ createORPCContext }, { router }] = await Promise.all([
            import('@/server/orpc/context'),
            import('@/server/orpc/router'),
          ])
          const context = await createORPCContext(request.headers)
          const body = await request.json()
          const result = await call(
            router.timers.update,
            { ...body, id: Number(params.id) },
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
          const result = await call(router.timers.remove, { id: Number(params.id) }, { context })
          return Response.json(result)
        } catch (e) {
          return toResponse(e)
        }
      },
    },
  },
})
