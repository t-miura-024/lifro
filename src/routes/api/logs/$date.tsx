import { ensureDatabase } from '@/routes/api/-db'
import { toOrpcResponse as toResponse } from '@/server/orpc/http'
import { call } from '@orpc/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/logs/$date')({
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
          const result = await call(router.logs.getByDate, { date: params.date }, { context })
          return Response.json(result)
        } catch (error) {
          return toResponse(error)
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
            router.logs.upsert,
            { date: params.date, sets: body.sets },
            { context },
          )
          return Response.json(result)
        } catch (error) {
          return toResponse(error)
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
          const result = await call(router.logs.remove, { date: params.date }, { context })
          return Response.json(result)
        } catch (error) {
          return toResponse(error)
        }
      },
    },
  },
})
