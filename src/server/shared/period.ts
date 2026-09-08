/**
 * 層非依存の期間キー・期間検証ヘルパー。
 *
 * application層・infrastructure層のどちらからもimportできるよう、
 * 特定層への依存（drizzle / console / DB）を持たない共有モジュールとして置く。
 * 縮退政策（warnするかどうか）は呼び出し側の責務とし、本モジュールは
 * onInvalid コールバック経由でのみ通知する（console依存を持たない）。
 */
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

/** 期間集計の粒度 */
export type PeriodGranularity = 'day' | 'week' | 'month'

/** Dayjs を期間キーへ変換する（week は ISO 週 'YYYY-Www'）。 */
export function formatPeriodKey(date: dayjs.Dayjs, granularity: PeriodGranularity): string {
  switch (granularity) {
    case 'day':
      return date.format('YYYY-MM-DD')
    case 'week':
      return `${date.isoWeekYear()}-W${String(date.isoWeek()).padStart(2, '0')}`
    case 'month':
      return date.format('YYYY-MM')
  }
}

/**
 * SQLite 由来の期間値 (raw) を 'YYYY-Www' 等の期間キーへ写像する。
 * TEXT化により不正文字列では strftime/date() が NULL を返すため、
 * NULL/空文字・不正日付は onInvalid に通知して null を返し、
 * 呼び出し側で skip する。単一行の破損で集計全体を 500 にしないための縮退。
 */
export function toPeriodKey(
  raw: string | null | undefined,
  granularity: PeriodGranularity,
  onInvalid?: (message: string) => void,
): string | null {
  if (raw == null || raw === '') {
    onInvalid?.(`[statistics] skip invalid period value: ${String(raw)}`)
    return null
  }
  if (granularity === 'week') {
    const date = dayjs(raw)
    if (!date.isValid()) {
      onInvalid?.(`[statistics] skip invalid week period value: ${String(raw)}`)
      return null
    }
    return formatPeriodKey(date, granularity)
  }
  return raw
}
