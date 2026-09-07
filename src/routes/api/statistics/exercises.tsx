import { toOrpcResponse as toResponse } from '@/server/orpc/http'
import { call } from '@orpc/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/statistics/exercises')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const [{ createORPCContext }, { router }] = await Promise.all([
            import('@/server/orpc/context'),
            import('@/server/orpc/router'),
          ])
          const context = await createORPCContext(request.headers)
          const result = await call(router.statistics.listExercises, {}, { context })
          return Response.json(result)
        } catch (e) {
          return toResponse(e)
        }
      },
    },
  },
})
