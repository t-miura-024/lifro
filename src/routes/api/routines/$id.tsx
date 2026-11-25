import { ensureDatabase } from '@/routes/api/-db'
import { toOrpcResponse as toResponse } from '@/server/orpc/http'
import { call } from '@orpc/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/routines/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          await ensureDatabase()
          const [{ createORPCContext }, { router }] = await Promise.all([
            import('@/server/orpc/context'),
            import('@/server/orpc/router'),
          ])
          const context = await createORPCContext(request.headers)
          const result = await call(router.routines.get, { id: Number(params.id) }, { context })
          return Response.json(result)
        } catch (e) {
          return toResponse(e)
        }
      },
      PUT: async ({ request, params }) => {
        try {
          await ensureDatabase()
          const [{ createORPCContext }, { router }] = await Promise.all([
            import('@/server/orpc/context'),
            import('@/server/orpc/router'),
          ])
          const context = await createORPCContext(request.headers)
          const body = await request.json()
          const result = await call(
            router.routines.update,
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
          await ensureDatabase()
          const [{ createORPCContext }, { router }] = await Promise.all([
            import('@/server/orpc/context'),
            import('@/server/orpc/router'),
          ])
          const context = await createORPCContext(request.headers)
          const result = await call(router.routines.remove, { id: Number(params.id) }, { context })
          return Response.json(result)
        } catch (e) {
          return toResponse(e)
        }
      },
    },
  },
})
