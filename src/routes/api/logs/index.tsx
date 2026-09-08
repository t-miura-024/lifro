import { ensureDatabase } from '@/routes/api/-db'
import { toOrpcResponse as toResponse } from '@/server/orpc/http'
import { ORPCError, call } from '@orpc/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/logs/')({
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
          const searchParams = new URL(request.url).searchParams
          const yearRaw = searchParams.get('year')
          const monthRaw = searchParams.get('month')
          const year = yearRaw === null || yearRaw.trim() === '' ? Number.NaN : Number(yearRaw)
          const month = monthRaw === null || monthRaw.trim() === '' ? Number.NaN : Number(monthRaw)
          if (!Number.isInteger(year) || !Number.isInteger(month)) {
            return toResponse(
              new ORPCError('BAD_REQUEST', { message: 'year/month query is required' }),
            )
          }
          if (year < 2000 || year > 2100 || month < 1 || month > 12) {
            return toResponse(
              new ORPCError('BAD_REQUEST', { message: 'year/month query is required' }),
            )
          }
          const result = await call(
            router.logs.listByMonth,
            {
              year,
              month,
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
