'use client'

import theme from '@/app/theme'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import { SessionProvider } from 'next-auth/react'
import type { ReactNode } from 'react'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AppRouterCacheProvider options={{ enableCssLayer: true }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
          <InstallPrompt />
        </ThemeProvider>
      </AppRouterCacheProvider>
    </SessionProvider>
  )
}
