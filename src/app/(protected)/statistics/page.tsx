'use client'

import { client } from '@/app/_lib/hono/client'
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
import ScaleIcon from '@mui/icons-material/Scale'
import { Box, Grid, Paper, Skeleton, Stack, Tab, Tabs, Typography } from '@mui/material'
import { useCallback, useEffect, useState, useTransition } from 'react'
import BodyPartTrainingDaysList from './_components/BodyPartTrainingDays'
import BodyPartVolumeList from './_components/BodyPartVolumeList'
import ContinuityTab from './_components/ContinuityTab'
import ExerciseVolumeList from './_components/ExerciseVolumeList'
import GlobalFilter, { type TimeRange } from './_components/GlobalFilter'
import StackedBodyPartVolumeChart from './_components/StackedBodyPartVolumeChart'
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

  // 部位別統計のデータ
  const [bodyPartGranularity, setBodyPartGranularity] = useState<BodyPartGranularity>('category')
  const [bodyPartVolumeTotals, setBodyPartVolumeTotals] = useState<BodyPartVolumeTotal[]>([])
  const [volumeByBodyPart, setVolumeByBodyPart] = useState<BodyPartVolumeByPeriod[]>([])
  const [bodyPartTrainingDays, setBodyPartTrainingDays] = useState<BodyPartTrainingDays[]>([])

  const [isLoading, startLoading] = useTransition()

  // 共通のデータ取得
  const loadExercises = useCallback(async () => {
    const res = await client.api.statistics.exercises.$get()
    const data = await res.json()
    setExercises(data)
    if (data.length > 0 && selectedExerciseId === null) {
      setSelectedExerciseId(data[0].id)
    }
  }, [selectedExerciseId])

  // ボリュームタブのデータ取得（統合アクション使用）
  const loadVolumeData = useCallback(async () => {
    const { preset, customStartDate, customEndDate } = timeRange
    const [volumeRes, bodyPartVolumeTotalsRes, volumeByBodyPartRes] = await Promise.all([
      client.api.statistics.volume.$get({
        query: {
          granularity,
          preset,
          customStartDate,
          customEndDate,
        },
      }),
      client.api.statistics['body-part-volume-totals'].$get({
        query: {
          preset,
          customStartDate,
          customEndDate,
          granularity: bodyPartGranularity,
        },
      }),
      client.api.statistics['volume-by-body-part'].$get({
        query: {
          granularity,
          bodyPartGranularity,
          preset,
          customStartDate,
          customEndDate,
        },
      }),
    ])
    const data = await volumeRes.json()
    const bodyPartTotalsData = await bodyPartVolumeTotalsRes.json()
    const volumeByBodyPartData = await volumeByBodyPartRes.json()
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
    const res = await client.api.statistics.weight.$get({
      query: {
        exerciseId: String(selectedExerciseId),
        granularity,
        preset,
        customStartDate,
        customEndDate,
      },
    })
    const data = await res.json()
    setMaxWeightHistory(data.maxWeightHistory)
    setOneRMHistory(data.oneRMHistory)
  }, [granularity, timeRange, selectedExerciseId])

  // 継続タブのデータ取得（統合アクション使用）
  const loadContinuityData = useCallback(async () => {
    const { preset, customStartDate, customEndDate } = timeRange
    const [continuityRes, bodyPartDaysRes] = await Promise.all([
      client.api.statistics.continuity.$get({
        query: {
          granularity,
          preset,
          customStartDate,
          customEndDate,
        },
      }),
      client.api.statistics['body-part-training-days'].$get({
        query: {
          preset,
          startDate: customStartDate,
          endDate: customEndDate,
          granularity: bodyPartGranularity,
        },
      }),
    ])
    const data = await continuityRes.json()
    const bodyPartDaysData = await bodyPartDaysRes.json()
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
