import TimersPage from '@/components/timers/TimersPage'

/**
 * Next 側の薄いラッパ。ページ本体は framework 非依存の純粋UI層
 * （`@/components/timers/TimersPage`）にあり、Start 側
 * `src/routes/timers.tsx` と共有する。M5 一括切替で Next 版ごと削除する。
 */
export default function NextTimersPage() {
  return <TimersPage />
}
