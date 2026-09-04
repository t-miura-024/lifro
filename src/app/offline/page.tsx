import OfflinePage from '@/components/offline/OfflinePage'

/**
 * Next 側の薄いラッパ。ページ本体は framework 非依存の純粋UI層
 * （`@/components/offline/OfflinePage`）にあり、Start 側
 * `src/routes/offline.tsx` と共有する。M5 一括切替で Next 版ごと削除する。
 */
export default function NextOfflinePage() {
  return <OfflinePage />
}
