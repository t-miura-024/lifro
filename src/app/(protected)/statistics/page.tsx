'use client'

import type {
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
import ScaleIcon from '@mui/icons-material/Scale'
import { Box, CircularProgress, Grid, Stack, Tab, Tabs, Typography } from '@mui/material'
import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  fetchContinuityStatsAction,
  fetchExerciseTrainingDaysAction,
  fetchExerciseVolumeTotalsAction,
  fetchExercisesForStatsAction,
  fetchMaxWeightHistoryAction,
  fetchOneRMHistoryAction,
  fetchTotalVolumeAction,
  fetchTrainingDaysByPeriodAction,
  fetchVolumeByExerciseAction,
} from './_actions'
import ContinuityTab from './_components/ContinuityTab'
import ExerciseVolumeList from './_components/ExerciseVolumeList'
import GlobalFilter, { type TimeRange } from './_components/GlobalFilter'
import StackedVolumeChart from './_components/StackedVolumeChart'
import StatsCard from './_components/StatsCard'
import WeightTab from './_components/WeightTab'

export default function StatisticsPage() {
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

  const [isLoading, startLoading] = useTransition()

  // 共通のデータ取得
  const loadExercises = useCallback(async () => {
    const data = await fetchExercisesForStatsAction()
    setExercises(data)
    if (data.length > 0 && selectedExerciseId === null) {
      setSelectedExerciseId(data[0].id)
    }
  }, [selectedExerciseId])

  // ボリュームタブのデータ取得
  const loadVolumeData = useCallback(async () => {
    const { preset, customStartDate, customEndDate } = timeRange
    const [total, byExercise, totals] = await Promise.all([
      fetchTotalVolumeAction(preset, customStartDate, customEndDate),
      fetchVolumeByExerciseAction(granularity, preset, customStartDate, customEndDate),
      fetchExerciseVolumeTotalsAction(preset, customStartDate, customEndDate),
    ])
    setTotalVolume(total)
    setVolumeByExercise(byExercise)
    setExerciseVolumeTotals(totals)
  }, [granularity, timeRange])

  // 重量タブのデータ取得
  const loadWeightData = useCallback(async () => {
    if (!selectedExerciseId) return
    const { preset, customStartDate, customEndDate } = timeRange
    const [maxWeight, oneRM] = await Promise.all([
      fetchMaxWeightHistoryAction(selectedExerciseId, granularity, preset, customStartDate, customEndDate),
      fetchOneRMHistoryAction(selectedExerciseId, granularity, preset, customStartDate, customEndDate),
    ])
    setMaxWeightHistory(maxWeight)
    setOneRMHistory(oneRM)
  }, [granularity, timeRange, selectedExerciseId])

  // 継続タブのデータ取得
  const loadContinuityData = useCallback(async () => {
    const { preset, customStartDate, customEndDate } = timeRange
    const [stats, daysByPeriod, exerciseDays] = await Promise.all([
      fetchContinuityStatsAction(preset, customStartDate, customEndDate),
      fetchTrainingDaysByPeriodAction(granularity, preset, customStartDate, customEndDate),
      fetchExerciseTrainingDaysAction(preset, customStartDate, customEndDate),
    ])
    setContinuityStats(stats)
    setTrainingDaysByPeriod(daysByPeriod)
    setExerciseTrainingDays(exerciseDays)
  }, [granularity, timeRange])

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

  return (
    <Stack spacing={3}>
      <Typography variant="h5" fontWeight={700}>
        統計
      </Typography>

      {/* グローバルフィルター */}
      <GlobalFilter
        granularity={granularity}
        onGranularityChange={setGranularity}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      {/* タブ */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
          <Tab label="ボリューム" />
          <Tab label="重量" />
          <Tab label="継続" />
        </Tabs>
      </Box>

      {/* タブコンテンツ */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* ボリュームタブ */}
          {activeTab === 0 && (
            <Stack spacing={2}>
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

              {/* 種目別ボリュームリスト */}
              <ExerciseVolumeList data={exerciseVolumeTotals} />

              {/* 積み上げグラフ */}
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
            <ContinuityTab
              stats={continuityStats}
              daysByPeriod={trainingDaysByPeriod}
              exerciseDays={exerciseTrainingDays}
            />
          )}
        </>
      )}
    </Stack>
  )
}
