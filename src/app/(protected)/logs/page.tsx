'use client'

import type { TrainingSummary } from '@/server/domain/entities'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { deleteTrainingAction, fetchTrainingByDateAction, fetchTrainingsAction } from './_actions'
import LogInputModal from './_components/LogInputModal'
import LogsTable from './_components/LogsTable'
import type { TrainingRow } from './_components/LogsTable'

function formatYearMonth(date: Date) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

function addMonths(base: Date, diff: number) {
  const d = new Date(base)
  d.setDate(1)
  d.setMonth(d.getMonth() + diff)
  return d
}

function summaryToRow(summary: TrainingSummary): TrainingRow {
  const dateStr = formatDate(summary.date)
  return {
    id: dateStr,
    date: dateStr,
    exercises: summary.exerciseNames,
    volume: summary.totalVolume,
  }
}

export default function LogsPage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [rows, setRows] = useState<TrainingRow[]>([])
  const [isLoading, startLoading] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  const ym = useMemo(() => formatYearMonth(currentMonth), [currentMonth])

  // データを取得
  const loadData = useCallback(() => {
    startLoading(async () => {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1
      const summaries = await fetchTrainingsAction(year, month)
      setRows(summaries.map(summaryToRow))
    })
  }, [currentMonth])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 新規追加ボタン
  const handleAddClick = () => {
    setSelectedDate(new Date())
    setModalOpen(true)
  }

  // 行クリックで編集
  const handleRowClick = (dateStr: string) => {
    setSelectedDate(new Date(dateStr))
    setModalOpen(true)
  }

  // 保存完了時
  const handleSaved = () => {
    loadData()
    setSnackbar({
      open: true,
      message: '保存しました',
      severity: 'success',
    })
  }

  return (
    <Stack spacing={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton
            aria-label="前の月"
            onClick={() => setCurrentMonth((d) => addMonths(d, -1))}
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ minWidth: 96, textAlign: 'center' }}
          >
            {ym}
          </Typography>
          <IconButton
            aria-label="次の月"
            onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddClick}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <AddIcon fontSize="medium" />
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 0 }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" p={4}>
            <CircularProgress size={32} />
          </Box>
        ) : rows.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">この月のトレーニング記録はありません</Typography>
          </Box>
        ) : (
          <LogsTable rows={rows} onRowClick={handleRowClick} />
        )}
      </Paper>

      <LogInputModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        date={selectedDate}
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
