import { ensureDatabase } from '@/routes/api/-db'
import { toOrpcResponse as toResponse } from '@/server/orpc/http'
import { call } from '@orpc/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/timers/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await ensureDatabase()
          const [{ createORPCContext }, { router }] = await Promise.all([
            import('@/server/orpc/context'),
            import('@/server/orpc/router'),
          ])
          const context = await createORPCContext(request.headers)
          const result = await call(router.timers.list, {}, { context })
          return Response.json(result)
        } catch (e) {
          return toResponse(e)
        }
      },
      POST: async ({ request }) => {
        try {
          await ensureDatabase()
          const [{ createORPCContext }, { router }] = await Promise.all([
            import('@/server/orpc/context'),
            import('@/server/orpc/router'),
          ])
          const context = await createORPCContext(request.headers)
          const input = await request.json()
          const result = await call(router.timers.create, input, { context })
          return Response.json(result, { status: 201 })
        } catch (e) {
          return toResponse(e)
        }
      },
    },
  },
})
