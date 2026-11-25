import { Outlet, createFileRoute } from '@tanstack/react-router'

/**
 * ルーティン管理の layout route。
 * 一覧（`/routines`）・作成（`/routines/new`）・編集（`/routines/$routineId`）を束ねる。
 */
export const Route = createFileRoute('/_protected/routines')({
  component: () => <Outlet />,
})
