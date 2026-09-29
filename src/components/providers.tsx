import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { SwRegister } from '@/components/pwa/SwRegister'
import theme from '@/components/theme'
import { TimerProvider } from '@/components/timer/TimerContext'
import { createQueryClient } from '@/lib/query-client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'

/**
 * TanStack Start 用プロバイダ群（正本は better-auth 経路）。
 * Vite 配下では素の ThemeProvider で Emotion キャッシュが動作するため
 * 代替アダプタは不要。セッション状態は `@/lib/auth-client` の
 * `authClient.useSession` で取得する。
 *
 * QueryClient はブラウザセッション単位でメモリのみ保持する（ADR 0014）。
 * リロード・再起動・別タブでは破棄される。
 */
export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <TimerProvider>{children}</TimerProvider>
        <InstallPrompt />
        <SwRegister />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
