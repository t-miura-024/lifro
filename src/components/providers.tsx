// NOTE（暫定・M5で切替）: `src/app` 依存（`@/app/providers/TimerContext` の
// TimerProvider、`@/app/theme`）。M5 で `src/app` 除去の瞬間に Start 全体が起動不能に
// なる結合のため、切替時に純粋層へ移設して `src/app` 依存を断つ（移設先は
// `docs/migration-cutover.md` 手順8に記録）。それまで本 import は変更しない。
import { TimerProvider } from '@/app/providers/TimerContext'
import theme from '@/app/theme'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { SwRegister } from '@/components/pwa/SwRegister'
import { CssBaseline, ThemeProvider } from '@mui/material'
import type { ReactNode } from 'react'

/**
 * TanStack Start 用プロバイダ群（正本は better-auth 経路）。
 * Next 版 (`src/app/providers/index.tsx`) からの差分は
 * `@mui/material-nextjs` の AppRouterCacheProvider 除去と
 * `next-auth/react` の SessionProvider 除去。
 * Vite 配下では素の ThemeProvider で Emotion キャッシュが動作するため
 * 代替アダプタは不要。セッション状態は `next-auth` ではなく
 * `@/lib/auth-client` の `authClient.useSession` で取得する。
 * Next 温存が必要な SessionProvider は `src/app/providers/index.tsx` 側に残し、
 * 本ファイルには持ち込まない（M5 一括切替で Next 側ごと削除）。
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
