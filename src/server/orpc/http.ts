import { ORPCError } from '@orpc/server'
export function toOrpcResponse(error: unknown, logPrefix?: string): Response {
  if (error instanceof ORPCError) {
    const status =
      error.code === 'UNAUTHORIZED'
        ? 401
        : error.code === 'BAD_REQUEST'
          ? 400
          : error.code === 'NOT_FOUND'
            ? 404
            : 500
    if (status === 500) console.error(logPrefix ?? '[api]', error)
    return Response.json({ error: error.message || 'Internal Server Error' }, { status })
  }
  console.error(logPrefix ?? '[api]', error)
  return Response.json({ error: 'Internal Server Error' }, { status: 500 })
}
