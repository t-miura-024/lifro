'use client'

import type { DailyVolume, StatsSummary } from '@/server/application/services/StatisticsService'
import type { Exercise } from '@/server/domain/entities'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import ScaleIcon from '@mui/icons-material/Scale'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import { Box, CircularProgress, Grid, Stack, Typography } from '@mui/material'
import { useEffect, useState, useTransition } from 'react'
import {
  fetchDailyVolumesAction,
  fetchExercisesForStatsAction,
  fetchStatsSummaryAction,
} from './_actions'
import MaxWeightChart from './_components/MaxWeightChart'
import StatsCard from './_components/StatsCard'
import VolumeChart from './_components/VolumeChart'

export default function StatisticsPage() {
  const [summary, setSummary] = useState<StatsSummary | null>(null)
  const [volumes, setVolumes] = useState<DailyVolume[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, startLoading] = useTransition()

  useEffect(() => {
    startLoading(async () => {
      const [summaryData, volumeData, exerciseData] = await Promise.all([
        fetchStatsSummaryAction(),
        fetchDailyVolumesAction(30),
        fetchExercisesForStatsAction(),
      ])
      setSummary(summaryData)
      setVolumes(volumeData)
      setExercises(exerciseData)
    })
  }, [])

  if (isLoading || !summary) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h5" fontWeight={700}>
        統計
      </Typography>

      {/* KPI カード */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6 }}>
          <StatsCard
            title="総ボリューム"
            value={`${(summary.totalVolume / 1000).toFixed(1)}t`}
            icon={<ScaleIcon />}
            color="#1976d2"
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <StatsCard
            title="トレーニング日数"
            value={summary.totalWorkouts}
            icon={<CalendarMonthIcon />}
            color="#2e7d32"
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <StatsCard
            title="総セット数"
            value={summary.totalSets}
            icon={<FitnessCenterIcon />}
            color="#ed6c02"
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <StatsCard
            title="連続日数"
            value={summary.currentStreak}
            icon={<WhatshotIcon />}
            color="#d32f2f"
          />
        </Grid>
      </Grid>

      {/* ボリューム推移グラフ */}
      <VolumeChart data={volumes} />

      {/* 最大重量推移グラフ */}
      {exercises.length > 0 && <MaxWeightChart exercises={exercises} />}
    </Stack>
  )
}
