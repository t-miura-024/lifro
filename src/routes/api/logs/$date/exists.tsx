import { toOrpcResponse as toResponse } from '@/server/orpc/http'
import { call } from '@orpc/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/logs/$date/exists')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const [{ createORPCContext }, { router }] = await Promise.all([
            import('@/server/orpc/context'),
            import('@/server/orpc/router'),
          ])
          const context = await createORPCContext(request.headers)
          const result = await call(router.logs.checkExists, { date: params.date }, { context })
          return Response.json(result)
        } catch (error) {
          return toResponse(error)
        }
      },
    },
  },
})
