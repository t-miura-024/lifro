import { ORPCError } from '@orpc/server'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

const ALLOWED_PRESETS = ['1month', '3months', '6months', '1year', 'all'] as const

const DATE_FORMAT = 'YYYY-MM-DD'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * カスタム日付文字列を検証する
 */
export function assertValidDateString(value: string, fieldName: string): void {
  if (!DATE_PATTERN.test(value) || !dayjs(value, DATE_FORMAT, true).isValid()) {
    throw new ORPCError('BAD_REQUEST', {
      message: `${fieldName}は${DATE_FORMAT}形式の有効な日付で指定してください`,
    })
  }
}

/**
 * プリセット期間から開始日を計算
 */
export function getStartDateFromPreset(preset: string): Date {
  const today = dayjs()
  switch (preset) {
    case '1month':
      return today.subtract(1, 'month').toDate()
    case '3months':
      return today.subtract(3, 'month').toDate()
    case '6months':
      return today.subtract(6, 'month').toDate()
    case '1year':
      return today.subtract(1, 'year').toDate()
    case 'all':
      return new Date('2000-01-01')
    default:
      throw new ORPCError('BAD_REQUEST', { message: `不正なpresetです: ${preset}` })
  }
}

/**
 * 日付範囲を計算するヘルパー
 */
export function calculateDateRange(
  preset?: string,
  customStartDate?: string,
  customEndDate?: string,
  defaultPreset = '1month',
): { startDate: Date; endDate: Date } {
  const effectivePreset = preset || defaultPreset
  if (!(ALLOWED_PRESETS as readonly string[]).includes(effectivePreset)) {
    throw new ORPCError('BAD_REQUEST', { message: `不正なpresetです: ${effectivePreset}` })
  }
  if (customStartDate !== undefined) {
    assertValidDateString(customStartDate, '開始日')
  }
  if (customEndDate !== undefined) {
    assertValidDateString(customEndDate, '終了日')
  }
  const endDate = customEndDate ? dayjs(customEndDate).toDate() : dayjs().toDate()
  const startDate = customStartDate
    ? dayjs(customStartDate).toDate()
    : getStartDateFromPreset(effectivePreset)
  if (startDate > endDate) {
    throw new ORPCError('BAD_REQUEST', { message: '開始日は終了日以前にしてください' })
  }
  return { startDate, endDate }
}
