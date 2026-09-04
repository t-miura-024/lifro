'use client'

import type { ExerciseVolumeByPeriod } from '@/server/application/services/StatisticsService'
import { Box, Paper, Typography } from '@mui/material'
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
  data: ExerciseVolumeByPeriod[]
}

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

export default function StackedVolumeChart({ data }: Props) {
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
    if (!periodMap.has(item.period)) {
      periodMap.set(item.period, {})
    }
    periodMap.get(item.period)![item.exerciseName] = item.volume

    // セット数も保存
    if (!exerciseSetCounts.has(item.period)) {
      exerciseSetCounts.set(item.period, new Map())
    }
    exerciseSetCounts.get(item.period)!.set(item.exerciseName, item.setCount)
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
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const period = payload[0]?.payload?.period
      return (
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            {label}
          </Typography>
          {payload.map((entry: any) => {
            const setCount = exerciseSetCounts.get(period)?.get(entry.dataKey) || 0
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
