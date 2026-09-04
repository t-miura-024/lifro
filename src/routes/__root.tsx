import Providers from '@/components/providers'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'

/**
 * TanStack Start 用ルート。
 * Next 版 `src/app/layout.tsx` からの差分:
 * - `next/font/google` の Geist 読み込みを除去 (Vite 配下では MUI 既定の
 *   システムフォントスタックにフォールバックする。ついで改修なしの範囲)。
 * - `metadata`/`viewport` は head メタに転記。
 */
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: 'lifro' },
      { name: 'description', content: '筋トレログ管理アプリ' },
      {
        name: 'theme-color',
        media: '(prefers-color-scheme: light)',
        content: '#ffffff',
      },
      {
        name: 'theme-color',
        media: '(prefers-color-scheme: dark)',
        content: '#0a0a0a',
      },
    ],
    links: [
      // Next 版は `src/app/manifest.ts` から自動で同リンクを出力していた。
      // Start では静的 `public/manifest.webmanifest` を明示的に結線する。
      { rel: 'manifest', href: '/manifest.webmanifest' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        <Providers>
          <Outlet />
        </Providers>
        <Scripts />
      </body>
    </html>
  )
}
