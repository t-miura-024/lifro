/// <reference lib="webworker" />
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist'
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const runtimeCaching: RuntimeCaching[] = [
  // HTMLページ: Stale-While-Revalidate（即座にキャッシュを返し、バックグラウンドで更新）
  {
    matcher: ({ request }) => request.mode === 'navigate',
    handler: new StaleWhileRevalidate({
      cacheName: 'pages-cache',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24時間
        }),
      ],
    }),
  },
  // API: キャッシュしない（常に最新を取得。クライアント state キャッシュへ一本化。ADR 0014）
  {
    matcher: ({ url, request }) => url.pathname.startsWith('/api/') && request.method === 'GET',
    handler: new NetworkOnly(),
  },
  // 静的アセット（画像、フォントなど）: Cache First
  {
    matcher: ({ request }) =>
      request.destination === 'image' ||
      request.destination === 'font' ||
      request.destination === 'style',
    handler: new CacheFirst({
      cacheName: 'static-assets-cache',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
        }),
      ],
    }),
  },
  // Google Fonts: Cache First
  {
    matcher: ({ url }) =>
      url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
    handler: new CacheFirst({
      cacheName: 'google-fonts-cache',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1年
        }),
      ],
    }),
  },
]

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }) {
          return request.destination === 'document'
        },
      },
    ],
  },
})

// 旧 API キャッシュ（ADR 0014 以前の SWR 実装）の残骸を削除する
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.delete('api-cache'))
})

serwist.addEventListeners()
