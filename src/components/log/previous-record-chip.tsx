import { formatPreviousRecordDate } from '@/lib/previous-record-date'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import { Chip } from '@mui/material'

type PreviousRecordChipProps = {
  date: string
  targetDate: string
}

/** 前回の実施日を、日付と入力対象日からの相対日数で控えめに表示するチップ。 */
export function PreviousRecordChip({ date, targetDate }: PreviousRecordChipProps) {
  const label = formatPreviousRecordDate(date, targetDate)

  return (
    <Chip
      icon={<CalendarMonthIcon />}
      label={`前回 ${label}`}
      size="small"
      variant="outlined"
      aria-label={`前回の実施日: ${label}`}
      sx={{
        width: 'fit-content',
        height: 28,
        flexShrink: 0,
        bgcolor: 'transparent',
        color: 'text.secondary',
        borderColor: 'divider',
        '& .MuiChip-icon': {
          ml: 0.5,
          mr: -0.25,
          fontSize: 12,
          color: 'text.disabled',
        },
        '& .MuiChip-label': {
          px: { xs: 0.25, sm: 0.75 },
          fontSize: { xs: '0.6rem', sm: '0.75rem' },
          lineHeight: 1,
        },
      }}
    />
  )
}
