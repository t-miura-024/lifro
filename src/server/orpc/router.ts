import { exercisesRouter } from './procedures/exercises'
import { logsRouter } from './procedures/logs'
import { statisticsRouter } from './procedures/statistics'
import { timersRouter } from './procedures/timers'

/**
 * oRPC集約router。4系統44 procedureを束ねる唯一の正本。
 * file routesは `call(router.<domain>.<proc>)` 経由で実行し、
 * orpc-clientの型は `InferRouterInputs/Outputs<AppRouter>` 由来。
 * `/api/health` は意図的に対象外（秘密欠落時も到達する公開healthのため
 * oRPC/services層に触れない `src/routes/api/health.tsx` が直接返却）。
 */
export const router = {
  exercises: exercisesRouter,
  logs: logsRouter,
  statistics: statisticsRouter,
  timers: timersRouter,
}

export type AppRouter = typeof router
