/**
 * Service Worker の登録と更新検知。
 *
 * `src/sw.ts` は `skipWaiting`＋`clientsClaim` のため、新しい SW は
 * インストール直後に有効化され、ページの制御が切り替わる。その切り替わり
 * （`controllerchange`）を「新しいバージョンが有効になった」とみなす。
 * 初回インストール時も `clientsClaim` により `controllerchange` が発火するため、
 * マウント時に controller がいなかった場合は最初の1回だけ通知しない。
 *
 * 更新チェックはページ表示（pageshow）、ウィンドウのフォーカス、タブの可視化、
 * および一定間隔で `registration.update()` を呼ぶ。オフライン等の失敗は
 * 致命的ではないため警告に留め、次回のチェックに任せる。
 */

export const SW_URL = '/sw.js'
export const SW_UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

export type SwUpdateMonitorOptions = {
  container: ServiceWorkerContainer
  onUpdateAvailable: () => void
  checkIntervalMs?: number
}

export function startSwUpdateMonitor({
  container,
  onUpdateAvailable,
  checkIntervalMs = SW_UPDATE_CHECK_INTERVAL_MS,
}: SwUpdateMonitorOptions): () => void {
  let registration: ServiceWorkerRegistration | null = null
  let stopped = false
  // 初回インストール時の clientsClaim を1回だけ読み飛ばす。
  let skipInitialClaim = container.controller === null

  const checkForUpdate = () => {
    if (stopped || !registration) return
    void registration.update().catch((error) => {
      console.warn('[pwa] service worker update check failed', error)
    })
  }

  const handleControllerChange = () => {
    if (stopped) return
    if (skipInitialClaim) {
      skipInitialClaim = false
      return
    }
    onUpdateAvailable()
  }

  const handlePageShow = () => checkForUpdate()
  const handleFocus = () => checkForUpdate()
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') checkForUpdate()
  }

  window.addEventListener('pageshow', handlePageShow)
  window.addEventListener('focus', handleFocus)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  const intervalId = setInterval(checkForUpdate, checkIntervalMs)

  container.addEventListener('controllerchange', handleControllerChange)

  void container
    .register(SW_URL)
    .then((registered) => {
      if (stopped) return
      registration = registered
    })
    .catch((error) => {
      // 登録失敗時はオンライン動作にフォールバックする。握り潰さず警告に出す。
      console.warn('[pwa] service worker registration failed', error)
    })

  return () => {
    stopped = true
    clearInterval(intervalId)
    window.removeEventListener('pageshow', handlePageShow)
    window.removeEventListener('focus', handleFocus)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    container.removeEventListener('controllerchange', handleControllerChange)
  }
}
