import ProtectedShell from '@/components/protected-shell'
import { getSessionUserIdServerFn } from '@/lib/auth-session-server'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

/**
 * 保護 layout（pathless）。配下6 route（`/`・exercises・logs・statistics・timers・settings）の
 * URL は不変（例: `_protected/exercises.tsx`→`/exercises`）。
 * Next 版 `(protected)/layout.tsx` 相当。各 child は Shell ラッパを持たず、ここで一括提供する。
 * 認証は beforeLoad のサーバ検証が正本（ai-4 格上げ）：
 * - 未認証→`/login` へ redirect
 * - 障害（DB断等）→ redirect せず throw し errorComponent で表示＋リトライ（E2 維持）
 * クライアント側の `ProtectedShell` 内ゲートは第二層として残す（未確定間の描画抑止・エラー表示）。
 */
export const Route = createFileRoute('/_protected')({
  beforeLoad: async () => {
    let result: Awaited<ReturnType<typeof getSessionUserIdServerFn>>
    try {
      result = await getSessionUserIdServerFn()
    } catch (error) {
      console.error('[protected-layout] session check failed', error)
      throw error
    }
    if (result.userId == null) {
      throw redirect({ to: '/login' })
    }
    return { userId: result.userId }
  },
  errorComponent: ({ error, reset }) => (
    <div style={{ padding: 32, maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>セッションの確認に失敗しました</h1>
      <p style={{ color: '#666', fontSize: 14 }}>
        ネットワークやサーバの一時的な障害の可能性があります。再読み込みしても改善しない場合は時間をおいて試してください。
      </p>
      <pre style={{ fontSize: 12, color: '#999', overflow: 'auto' }}>
        {String((error as Error)?.message ?? error)}
      </pre>
      <button type="button" onClick={() => reset()} style={{ minHeight: 48, padding: '0 24px' }}>
        再読み込みする
      </button>
    </div>
  ),
  component: ProtectedLayoutComponent,
})

function ProtectedLayoutComponent() {
  return (
    <ProtectedShell>
      <Outlet />
    </ProtectedShell>
  )
}
