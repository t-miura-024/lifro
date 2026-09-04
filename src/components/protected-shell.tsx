// NOTE（暫定・M5で切替）: `src/app` 依存（`@/(protected)/_components/TimerOverlay`、
// `@/app/providers/TimerContext` の useTimerStatus）。M5 で `src/app` 除去の瞬間に
// 全5保護ルートの Shell が道連れで壊れる結合のため、切替時に純粋層へ移設して
// `src/app` 依存を断つ（移設先は `docs/migration-cutover.md` 手順8に記録）。
// それまで本 import は変更しない。
import TimerOverlay from '@/app/(protected)/_components/TimerOverlay'
import { useTimerStatus } from '@/app/providers/TimerContext'
import { authClient } from '@/lib/auth-client'
import BarChartIcon from '@mui/icons-material/BarChart'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import ListAltIcon from '@mui/icons-material/ListAlt'
import SettingsIcon from '@mui/icons-material/Settings'
import TimerIcon from '@mui/icons-material/Timer'
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Container,
  Paper,
  Typography,
} from '@mui/material'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

// NOTE（E4 見送り）: navItems＋レイアウト本体は Next 版
// （`src/app/(protected)/_components/ProtectedShell.tsx`）との逐語複写で2並列に
// 分裂している。共有コンポーネントへの切り出しは M5 切替時タスクとして
// `docs/migration-cutover.md` 手順8に記録し、今回は見送る（変更のたび2ファイルを
// shotgun 編集する暫定状態。片方だけ変更時の乖離に注意）。
const navItems = [
  { label: '種目', icon: <ListAltIcon />, path: '/exercises' },
  { label: 'ログ', icon: <FitnessCenterIcon />, path: '/logs' },
  { label: '統計', icon: <BarChartIcon />, path: '/statistics' },
  { label: 'タイマー', icon: <TimerIcon />, path: '/timers' },
  { label: '設定', icon: <SettingsIcon />, path: '/settings' },
] as const

/**
 * TanStack Start 用 ProtectedShell。
 * Next 版 (`src/app/(protected)/_components/ProtectedShell.tsx`) からの差分は
 * `next/navigation` の usePathname/useRouter を
 * `@tanstack/react-router` の useLocation/useNavigate に置換した点と、
 * Next 版 `layout.tsx` のサーバガード相当として better-auth セッション検証＋
 * 未認証時 `/login` リダイレクト＋未確定間の描画抑止を暫定実装した点。
 * M5 で file route の beforeLoad/loader によるサーバ検証に格上げする
 * （追跡先: `docs/migration-cutover.md` 手順8の格上げタスク。ai-4）。
 */
export default function ProtectedShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = useLocation({ select: (s) => s.pathname })
  const navigate = useNavigate()
  // status のみ購読する（毎秒の残り時間更新では再レンダしない。E3）。
  const status = useTimerStatus()
  const { data: session, isPending, error } = authClient.useSession()

  // DB断等の 500 系（error != null）を未認証に化けさせない。`/login` へ飛ばさず
  // エラー表示・リトライに落とし、console.error で運用検知できるようにする（E2）。
  useEffect(() => {
    if (error != null) {
      console.error('[protected-shell] useSession failed', error)
    }
  }, [error])

  useEffect(() => {
    if (!isPending && error == null && !session) {
      void navigate({ to: '/login' })
    }
  }, [isPending, error, session, navigate])

  // セッション検証の障害時は追放せずエラー表示＋リトライにする（E2）。
  // 有効セッション保持者が一過性障害で `/login` へ飛ばされるのを防ぐ。
  if (error != null) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <Container maxWidth="sm" sx={{ py: 8, flexGrow: 1 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            セッションの確認に失敗しました
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            ネットワークやサーバの一時的な障害の可能性があります。再読み込みしても改善しない場合は時間をおいて試してください。
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            sx={{ minHeight: 48 }}
          >
            再読み込みする
          </Button>
        </Container>
      </Box>
    )
  }

  // 未認証・未確定の間は保護ページを描画しない（API を叩かない表示の素通し防止）。
  if (isPending || !session) return null

  const currentNavIndex = navItems.findIndex((item) => pathname.startsWith(item.path))
  const isTimerActive = status !== 'idle'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      {/* タイマー実行時のオーバーレイ */}
      <TimerOverlay />

      <Container
        maxWidth="sm"
        sx={{
          py: 2,
          flexGrow: 1,
          pb: 'calc(56px + env(safe-area-inset-bottom) + 16px)',
          // タイマー実行中は上部にパディングを追加（オーバーレイの高さ分）
          pt: isTimerActive ? 'calc(env(safe-area-inset-top) + 80px)' : 2,
          transition: 'padding-top 0.3s ease',
        }}
      >
        {children}
      </Container>

      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          pb: 'env(safe-area-inset-bottom)',
        }}
        elevation={3}
      >
        <BottomNavigation
          showLabels
          value={currentNavIndex >= 0 ? currentNavIndex : 0}
          onChange={(_, newValue) => {
            navigate({ to: navItems[newValue].path })
          }}
        >
          {navItems.map((item) => (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              icon={item.icon}
              sx={{ minWidth: 60 }}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  )
}
