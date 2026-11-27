import { formatPreviousRecordDate } from '@/lib/previous-record-date'
import { describe, expect, it } from 'vitest'

describe('formatPreviousRecordDate', () => {
  it('入力対象日と同年なら年を省略し、経過日数を添える', () => {
    expect(formatPreviousRecordDate('2026-11-21', '2026-11-27')).toBe('11/21（6日前）')
  })

  it('年をまたぐ場合は年を含める', () => {
    expect(formatPreviousRecordDate('2025-12-30', '2026-01-02')).toBe('2025/12/30（3日前）')
  })

  it('入力対象日より後の記録は「後」で表す', () => {
    expect(formatPreviousRecordDate('2026-11-26', '2026-11-21')).toBe('11/26（5日後）')
  })

  it('同じ日は「当日」で表す', () => {
    expect(formatPreviousRecordDate('2026-11-27', '2026-11-27')).toBe('11/27（当日）')
  })

  it('不正な日付はそのまま返す', () => {
    expect(formatPreviousRecordDate('not-a-date', '2026-11-27')).toBe('not-a-date')
  })
})
