import StatisticsPage from '@/components/statistics/StatisticsPage'

/**
 * Next 側の薄いラッパ。ページ本体は framework 非依存の純粋UI層
 * （`@/components/statistics/StatisticsPage`）にあり、Start 側
 * `src/routes/statistics.tsx` と共有する。M5 一括切替で Next 版ごと削除する。
 */
export default function NextStatisticsPage() {
  return <StatisticsPage />
}
