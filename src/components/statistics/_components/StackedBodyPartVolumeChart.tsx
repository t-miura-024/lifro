'use client'

import type {
  BodyPartGranularity,
  BodyPartVolumeByPeriod,
} from '@/server/application/services/StatisticsService'
import { Box, Paper, Typography } from '@mui/material'
import PillToggle from './PillToggle'
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

type Props = {
  data: BodyPartVolumeByPeriod[]
  granularity: BodyPartGranularity
  onGranularityChange: (granularity: BodyPartGranularity) => void
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

export default function StackedBodyPartVolumeChart({
  data,
  granularity,
  onGranularityChange,
}: Props) {
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, pl: 1 }}>
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
