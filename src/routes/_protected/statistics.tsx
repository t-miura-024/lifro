import StatisticsPage from '@/components/statistics/StatisticsPage'
import ProtectedShell from '@/components/protected-shell'
import { createFileRoute } from '@tanstack/react-router'

/**
 * Start 側 `/statistics`。ページ本体は framework 非依存の純粋UI層
 * （`@/components/statistics/StatisticsPage`）を参照し、Next 配下
 * （`src/app/**`）は直接 import しない（arch-1）。Next 側 page も同一純粋層の
 * 薄いラッパであり、Start バンドルに `next/*` は混入しない。
 */
export const Route = createFileRoute('/statistics')({
  component: () => (
    <ProtectedShell>
      <StatisticsPage />
    </ProtectedShell>
  ),
})
