import { toOrpcResponse as toResponse } from '@/server/orpc/http'
import { call } from '@orpc/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/logs/exercises/latest-sets-multiple')({
  server: {
    handlers: {
      // 読取専用のためoRPC規約に寄せてGETに再分類する（旧POST互換は保たない。方針通り）。
      GET: async ({ request }) => {
        try {
          const [{ createORPCContext }, { router }] = await Promise.all([
            import('@/server/orpc/context'),
            import('@/server/orpc/router'),
          ])
          const context = await createORPCContext(request.headers)
          const params = new URL(request.url).searchParams
          const exerciseIds = (params.get('exerciseIds') ?? '')
            .split(',')
            .filter(Boolean)
            .map(Number)
          const excludeDate = params.get('excludeDate') ?? undefined
          const result = await call(
            router.logs.getLatestSetsMultiple,
            { exerciseIds, excludeDate },
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
