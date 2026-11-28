import { startSwUpdateMonitor } from '@/components/pwa/sw-update'
import { Alert, Button, Snackbar } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'

/**
 * TanStack Start 用の Service Worker 登録・更新通知。
 * Next 版では `@serwist/next` が登録まで担っていたが、Vite 側には
 * 同等の自動登録がないため `navigator.serviceWorker` で直接登録する。
 * 新しい SW が有効になったら Snackbar で通知し、ユーザーの操作で
 * リロードする（入力中の内容を消さないため自動リロードはしない）。
 * 開発時は `vite.config.mts` の `disable` と対にし登録しない。
 */
export function SwRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (import.meta.env.DEV) return
    if (!('serviceWorker' in navigator)) return
    return startSwUpdateMonitor({
      container: navigator.serviceWorker,
      onUpdateAvailable: () => setUpdateAvailable(true),
    })
  }, [])

  const handleReload = useCallback(() => {
    // reload 後は更新済み SW が制御しており、同じ更新で controllerchange は
    // 再度発火しない。そのため通知→リロードがループすることはない。
    window.location.reload()
  }, [])

  return (
    <Snackbar
      open={updateAvailable}
      onClose={() => setUpdateAvailable(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity="info"
        onClose={() => setUpdateAvailable(false)}
        action={
          <Button color="inherit" size="small" onClick={handleReload}>
            更新
          </Button>
        }
        sx={{ width: '100%' }}
      >
        新しいバージョンがあります
      </Alert>
    </Snackbar>
  )
}
