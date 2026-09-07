import { toOrpcResponse as toResponse } from '@/server/orpc/http'
import { call } from '@orpc/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/timers/sounds')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const [{ createORPCContext }, { router }] = await Promise.all([
            import('@/server/orpc/context'),
            import('@/server/orpc/router'),
          ])
          const context = await createORPCContext(request.headers)
          const result = await call(router.timers.listSounds, {}, { context })
          return Response.json(result)
        } catch (e) {
          return toResponse(e)
        }
      },
    },
  },
})
