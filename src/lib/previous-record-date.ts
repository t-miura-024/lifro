import dayjs from 'dayjs'

/**
 * 前回実施日を、入力対象日を基準にした表示用ラベルへ整形する。
 *
 * - 入力対象日と同年なら「11/21」、年をまたぐなら「2025/11/21」のように年を含める
 * - 対象日より前なら「6日前」、後なら「5日後」、同じ日なら「当日」を添える
 */
export function formatPreviousRecordDate(previousDate: string, targetDate: string): string {
  const previous = dayjs(previousDate)
  const target = dayjs(targetDate)
  if (!previous.isValid() || !target.isValid()) return previousDate

  const dateLabel =
    previous.year() === target.year() ? previous.format('M/D') : previous.format('YYYY/M/D')
  const diffDays = previous.startOf('day').diff(target.startOf('day'), 'day')
  const relativeLabel =
    diffDays === 0 ? '当日' : diffDays > 0 ? `${diffDays}日後` : `${Math.abs(diffDays)}日前`

  return `${dateLabel}（${relativeLabel}）`
}
