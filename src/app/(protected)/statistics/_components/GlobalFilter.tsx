'use client'

import type { TimeGranularity } from '@/server/application/services/StatisticsService'
import {
  Box,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/ja'

export type TimeRange = {
  preset: string
  customStartDate?: string
  customEndDate?: string
}

type Props = {
  granularity: TimeGranularity
  onGranularityChange: (granularity: TimeGranularity) => void
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
}

const PRESETS = [
  { value: '1month', label: '過去1ヶ月' },
  { value: '3months', label: '過去3ヶ月' },
  { value: '6months', label: '過去6ヶ月' },
  { value: '1year', label: '過去1年' },
  { value: 'all', label: '全期間' },
  { value: 'custom', label: 'カスタム' },
]

export default function GlobalFilter({
  granularity,
  onGranularityChange,
  timeRange,
  onTimeRangeChange,
}: Props) {
  const handleGranularityChange = (
    _: React.MouseEvent<HTMLElement>,
    newGranularity: TimeGranularity | null,
  ) => {
    if (newGranularity !== null) {
      onGranularityChange(newGranularity)
    }
  }

  const handlePresetChange = (preset: string) => {
    if (preset === 'custom') {
      onTimeRangeChange({
        preset: 'custom',
        customStartDate: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
        customEndDate: dayjs().format('YYYY-MM-DD'),
      })
    } else {
      onTimeRangeChange({ preset })
    }
  }

  const handleStartDateChange = (date: Dayjs | null) => {
    if (date) {
      onTimeRangeChange({
        ...timeRange,
        customStartDate: date.format('YYYY-MM-DD'),
      })
    }
  }

  const handleEndDateChange = (date: Dayjs | null) => {
    if (date) {
      onTimeRangeChange({
        ...timeRange,
        customEndDate: date.format('YYYY-MM-DD'),
      })
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        {/* 時間粒度 */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            時間粒度
          </Typography>
          <ToggleButtonGroup
            value={granularity}
            exclusive
            onChange={handleGranularityChange}
            size="small"
            fullWidth
          >
            <ToggleButton value="day">日</ToggleButton>
            <ToggleButton value="week">週</ToggleButton>
            <ToggleButton value="month">月</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* 時間範囲 */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            期間
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              value={timeRange.preset}
              onChange={(e) => handlePresetChange(e.target.value)}
              sx={{ fontSize: 14 }}
            >
              {PRESETS.map((preset) => (
                <MenuItem key={preset.value} value={preset.value} sx={{ fontSize: 14 }}>
                  {preset.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* カスタム日付選択 */}
        {timeRange.preset === 'custom' && (
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
            <Stack direction="row" spacing={1}>
              <DatePicker
                label="開始日"
                value={timeRange.customStartDate ? dayjs(timeRange.customStartDate) : null}
                onChange={handleStartDateChange}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    sx: { '& input': { fontSize: 14 } },
                  },
                }}
              />
              <DatePicker
                label="終了日"
                value={timeRange.customEndDate ? dayjs(timeRange.customEndDate) : null}
                onChange={handleEndDateChange}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    sx: { '& input': { fontSize: 14 } },
                  },
                }}
              />
            </Stack>
          </LocalizationProvider>
        )}
      </Stack>
    </Paper>
  )
}
