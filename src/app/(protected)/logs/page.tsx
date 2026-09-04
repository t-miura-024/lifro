import LogsPage from '@/components/logs/LogsPage'

/**
 * Next 側の薄いラッパ。ページ本体は framework 非依存の純粋UI層
 * （`@/components/logs/LogsPage`）にあり、Start 側
 * `src/routes/logs.tsx` と共有する。M5 一括切替で Next 版ごと削除する。
 */
export default function NextLogsPage() {
  return <LogsPage />
}
