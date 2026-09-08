import { sql, type SQL } from 'drizzle-orm'
import type { PeriodGranularity } from '@/server/shared/period'

export type { PeriodGranularity } from '@/server/shared/period'

/**
 * week粒度のMonday丸めに使う SQLite date 修飾子。
 *
 * - 'weekday 0' で直近の日曜日へ進め、'-6 days' で6日戻すことで
 *   その週の Monday 日付に束ねる（ISO 週の Monday 起点に合わせるため）。
 * - SQLite の %W（Monday起点だが年始の扱いが ISO と異なる）や
 *   %Y-%W の通年ずれを避けるため直接使わない。呼び出し側で
 *   toPeriodKey() により 'YYYY-Www' へ写像する。
 */
export const WEEK_START_WEEKDAY_MODIFIER = 'weekday 0'
export const WEEK_START_SHIFT_MODIFIER = '-6 days'

/**
 * D1/SQLite 用の期間キー式。sets.date は TEXT (YYYY-MM-DD) のため
 * strftime/date で組み立てる。week は上記の Monday 日付で束ねる。
 */
export function getPeriodExprSql(column: SQL, granularity: PeriodGranularity): SQL {
  switch (granularity) {
    case 'day':
      return sql`strftime('%Y-%m-%d', ${column})`
    case 'week':
      return sql`date(${column}, ${sql.raw(`'${WEEK_START_WEEKDAY_MODIFIER}'`)}, ${sql.raw(`'${WEEK_START_SHIFT_MODIFIER}'`)})`
    case 'month':
      return sql`strftime('%Y-%m', ${column})`
  }
}
