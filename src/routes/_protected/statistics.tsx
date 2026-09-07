import { orpc } from '@/lib/orpc-client'
import type {
  BodyPartGranularity,
  BodyPartTrainingDays,
  BodyPartVolumeByPeriod,
  BodyPartVolumeTotal,
  ContinuityStats,
  ExerciseTrainingDays,
  ExerciseVolumeByPeriod,
  ExerciseVolumeTotal,
  MaxWeightRecord,
  OneRMRecord,
  TimeGranularity,
  TrainingDaysByPeriod,
} from '@/server/application/services/StatisticsService'
import type { Exercise } from '@/server/domain/entities'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import DateRangeIcon from '@mui/icons-material/DateRange'
import EventRepeatIcon from '@mui/icons-material/EventRepeat'
import ScaleIcon from '@mui/icons-material/Scale'
import {
  Box,
  FormControl,
  Grid,
  List,
  ListItem,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { createFileRoute } from '@tanstack/react-router'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/ja'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type TimeRange = {
  preset: string
  customStartDate?: string
  customEndDate?: string
}

/**
 * oRPC の preset は 'custom' を受け付けないため、カスタム期間は
 * preset を省略し customStartDate/customEndDate で範囲指定する
 * （旧 Hono は preset:'custom' を素通ししていたが意味は同じ）。
 */
function toOrpcPreset(
  preset: string,
): '1month' | '3months' | '6months' | '1year' | 'all' | undefined {
  return preset === 'custom'
    ? undefined
    : (preset as '1month' | '3months' | '6months' | '1year' | 'all')
}

/** 部位カテゴリの表示名 */
const categoryLabels: Record<string, string> = {
  CHEST: '胸',
  BACK: '背中',
  SHOULDER: '肩',
  ARM: '腕',
  ABS: '腹筋',
  LEG: '脚',
}

function formatPeriodLabel(period: string): string {
  // YYYY-MM-DD -> M/D
  if (period.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [, month, day] = period.split('-')
    return `${Number(month)}/${Number(day)}`
  }
  // YYYY-Www -> w週
  if (period.match(/^\d{4}-W\d{2}$/)) {
    const week = period.split('-W')[1]
    return `${Number(week)}週`
  }
  // YYYY-MM -> M月
  if (period.match(/^\d{4}-\d{2}$/)) {
    const [, month] = period.split('-')
    return `${Number(month)}月`
  }
  return period
}

/** カテゴリ別の色（視認性の良い色分け） */
const CATEGORY_COLORS: Record<string, string> = {
  CHEST: '#1976d2', // 青
  BACK: '#2e7d32', // 緑
  SHOULDER: '#ed6c02', // オレンジ
  ARM: '#9c27b0', // 紫
  ABS: '#d32f2f', // 赤
  LEG: '#0288d1', // 水色
}

/** 詳細部位用の色パレット */
const BODY_PART_COLORS = [
  '#1976d2',
  '#2e7d32',
  '#ed6c02',
  '#d32f2f',
  '#9c27b0',
  '#0288d1',
  '#388e3c',
  '#f57c00',
  '#c62828',
  '#7b1fa2',
  '#0277bd',
  '#1b5e20',
  '#ff5722',
  '#673ab7',
  '#00796b',
]

// 種目ごとの色パレット
const COLORS = [
  '#1976d2',
  '#2e7d32',
  '#ed6c02',
  '#d32f2f',
  '#9c27b0',
  '#0288d1',
  '#388e3c',
  '#f57c00',
  '#c62828',
  '#7b1fa2',
  '#0277bd',
  '#1b5e20',
]

type PillToggleOption<T extends string> = {
  value: T
  label: string
}

type PillToggleProps<T extends string> = {
  value: T
  options: PillToggleOption<T>[]
  onChange: (value: T) => void
}

