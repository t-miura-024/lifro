import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

/**
 * TanStack Start 用ルーターエントリ。
 * `routeTree.gen.ts` は Start の Vite プラグインが `src/routes/**` から自動生成する。
 */
export function getRouter() {
  const router = createRouter({ routeTree })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
