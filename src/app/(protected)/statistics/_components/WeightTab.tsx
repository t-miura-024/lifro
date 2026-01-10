'use client'

import type { MaxWeightRecord, OneRMRecord } from '@/server/application/services/StatisticsService'
import type { Exercise } from '@/server/domain/entities'
import { Box, FormControl, MenuItem, Paper, Select, Stack, Typography } from '@mui/material'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Props = {
  exercises: Exercise[]
  selectedExerciseId: number | null
  onExerciseChange: (exerciseId: number) => void
  maxWeightHistory: MaxWeightRecord[]
  oneRMHistory: OneRMRecord[]
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

export default function WeightTab({
  exercises,
  selectedExerciseId,
  onExerciseChange,
  maxWeightHistory,
  oneRMHistory,
}: Props) {
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