function PillToggle<T extends string>({ value, options, onChange }: PillToggleProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  useEffect(() => {
    if (!containerRef.current) return

    const selectedIndex = options.findIndex((opt) => opt.value === value)
    const buttons = containerRef.current.querySelectorAll<HTMLElement>('[data-pill-button]')

    if (buttons[selectedIndex]) {
      const button = buttons[selectedIndex]
      setIndicatorStyle({
        left: button.offsetLeft,
        width: button.offsetWidth,
      })
    }
  }, [value, options])

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'inline-flex',
        position: 'relative',
        bgcolor: 'action.hover',
        borderRadius: '16px',
        p: '3px',
      }}
    >
      {/* スライドする背景 */}
      <Box
        sx={{
          position: 'absolute',
          top: '3px',
          height: 'calc(100% - 6px)',
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
          bgcolor: 'background.paper',
          borderRadius: '13px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          transition: 'left 0.2s ease-out, width 0.2s ease-out',
        }}
      />

      {/* ボタン */}
      {options.map((option) => (
        <Box
          key={option.value}
          data-pill-button
          onClick={() => onChange(option.value)}
          sx={{
            position: 'relative',
            zIndex: 1,
            px: 1.5,
            py: 0.5,
            fontSize: '0.8125rem',
            fontWeight: value === option.value ? 600 : 400,
            color: value === option.value ? 'text.primary' : 'text.secondary',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'color 0.15s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              color: 'text.primary',
            },
          }}
        >
          {option.label}
        </Box>
      ))}
    </Box>
  )
}

type StatsCardProps = {
  title: string
  value: string | number
  icon?: ReactNode
  color?: string
}

function StatsCard({ title, value, icon, color = 'primary.main' }: StatsCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {icon && (
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          {icon}
        </Box>
      )}
      <Box>
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
      </Box>
    </Paper>
  )
}

type GlobalFilterProps = {
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

function GlobalFilter({
  granularity,
  onGranularityChange,
  timeRange,
  onTimeRangeChange,
}: GlobalFilterProps) {
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

type BodyPartVolumeListProps = {
  data: BodyPartVolumeTotal[]
  granularity: 'category' | 'bodyPart'
  onGranularityChange: (granularity: 'category' | 'bodyPart') => void
}

function BodyPartVolumeList({ data, granularity, onGranularityChange }: BodyPartVolumeListProps) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2">部位別ボリューム</Typography>
          <PillToggle
            value={granularity}
            options={[
              { value: 'category', label: 'カテゴリ' },
              { value: 'bodyPart', label: '部位' },
            ]}
            onChange={onGranularityChange}
          />
        </Box>
        <Box
          sx={{
            py: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography color="text.secondary" variant="body2">
            データがありません
          </Typography>
        </Box>
      </Paper>
    )
  }

  const maxVolume = Math.max(...data.map((d) => d.volume))

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">部位別ボリューム</Typography>
        <PillToggle
          value={granularity}
          options={[
            { value: 'category', label: 'カテゴリ' },
            { value: 'bodyPart', label: '部位' },
          ]}
          onChange={onGranularityChange}
        />
      </Box>
      <List dense disablePadding>
        {data.map((item, index) => {
          const percentage = (item.volume / maxVolume) * 100
          const displayName =
            granularity === 'category'
              ? categoryLabels[item.category] || item.category
              : `${categoryLabels[item.category] || item.category} - ${item.bodyPartName}`

          return (
            <ListItem
              key={`${item.category}-${item.bodyPartId}`}
              sx={{
                px: 1,
                py: 0.75,
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {index + 1}. {displayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.volume >= 1000
                      ? `${(item.volume / 1000).toFixed(1)}t`
                      : `${item.volume.toLocaleString()}kg`}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 4,
                    bgcolor: 'grey.200',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${percentage}%`,
                      bgcolor: 'secondary.main',
                      borderRadius: 2,
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {item.setCount}セット
                </Typography>
              </Box>
            </ListItem>
          )
        })}
      </List>
    </Paper>
  )
}

type BodyPartTrainingDaysProps = {
  data: BodyPartTrainingDays[]
  granularity: 'category' | 'bodyPart'
  onGranularityChange: (granularity: 'category' | 'bodyPart') => void
}

function BodyPartTrainingDaysList({
  data,
  granularity,
  onGranularityChange,
}: BodyPartTrainingDaysProps) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2">部位別トレーニング日数</Typography>
          <PillToggle
            value={granularity}
            options={[
              { value: 'category', label: 'カテゴリ' },
              { value: 'bodyPart', label: '部位' },
            ]}
            onChange={onGranularityChange}
          />
        </Box>
        <Box
          sx={{
            py: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography color="text.secondary" variant="body2">
            データがありません
          </Typography>
        </Box>
      </Paper>
    )
  }

  const maxDays = Math.max(...data.map((d) => d.days))

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">部位別トレーニング日数</Typography>
        <PillToggle
          value={granularity}
          options={[
            { value: 'category', label: 'カテゴリ' },
            { value: 'bodyPart', label: '部位' },
          ]}
          onChange={onGranularityChange}
        />
      </Box>
      <List dense disablePadding>
        {data.map((item, index) => {
          const percentage = (item.days / maxDays) * 100
          const displayName =
            granularity === 'category'
              ? categoryLabels[item.category] || item.category
              : `${categoryLabels[item.category] || item.category} - ${item.bodyPartName}`

          return (
            <ListItem
              key={granularity === 'category' ? item.category : item.bodyPartId}
              sx={{
                px: 1,
                py: 0.75,
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {index + 1}. {displayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.days}日
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 4,
                    bgcolor: 'grey.200',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${percentage}%`,
                      bgcolor: 'success.main',
                      borderRadius: 2,
                    }}
                  />
                </Box>
              </Box>
            </ListItem>
          )
        })}
      </List>
    </Paper>
  )
}

