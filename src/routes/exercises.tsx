import ExercisesPage from '@/components/exercises/ExercisesPage'
import ProtectedShell from '@/components/protected-shell'
import { createFileRoute } from '@tanstack/react-router'

/**
 * Start 側 `/exercises`。ページ本体は framework 非依存の純粋UI層
 * （`@/components/exercises/ExercisesPage`）を参照し、Next 配下
 * （`src/app/**`）は直接 import しない（arch-1）。Next 側 page も同一純粋層の
 * 薄いラッパであり、Start バンドルに `next/*` は混入しない。
 * 残る Start ルートの Next 直接 import（`@/app/*` 経由）は M5 切替時タスクとして
 * `docs/migration-cutover.md` 手順8に記録する。なお logs・statistics・timers・offline
 * の4ルートは本ファイルと同一パターンで移設済み（純粋UI層＋Next 薄ラッパ）。
 */
export const Route = createFileRoute('/exercises')({
  component: () => (
    <ProtectedShell>
      <ExercisesPage />
    </ProtectedShell>
  ),
})
