'use client'

import type { MaxWeightRecord } from '@/server/application/services/StatisticsService'
import type { Exercise } from '@/server/domain/entities'
import { Box, FormControl, InputLabel, MenuItem, Paper, Select, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { useEffect, useState, useTransition } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchMaxWeightHistoryAction } from '../_actions'

type Props = {
  exercises: Exercise[]
}

export default function MaxWeightChart({ exercises }: Props) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | ''>(exercises[0]?.id || '')
  const [data, setData] = useState<MaxWeightRecord[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (selectedExerciseId) {
      startTransition(async () => {
        const result = await fetchMaxWeightHistoryAction(selectedExerciseId, 90)
        setData(result)
      })
    }
  }, [selectedExerciseId])

  const chartData = data.map((d) => ({
    date: dayjs(d.date).format('M/D'),
    weight: d.weight,
  }))

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
        <Typography variant="subtitle2">最大重量推移</Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value as number)}
            displayEmpty
            sx={{ fontSize: 12 }}
          >
            {exercises.map((ex) => (
              <MenuItem key={ex.id} value={ex.id} sx={{ fontSize: 12 }}>
                {ex.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {data.length === 0 ? (
        <Box
          sx={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography color="text.secondary">
            {isPending ? '読み込み中...' : 'データがありません'}
          </Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
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
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#2e7d32"
              strokeWidth={2}
              dot={{ fill: '#2e7d32', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Paper>
  )
}
