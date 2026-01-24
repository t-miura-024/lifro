import dayjs from 'dayjs'

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
      return today.subtract(1, 'month').toDate()
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
  const endDate = customEndDate ? dayjs(customEndDate).toDate() : dayjs().toDate()
  const startDate = customStartDate
    ? dayjs(customStartDate).toDate()
    : getStartDateFromPreset(preset || defaultPreset)
  return { startDate, endDate }
}
