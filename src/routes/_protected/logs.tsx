import LogsPage from '@/components/logs/LogsPage'
import ProtectedShell from '@/components/protected-shell'
import { createFileRoute } from '@tanstack/react-router'

/**
 * Start 側 `/logs`。ページ本体は framework 非依存の純粋UI層
 * （`@/components/logs/LogsPage`）を参照し、Next 配下
 * （`src/app/**`）は直接 import しない（arch-1）。Next 側 page も同一純粋層の
 * 薄いラッパであり、Start バンドルに `next/*` は混入しない。
 */
export const Route = createFileRoute('/logs')({
  component: () => (
    <ProtectedShell>
      <LogsPage />
    </ProtectedShell>
  ),
})
