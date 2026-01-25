/// <reference lib="webworker" />
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist'
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from 'serwist'

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
  // ログ詳細API: キャッシュしない（常に最新データを取得）
  {
    matcher: ({ url, request }) =>
      /^\/api\/trainings\/\d{4}-\d{2}-\d{2}$/.test(url.pathname) &&
      request.method === 'GET',
    handler: new NetworkOnly(),
  },
  // GET API: Stale-While-Revalidate（即座にキャッシュを返し、バックグラウンドで更新）
  {
    matcher: ({ url, request }) =>
      url.pathname.startsWith('/api/') && request.method === 'GET',
    handler: new StaleWhileRevalidate({
      cacheName: 'api-cache',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 60 * 60, // 1時間
        }),
      ],
    }),
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
      url.origin === 'https://fonts.googleapis.com' ||
      url.origin === 'https://fonts.gstatic.com',
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

serwist.addEventListeners()
