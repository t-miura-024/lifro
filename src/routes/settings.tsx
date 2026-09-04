import ProtectedShell from '@/components/protected-shell'
import StartSettingsPage from '@/components/settings-page'
import { createFileRoute } from '@tanstack/react-router'

/**
 * Start 側 `/settings`。旧 `SettingsPage`（`next-auth/react` 直結）をそのまま使うと
 * Start の Providers（`SessionProvider` なし）下ではセッションが永久に null・
 * ログアウトが 404 化するため、better-auth 対応の `StartSettingsPage` を使う。
 * 旧ページ本体（`src/app` 配下）は編集しない。
 */
export const Route = createFileRoute('/settings')({
  component: () => (
    <ProtectedShell>
      <StartSettingsPage />
    </ProtectedShell>
  ),
})
