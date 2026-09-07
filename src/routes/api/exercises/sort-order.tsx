import { toOrpcResponse as toResponse } from '@/server/orpc/http'
import { call } from '@orpc/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/exercises/sort-order')({
  server: {
    handlers: {
      PUT: async ({ request }) => {
        try {
          const [{ createORPCContext }, { router }] = await Promise.all([
            import('@/server/orpc/context'),
            import('@/server/orpc/router'),
          ])
          const context = await createORPCContext(request.headers)
          const input = await request.json()
          const result = await call(router.exercises.updateSortOrder, input, { context })
          return Response.json(result)
        } catch (e) {
          return toResponse(e)
        }
      },
    },
  },
})
