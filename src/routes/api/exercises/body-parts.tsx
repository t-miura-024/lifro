import { ensureDatabase } from '@/routes/api/-db'
import { toOrpcResponse as toResponse } from '@/server/orpc/http'
import { call } from '@orpc/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/exercises/body-parts')({
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
          const result = await call(router.exercises.listBodyParts, {}, { context })
          return Response.json(result)
        } catch (e) {
          return toResponse(e)
        }
      },
    },
  },
})
