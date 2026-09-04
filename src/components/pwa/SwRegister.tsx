import { useEffect } from 'react'

/**
 * TanStack Start 用の Service Worker 登録。
 * Next 版では `@serwist/next` が登録まで担っていたが、Vite 側には
 * 同等の自動登録がないため `navigator.serviceWorker` で直接登録する。
 * `src/sw.ts` が `skipWaiting`＋`clientsClaim` のため更新挙動は同等。
 * 開発時は `vite.config.mts` の `disable` と対にし登録しない。
 */
export function SwRegister() {
  useEffect(() => {
    if (import.meta.env.DEV) return
    if (!('serviceWorker' in navigator)) return
    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      // 登録失敗時はオンライン動作にフォールバックする。握り潰さず警告に出す。
      console.warn('[pwa] service worker registration failed', error)
    })
  }, [])

  return null
}
