'use client'

import type { DailyVolume } from '@/server/application/services/StatisticsService'
import { Box, Paper, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Props = {
  data: DailyVolume[]
}

export default function VolumeChart({ data }: Props) {
  // 直近14日間のデータに絞る（グラフを見やすくするため）
  const recentData = data.slice(-14)

  // データが全て0の場合
  const hasData = recentData.some((d) => d.volume > 0)

  if (!hasData) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          ボリューム推移（直近14日間）
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

  const chartData = recentData.map((d) => ({
    date: dayjs(d.date).format('M/D'),
    volume: d.volume,
  }))

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ pl: 1 }}>
        ボリューム推移（直近14日間）
      </Typography>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toLocaleString()} kg`, 'ボリューム']}
            labelFormatter={(label) => `${label}`}
          />
          <Bar dataKey="volume" fill="#1976d2" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  )
}
