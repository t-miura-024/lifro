import { QueryClient } from '@tanstack/react-query'

/**
 * クライアント state キャッシュの QueryClient（ADR 0014）。
 *
 * - メモリのみ。リロード・再起動・別タブでは破棄する
 * - 画面遷移では再取得しない（キャッシュ済みデータをそのまま表示する）
 * - 更新は「保存・更新成功時の resetCacheFor*」と「リロード（全破棄）」のみ
 * - サーバー側（Workers Cache）と Service Worker の API キャッシュは持たない
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: Number.POSITIVE_INFINITY,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
