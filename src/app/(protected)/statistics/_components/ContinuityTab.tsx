'use client'

import type {
  ContinuityStats,
  ExerciseTrainingDays,
  TrainingDaysByPeriod,
} from '@/server/application/services/StatisticsService'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import DateRangeIcon from '@mui/icons-material/DateRange'
import EventRepeatIcon from '@mui/icons-material/EventRepeat'
import { Box, Grid, List, ListItem, Paper, Stack, Typography } from '@mui/material'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import StatsCard from './StatsCard'

type Props = {
  stats: ContinuityStats | null
  daysByPeriod: TrainingDaysByPeriod[]
  exerciseDays: ExerciseTrainingDays[]
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

export default function ContinuityTab({ stats, daysByPeriod, exerciseDays }: Props) {
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
