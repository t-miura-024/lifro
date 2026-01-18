'use client'

import { useTimer } from '@/app/providers/TimerContext'
import BarChartIcon from '@mui/icons-material/BarChart'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import ListAltIcon from '@mui/icons-material/ListAlt'
import SettingsIcon from '@mui/icons-material/Settings'
import TimerIcon from '@mui/icons-material/Timer'
import { BottomNavigation, BottomNavigationAction, Box, Container, Paper } from '@mui/material'
import { usePathname, useRouter } from 'next/navigation'
import TimerOverlay from './TimerOverlay'

const navItems = [
  { label: '種目', icon: <ListAltIcon />, path: '/exercises' },
  { label: 'ログ', icon: <FitnessCenterIcon />, path: '/logs' },
  { label: '統計', icon: <BarChartIcon />, path: '/statistics' },
  { label: 'タイマー', icon: <TimerIcon />, path: '/timers' },
  { label: '設定', icon: <SettingsIcon />, path: '/settings' },
]

export default function ProtectedShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { status } = useTimer()

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
            router.push(navItems[newValue].path)
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
