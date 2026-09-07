import { toOrpcResponse as toResponse } from '@/server/orpc/http'
import { call } from '@orpc/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/logs/exercises/$exerciseId/history')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const [{ createORPCContext }, { router }] = await Promise.all([
            import('@/server/orpc/context'),
            import('@/server/orpc/router'),
          ])
          const context = await createORPCContext(request.headers)
          const searchParams = new URL(request.url).searchParams
          const result = await call(
            router.logs.getExerciseHistory,
            {
              exerciseId: Number(params.exerciseId),
              excludeDate: searchParams.get('excludeDate') ?? undefined,
            },
            { context },
          )
          return Response.json(result)
        } catch (error) {
          return toResponse(error)
        }
      },
    },
  },
})