type ExerciseVolumeListProps = {
  data: ExerciseVolumeTotal[]
}

function ExerciseVolumeList({ data }: ExerciseVolumeListProps) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          種目別ボリューム
        </Typography>
        <Box
          sx={{
            py: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography color="text.secondary" variant="body2">
            データがありません
          </Typography>
        </Box>
      </Paper>
    )
  }

  const maxVolume = Math.max(...data.map((d) => d.volume))

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        種目別ボリューム
      </Typography>
      <List dense disablePadding>
        {data.map((item, index) => {
          const percentage = (item.volume / maxVolume) * 100
          return (
            <ListItem
              key={item.exerciseId}
              sx={{
                px: 1,
                py: 0.75,
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {index + 1}. {item.exerciseName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.volume >= 1000
                      ? `${(item.volume / 1000).toFixed(1)}t`
                      : `${item.volume.toLocaleString()}kg`}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 4,
                    bgcolor: 'grey.200',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${percentage}%`,
                      bgcolor: 'primary.main',
                      borderRadius: 2,
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {item.setCount}セット
                </Typography>
              </Box>
            </ListItem>
          )
        })}
      </List>
    </Paper>
  )
}

type StackedVolumeChartProps = {
  data: ExerciseVolumeByPeriod[]
}

function StackedVolumeChart({ data }: StackedVolumeChartProps) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          ボリューム推移
        </Typography>
        <Box
          sx={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography color="text.secondary">データがありません</Typography>
        </Box>
      </Paper>
    )
  }

  // データを期間ごとにグループ化
  const periodMap = new Map<string, Record<string, number>>()
  const exerciseNames = new Set<string>()
  const exerciseSetCounts = new Map<string, Map<string, number>>() // period -> exerciseName -> setCount

  for (const item of data) {
    exerciseNames.add(item.exerciseName)
    let volumes = periodMap.get(item.period)
    if (volumes == null) {
      volumes = {}
      periodMap.set(item.period, volumes)
    }
    volumes[item.exerciseName] = item.volume

    // セット数も保存
    let setCounts = exerciseSetCounts.get(item.period)
    if (setCounts == null) {
      setCounts = new Map()
      exerciseSetCounts.set(item.period, setCounts)
    }
    setCounts.set(item.exerciseName, item.setCount)
  }

  const chartData = Array.from(periodMap.entries())
    .map(([period, volumes]) => ({
      period,
      periodLabel: formatPeriodLabel(period),
      ...volumes,
    }))
    .sort((a, b) => a.period.localeCompare(b.period))

  const exerciseList = Array.from(exerciseNames)
  const exerciseColors: Record<string, string> = {}
  exerciseList.forEach((name, index) => {
    exerciseColors[name] = COLORS[index % COLORS.length]
  })

  // カスタムTooltip
  type TooltipEntry = {
    dataKey: string
    name: string
    value: number
    fill: string
    payload?: { period: string }
  }
  type CustomTooltipProps = {
    active?: boolean
    payload?: TooltipEntry[]
    label?: string
  }
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length > 0) {
      const period = payload[0]?.payload?.period
      return (
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            {label}
          </Typography>
          {payload.map((entry: TooltipEntry) => {
            const setCount =
              period == null ? 0 : (exerciseSetCounts.get(period)?.get(entry.dataKey) ?? 0)
            return (
              <Box key={entry.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: entry.fill,
                  }}
                />
                <Typography variant="caption">
                  {entry.name}: {entry.value.toLocaleString()}kg ({setCount}セット)
                </Typography>
              </Box>
            )
          })}
        </Paper>
      )
    }
    return null
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ pl: 1 }}>
        ボリューム推移
      </Typography>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="periodLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconSize={10}
            formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
          />
          {exerciseList.map((name) => (
            <Bar
              key={name}
              dataKey={name}
              stackId="volume"
              fill={exerciseColors[name]}
              radius={[0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  )
}

type StackedBodyPartVolumeChartProps = {
  data: BodyPartVolumeByPeriod[]
  granularity: BodyPartGranularity
  onGranularityChange: (granularity: BodyPartGranularity) => void
}

function StackedBodyPartVolumeChart({
  data,
  granularity,
  onGranularityChange,
}: StackedBodyPartVolumeChartProps) {
  const toggleButton = (
    <PillToggle
      value={granularity}
      options={[
        { value: 'category', label: 'カテゴリ' },
        { value: 'bodyPart', label: '部位' },
      ]}
      onChange={onGranularityChange}
    />
  )

  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2">部位別ボリューム推移</Typography>
          {toggleButton}
        </Box>
        <Box
          sx={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography color="text.secondary">データがありません</Typography>
        </Box>
      </Paper>
    )
  }

  // データを期間ごとにグループ化
  const periodMap = new Map<string, Record<string, number>>()
  const bodyPartKeys = new Set<string>()

  for (const item of data) {
    // 表示名を決定（カテゴリ or カテゴリ-部位名）
    const displayKey =
      granularity === 'category'
        ? categoryLabels[item.category] || item.category
        : `${categoryLabels[item.category] || item.category}-${item.bodyPartName}`

    bodyPartKeys.add(displayKey)
    if (!periodMap.has(item.period)) {
      periodMap.set(item.period, {})
    }
    const periodData = periodMap.get(item.period)
    if (periodData) {
      periodData[displayKey] = item.volume
    }
  }

  const chartData = Array.from(periodMap.entries())
    .map(([period, volumes]) => ({
      period,
      periodLabel: formatPeriodLabel(period),
      ...volumes,
    }))
    .sort((a, b) => a.period.localeCompare(b.period))

  const bodyPartList = Array.from(bodyPartKeys)
  const bodyPartColors: Record<string, string> = {}

  if (granularity === 'category') {
    // カテゴリの場合は固定色を使用
    for (const displayKey of bodyPartList) {
      // 日本語ラベルからカテゴリを逆引き
      const category = Object.entries(categoryLabels).find(([, label]) => label === displayKey)?.[0]
      bodyPartColors[displayKey] = category ? CATEGORY_COLORS[category] : '#999999'
    }
  } else {
    // 詳細部位の場合はパレットから割り当て
    bodyPartList.forEach((key, index) => {
      bodyPartColors[key] = BODY_PART_COLORS[index % BODY_PART_COLORS.length]
    })
  }

  // カスタムTooltip
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: Array<{ dataKey: string; name: string; value: number; fill: string }>
    label?: string
  }) => {
    if (active && payload && payload.length > 0) {
      return (
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            {label}
          </Typography>
          {payload.map((entry) => (
            <Box key={entry.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: entry.fill,
                }}
              />
              <Typography variant="caption">
                {entry.name}: {Math.round(entry.value).toLocaleString()}kg
              </Typography>
            </Box>
          ))}
        </Paper>
      )
    }
    return null
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
          pl: 1,
        }}
      >
        <Typography variant="subtitle2">部位別ボリューム推移</Typography>
        {toggleButton}
      </Box>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="periodLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconSize={10}
            formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
          />
          {bodyPartList.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="volume"
              fill={bodyPartColors[key]}
              radius={[0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  )
}

type ContinuityTabProps = {
  stats: ContinuityStats | null
  daysByPeriod: TrainingDaysByPeriod[]
  exerciseDays: ExerciseTrainingDays[]
}

function ContinuityTab({ stats, daysByPeriod, exerciseDays }: ContinuityTabProps) {
  const chartData = daysByPeriod.map((d) => ({
    period: d.period,
    periodLabel: formatPeriodLabel(d.period),
    days: d.days,
  }))

  const maxDays = exerciseDays.length > 0 ? Math.max(...exerciseDays.map((d) => d.days)) : 0

  return (
    <Stack spacing={2}>
      {/* KPIカード */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <StatsCard
            title="トレーニング日数"
            value={stats?.totalDays || 0}
            icon={<CalendarMonthIcon />}
            color="#2e7d32"
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <StatsCard
            title="連続週数"
            value={stats?.currentStreakWeeks || 0}
            icon={<DateRangeIcon />}
            color="#ed6c02"
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <StatsCard
            title="連続月数"
            value={stats?.currentStreakMonths || 0}
            icon={<EventRepeatIcon />}
            color="#d32f2f"
          />
        </Grid>
      </Grid>

      {/* トレーニング日数グラフ */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ pl: 1 }}>
          トレーニング日数推移
        </Typography>
        {chartData.length === 0 || chartData.every((d) => d.days === 0) ? (
          <Box
            sx={{
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography color="text.secondary">データがありません</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="periodLabel"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value) => [`${value}日`, 'トレーニング日数']}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="days" fill="#2e7d32" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>

      {/* 種目別トレーニング日数リスト */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          種目別トレーニング日数
        </Typography>
        {exerciseDays.length === 0 ? (
          <Box
            sx={{
              py: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography color="text.secondary" variant="body2">
              データがありません
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {exerciseDays.map((item, index) => {
              const percentage = maxDays > 0 ? (item.days / maxDays) * 100 : 0
              return (
                <ListItem
                  key={item.exerciseId}
                  sx={{
                    px: 1,
                    py: 0.75,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {index + 1}. {item.exerciseName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.days}日
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        height: 4,
                        bgcolor: 'grey.200',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: '100%',
                          width: `${percentage}%`,
                          bgcolor: 'success.main',
                          borderRadius: 2,
                        }}
                      />
                    </Box>
                  </Box>
                </ListItem>
              )
            })}
          </List>
        )}
      </Paper>
    </Stack>
  )
}

type WeightTabProps = {
  exercises: Exercise[]
  selectedExerciseId: number | null
  onExerciseChange: (exerciseId: number) => void
  maxWeightHistory: MaxWeightRecord[]
  oneRMHistory: OneRMRecord[]
}

function WeightTab({
  exercises,
  selectedExerciseId,
  onExerciseChange,
  maxWeightHistory,
  oneRMHistory,
}: WeightTabProps) {
  const maxWeightData = maxWeightHistory.map((d) => ({
    period: d.period,
    periodLabel: formatPeriodLabel(d.period),
    weight: d.weight,
  }))

  const oneRMData = oneRMHistory.map((d) => ({
    period: d.period,
    periodLabel: formatPeriodLabel(d.period),
    oneRM: d.oneRM,
  }))

  return (
    <Stack spacing={2}>
      {/* 種目選択 */}
      <FormControl fullWidth size="small">
        <Select
          value={selectedExerciseId || ''}
          onChange={(e) => onExerciseChange(Number(e.target.value))}
          displayEmpty
          sx={{ fontSize: 14 }}
        >
          {exercises.map((ex) => (
            <MenuItem key={ex.id} value={ex.id} sx={{ fontSize: 14 }}>
              {ex.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* 最大重量グラフ */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ pl: 1 }}>
          最大重量
        </Typography>
        {maxWeightData.length === 0 ? (
          <Box
            sx={{
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography color="text.secondary">データがありません</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={maxWeightData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="periodLabel"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip
                formatter={(value) => [`${value} kg`, '最大重量']}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="weight" fill="#2e7d32" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>

      {/* 1RMグラフ */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ pl: 1 }}>
          推定1RM
        </Typography>
        {oneRMData.length === 0 ? (
          <Box
            sx={{
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography color="text.secondary">データがありません</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={oneRMData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="periodLabel"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip
                formatter={(value) => [`${value} kg`, '1RM']}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="oneRM" fill="#9c27b0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>
    </Stack>
  )
}

/**
 * 統計ページ本体（純粋UI層。データ取得は `@/lib/orpc-client` 経由）。
 */
function StatisticsPage() {
  // フィルター状態
  const [granularity, setGranularity] = useState<TimeGranularity>('day')
  const [timeRange, setTimeRange] = useState<TimeRange>({ preset: '1month' })
  const [activeTab, setActiveTab] = useState(0)

  // ボリュームタブのデータ
  const [totalVolume, setTotalVolume] = useState<number>(0)
  const [volumeByExercise, setVolumeByExercise] = useState<ExerciseVolumeByPeriod[]>([])
  const [exerciseVolumeTotals, setExerciseVolumeTotals] = useState<ExerciseVolumeTotal[]>([])

  // 重量タブのデータ
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null)
  const [maxWeightHistory, setMaxWeightHistory] = useState<MaxWeightRecord[]>([])
  const [oneRMHistory, setOneRMHistory] = useState<OneRMRecord[]>([])

  // 継続タブのデータ
  const [continuityStats, setContinuityStats] = useState<ContinuityStats | null>(null)
  const [trainingDaysByPeriod, setTrainingDaysByPeriod] = useState<TrainingDaysByPeriod[]>([])
  const [exerciseTrainingDays, setExerciseTrainingDays] = useState<ExerciseTrainingDays[]>([])

  // 部位別統計のデータ
  const [bodyPartGranularity, setBodyPartGranularity] = useState<BodyPartGranularity>('category')
  const [bodyPartVolumeTotals, setBodyPartVolumeTotals] = useState<BodyPartVolumeTotal[]>([])
  const [volumeByBodyPart, setVolumeByBodyPart] = useState<BodyPartVolumeByPeriod[]>([])
  const [bodyPartTrainingDays, setBodyPartTrainingDays] = useState<BodyPartTrainingDays[]>([])

  const [isLoading, startLoading] = useTransition()

  // 共通のデータ取得
  const loadExercises = useCallback(async () => {
    const data = await orpc.statistics.listExercises()
    setExercises(data)
    if (data.length > 0 && selectedExerciseId === null) {
      setSelectedExerciseId(data[0].id)
    }
  }, [selectedExerciseId])

  // ボリュームタブのデータ取得（統合アクション使用）
  const loadVolumeData = useCallback(async () => {
    const { preset, customStartDate, customEndDate } = timeRange
    const orpcPreset = toOrpcPreset(preset)
    const [data, bodyPartTotalsData, volumeByBodyPartData] = await Promise.all([
      orpc.statistics.getVolumeTab({
        granularity,
        preset: orpcPreset,
        customStartDate,
        customEndDate,
      }),
      orpc.statistics.getBodyPartVolumeTotals({
        preset: orpcPreset,
        customStartDate,
        customEndDate,
        bodyPartGranularity,
      }),
      orpc.statistics.getVolumeByBodyPart({
        granularity,
        bodyPartGranularity,
        preset: orpcPreset,
        customStartDate,
        customEndDate,
      }),
    ])
    setTotalVolume(data.totalVolume)
    setVolumeByExercise(data.volumeByExercise)
    setExerciseVolumeTotals(data.exerciseVolumeTotals)
    setBodyPartVolumeTotals(bodyPartTotalsData)
    setVolumeByBodyPart(volumeByBodyPartData)
  }, [granularity, timeRange, bodyPartGranularity])

  // 重量タブのデータ取得（統合アクション使用）
  const loadWeightData = useCallback(async () => {
    if (!selectedExerciseId) return
    const { preset, customStartDate, customEndDate } = timeRange
    const data = await orpc.statistics.getWeightTab({
      exerciseId: Number(selectedExerciseId),
      granularity,
      preset: toOrpcPreset(preset),
      customStartDate,
      customEndDate,
    })
    setMaxWeightHistory(data.maxWeightHistory)
    setOneRMHistory(data.oneRMHistory)
  }, [granularity, timeRange, selectedExerciseId])

  // 継続タブのデータ取得（統合アクション使用）
  const loadContinuityData = useCallback(async () => {
    const { preset, customStartDate, customEndDate } = timeRange
    const [data, bodyPartDaysData] = await Promise.all([
      orpc.statistics.getContinuityTab({
        granularity,
        preset: toOrpcPreset(preset),
        customStartDate,
        customEndDate,
      }),
      orpc.statistics.getBodyPartTrainingDays({
        preset: toOrpcPreset(preset),
        customStartDate,
        customEndDate,
        bodyPartGranularity,
      }),
    ])
    setContinuityStats(data.stats)
    setTrainingDaysByPeriod(data.daysByPeriod)
    setExerciseTrainingDays(data.exerciseDays)
    setBodyPartTrainingDays(bodyPartDaysData)
  }, [granularity, timeRange, bodyPartGranularity])

  // 初回ロード
  useEffect(() => {
    startLoading(async () => {
      await loadExercises()
    })
  }, [loadExercises])

  // タブ切り替え時のデータ取得
  useEffect(() => {
    startLoading(async () => {
      if (activeTab === 0) {
        await loadVolumeData()
      } else if (activeTab === 1) {
        await loadWeightData()
      } else if (activeTab === 2) {
        await loadContinuityData()
      }
    })
  }, [activeTab, loadVolumeData, loadWeightData, loadContinuityData])

  // 種目選択時のデータ再取得（重量タブ）
  useEffect(() => {
    if (activeTab === 1 && selectedExerciseId) {
      startLoading(async () => {
        await loadWeightData()
      })
    }
  }, [selectedExerciseId, activeTab, loadWeightData])

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  // StatsCardスケルトン
  const renderStatsCardSkeleton = () => (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Skeleton variant="rounded" width={48} height={48} />
      <Box>
        <Skeleton variant="text" width={80} height={16} />
        <Skeleton variant="text" width={100} height={32} />
      </Box>
    </Paper>
  )

  // リストスケルトン（種目別ボリュームなど）
  const renderListSkeleton = (title: string) => (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      <Stack spacing={1.5}>
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ px: 1, py: 0.75 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Skeleton variant="text" width={120} />
              <Skeleton variant="text" width={60} />
            </Box>
            <Skeleton variant="rounded" height={4} />
            <Skeleton variant="text" width={40} height={16} sx={{ mt: 0.5 }} />
          </Box>
        ))}
      </Stack>
    </Paper>
  )

  // チャートスケルトン
  const renderChartSkeleton = (title: string) => (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ pl: 1 }}>
        {title}
      </Typography>
      <Skeleton variant="rounded" height={200} />
    </Paper>
  )

  // ボリュームタブスケルトン
  const renderVolumeTabSkeleton = () => (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>{renderStatsCardSkeleton()}</Grid>
      </Grid>
      {renderListSkeleton('部位別ボリューム')}
      {renderChartSkeleton('部位別ボリューム推移')}
      {renderListSkeleton('種目別ボリューム')}
      {renderChartSkeleton('ボリューム推移')}
    </Stack>
  )

  // 重量タブスケルトン
  const renderWeightTabSkeleton = () => (
    <Stack spacing={2}>
      <Skeleton variant="rounded" height={40} />
      {renderChartSkeleton('最大重量')}
      {renderChartSkeleton('推定1RM')}
    </Stack>
  )

  // 継続タブスケルトン
  const renderContinuityTabSkeleton = () => (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>{renderStatsCardSkeleton()}</Grid>
        <Grid size={{ xs: 6 }}>{renderStatsCardSkeleton()}</Grid>
        <Grid size={{ xs: 6 }}>{renderStatsCardSkeleton()}</Grid>
      </Grid>
      {renderChartSkeleton('トレーニング日数推移')}
      {renderListSkeleton('種目別トレーニング日数')}
    </Stack>
  )

  // 現在のタブに応じたスケルトンを表示
  const renderSkeleton = () => {
    if (activeTab === 0) return renderVolumeTabSkeleton()
    if (activeTab === 1) return renderWeightTabSkeleton()
    return renderContinuityTabSkeleton()
  }

  return (
    <Stack spacing={1}>
      {/* グローバルフィルター */}
      <GlobalFilter
        granularity={granularity}
        onGranularityChange={setGranularity}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      {/* タブ */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 1.5, mb: 1 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
          <Tab label="ボリューム" />
          <Tab label="重量" />
          <Tab label="継続" />
        </Tabs>
      </Box>

      {/* タブコンテンツ */}
      {isLoading ? (
        renderSkeleton()
      ) : (
        <>
          {/* ボリュームタブ */}
          {activeTab === 0 && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              {/* KPIカード */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <StatsCard
                    title="合計ボリューム"
                    value={
                      totalVolume >= 1000000
                        ? `${(totalVolume / 1000000).toFixed(2)}t`
                        : totalVolume >= 1000
                          ? `${(totalVolume / 1000).toFixed(1)}t`
                          : `${totalVolume.toLocaleString()}kg`
                    }
                    icon={<ScaleIcon />}
                    color="#1976d2"
                  />
                </Grid>
              </Grid>

              {/* 部位別ボリュームリスト */}
              <BodyPartVolumeList
                data={bodyPartVolumeTotals}
                granularity={bodyPartGranularity}
                onGranularityChange={setBodyPartGranularity}
              />

              {/* 部位別ボリューム推移グラフ */}
              <StackedBodyPartVolumeChart
                data={volumeByBodyPart}
                granularity={bodyPartGranularity}
                onGranularityChange={setBodyPartGranularity}
              />

              {/* 種目別ボリュームリスト */}
              <ExerciseVolumeList data={exerciseVolumeTotals} />

              {/* 種目別ボリューム推移グラフ */}
              <StackedVolumeChart data={volumeByExercise} />
            </Stack>
          )}

          {/* 重量タブ */}
          {activeTab === 1 && (
            <WeightTab
              exercises={exercises}
              selectedExerciseId={selectedExerciseId}
              onExerciseChange={setSelectedExerciseId}
              maxWeightHistory={maxWeightHistory}
              oneRMHistory={oneRMHistory}
            />
          )}

          {/* 継続タブ */}
          {activeTab === 2 && (
            <Stack spacing={2}>
              <ContinuityTab
                stats={continuityStats}
                daysByPeriod={trainingDaysByPeriod}
                exerciseDays={exerciseTrainingDays}
              />

              {/* 部位別トレーニング日数 */}
              <BodyPartTrainingDaysList
                data={bodyPartTrainingDays}
                granularity={bodyPartGranularity}
                onGranularityChange={setBodyPartGranularity}
              />
            </Stack>
          )}
        </>
      )}
    </Stack>
  )
}

/** Start 側 `/statistics`（`_protected` layout 配下。URL は `/statistics` のまま）。 */
export const Route = createFileRoute('/_protected/statistics')({
  component: StatisticsPage,
})
