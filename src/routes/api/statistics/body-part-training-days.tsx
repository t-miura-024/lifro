import { ensureDatabase } from '@/routes/api/-db'
import { toOrpcResponse as toResponse } from '@/server/orpc/http'
import { ORPCError, call } from '@orpc/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/statistics/body-part-training-days')({
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
          // 新キーのみ受付。旧キー (granularity/startDate/endDate) は Issue #21 により
          // 後方互換を維持しない方針のため明示的に400とする。
          if (params.has('granularity') || params.has('startDate') || params.has('endDate')) {
            return toResponse(
              new ORPCError('BAD_REQUEST', {
                message:
                  'legacy query keys (granularity/startDate/endDate) are not supported. Use bodyPartGranularity/customStartDate/customEndDate. See Issue #21.',
              }),
            )
          }
          const result = await call(
            router.statistics.getBodyPartTrainingDays,
            {
              bodyPartGranularity: (params.get('bodyPartGranularity') ?? undefined) as
                | 'category'
                | 'bodyPart'
                | undefined,
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
