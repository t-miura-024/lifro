import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { SwRegister } from '@/components/pwa/SwRegister'
import theme from '@/components/theme'
import { TimerProvider } from '@/components/timer/TimerContext'
import { CssBaseline, ThemeProvider } from '@mui/material'
import type { ReactNode } from 'react'

/**
 * TanStack Start 用プロバイダ群（正本は better-auth 経路）。
 * Vite 配下では素の ThemeProvider で Emotion キャッシュが動作するため
 * 代替アダプタは不要。セッション状態は `@/lib/auth-client` の
 * `authClient.useSession` で取得する。
 */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TimerProvider>{children}</TimerProvider>
      <InstallPrompt />
      <SwRegister />
    </ThemeProvider>
  )
}
