import { ensureDatabase } from '@/routes/api/-db'
import { toOrpcResponse as toResponse } from '@/server/orpc/http'
import { call } from '@orpc/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/statistics/volume')({
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
          const params = new URL(request.url).searchParams
          const result = await call(
            router.statistics.getVolumeTab,
            {
              granularity: (params.get('granularity') ?? undefined) as 'day' | 'week' | 'month',
              preset: (params.get('preset') ?? undefined) as
                | '1month'
                | '3months'
                | '6months'
                | '1year'
                | 'all'
                | undefined,
              customStartDate: params.get('customStartDate') ?? undefined,
              customEndDate: params.get('customEndDate') ?? undefined,
            },
            { context },
          )
          return Response.json(result)
        } catch (e) {
          return toResponse(e)
        }
      },
    },
  },
})
