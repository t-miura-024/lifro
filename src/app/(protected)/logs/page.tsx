'use client'

import { client } from '@/app/_lib/hono/client'
import type { Training, TrainingSummary, YearMonth } from '@/server/domain/entities'
import AddIcon from '@mui/icons-material/Add'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState, useTransition } from 'react'
import LogInputModal from './_components/LogInputModal'
import type { SetFormData } from './_components/LogInputModal'
import LogList from './_components/LogList'
import type { TrainingRow } from './_components/LogList'

function formatDateForDisplay(dateStr: string): string {
  // YYYY-MM-DD → そのまま使用（または必要に応じてフォーマット）
  return dateStr
}

function yearMonthToKey(ym: YearMonth): string {
  return `${ym.year}-${ym.month}`
}

function formatYearMonthLabel(ym: YearMonth): string {
  return `${ym.year}年${ym.month}月`
}

function summaryToRow(summary: TrainingSummary): TrainingRow {
  return {
    id: summary.date,
    date: summary.date,
    exercises: summary.exercises,
    volume: summary.totalVolume,
    memos: summary.memos,
  }
}

let setKeyCounter = 0
function trainingToSetFormData(training: Training | null): SetFormData[] {
  if (!training || training.sets.length === 0) {
    return []
  }
  return training.sets
    .sort((a, b) => a.sortIndex - b.sortIndex)
    .map((set) => ({
      key: `set-${Date.now()}-${setKeyCounter++}`,
      id: set.id,
      exerciseId: set.exerciseId,
      exerciseName: set.exercise?.name || '',
      weight: set.weight === 0 ? '' : set.weight.toString(),
      reps: set.reps === 0 ? '' : set.reps.toString(),
    }))
}

export default function LogsPage() {
  const [availableYearMonths, setAvailableYearMonths] = useState<YearMonth[]>([])
  const [selectedYearMonth, setSelectedYearMonth] = useState<YearMonth | null>(null)
  const [rows, setRows] = useState<TrainingRow[]>([])
  const [isLoading, startLoading] = useTransition()
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [initialSets, setInitialSets] = useState<SetFormData[] | undefined>(undefined)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  // 初回ロード: 年月一覧を取得
  useEffect(() => {
    const loadYearMonths = async () => {
      const res = await client.api.trainings['year-months'].$get()
      const yearMonths = await res.json()
      setAvailableYearMonths(yearMonths)
      // 最新の年月を選択（降順なので先頭）
      if (yearMonths.length > 0) {
        setSelectedYearMonth(yearMonths[0])
      }
      setIsInitialLoading(false)
    }
    loadYearMonths()
  }, [])

  // 選択された年月のデータを取得
  const loadData = useCallback(() => {
    if (!selectedYearMonth) return
    startLoading(async () => {
      const res = await client.api.trainings.$get({
        query: {
          year: String(selectedYearMonth.year),
          month: String(selectedYearMonth.month),
        },
      })
      const summaries = await res.json()
      setRows(summaries.map(summaryToRow))
    })
  }, [selectedYearMonth])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 年月選択変更
  const handleYearMonthChange = (event: SelectChangeEvent) => {
    const [year, month] = event.target.value.split('-').map(Number)
    setSelectedYearMonth({ year, month })
  }

  // 新規追加ボタン
  const handleAddClick = async () => {
    const today = new Date()
    setSelectedDate(today)
    const dateStr = today.toISOString().split('T')[0]
    const res = await client.api.trainings[':date'].$get({
      param: { date: dateStr },
    })
    const training = await res.json()
    // 当日のデータが存在する場合は詳細モーダルを表示、存在しない場合は新規作成
    if (training && training.sets.length > 0) {
      setInitialSets(trainingToSetFormData(training))
    } else {
      setInitialSets(undefined)
    }
    setModalOpen(true)
  }

  // 行クリックで編集
  const handleRowClick = async (dateStr: string) => {
    const date = new Date(dateStr)
    setSelectedDate(date)
    const res = await client.api.trainings[':date'].$get({
      param: { date: dateStr },
    })
    const training = await res.json()
    setInitialSets(trainingToSetFormData(training))
    setModalOpen(true)
  }

  // 保存完了時（年月一覧を更新し、保存された月を選択）
  const handleSaved = async (savedDate: Date) => {
    const savedYear = savedDate.getFullYear()
    const savedMonth = savedDate.getMonth() + 1

    // 年月一覧を再取得
    const res = await client.api.trainings['year-months'].$get()
    const yearMonths = await res.json()
    setAvailableYearMonths(yearMonths)

    // 保存された年月を選択
    const savedYearMonth = yearMonths.find((ym) => ym.year === savedYear && ym.month === savedMonth)
    if (savedYearMonth) {
      setSelectedYearMonth(savedYearMonth)
    }

    setSnackbar({
      open: true,
      message: '保存しました',
      severity: 'success',
    })
  }

  // スケルトンローディング表示
  const renderSkeleton = () => (
    <Stack spacing={1.5}>
      {[1, 2, 3].map((i) => (
        <Card key={i} variant="outlined">
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            {/* ヘッダー */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Skeleton variant="text" width={90} height={24} />
              <Skeleton variant="text" width={70} height={20} />
            </Box>
            {/* 種目リスト */}
            <Stack spacing={0.5}>
              {[1, 2, 3].map((j) => (
                <Box key={j} display="flex" justifyContent="space-between" alignItems="center">
                  <Skeleton variant="text" width={100 + j * 20} height={20} />
                  <Skeleton variant="text" width={50} height={20} />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )

  // 初期ロード中
  if (isInitialLoading) {
    return (
      <Stack spacing={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
          <Skeleton variant="rounded" width={140} height={40} />
          <Skeleton variant="rounded" width={44} height={44} />
        </Box>
        {renderSkeleton()}
      </Stack>
    )
  }

  return (
    <Stack spacing={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
        {availableYearMonths.length > 0 && selectedYearMonth ? (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={yearMonthToKey(selectedYearMonth)}
              onChange={handleYearMonthChange}
              sx={{ fontWeight: 700 }}
            >
              {availableYearMonths.map((ym) => (
                <MenuItem key={yearMonthToKey(ym)} value={yearMonthToKey(ym)}>
                  {formatYearMonthLabel(ym)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Typography variant="subtitle1" color="text.secondary">
            データがありません
          </Typography>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddClick}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <AddIcon fontSize="medium" />
        </Button>
      </Box>

      {isLoading ? (
        renderSkeleton()
      ) : rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">この月のトレーニング記録はありません</Typography>
        </Paper>
      ) : (
        <LogList rows={rows} onRowClick={handleRowClick} />
      )}

      <LogInputModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setInitialSets(undefined)
        }}
        onSaved={handleSaved}
        initialDate={selectedDate}
        initialSets={initialSets}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  )
}
