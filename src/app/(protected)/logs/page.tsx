'use client'

import { Box, Typography, Button, Stack, Paper, IconButton } from '@mui/material'
import LogsTable from './_components/LogsTable'
import type { TrainingRow } from './_components/LogsTable'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import { useMemo, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'

function formatYearMonth(date: Date) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

function addMonths(base: Date, diff: number) {
  const d = new Date(base)
  d.setDate(1)
  d.setMonth(d.getMonth() + diff)
  return d
}

const demoTrainings: Record<string, TrainingRow[]> = {
  '2025-08': [
    {
      id: '2025-08-10',
      date: '2025-08-10',
      exercises: ['ベンチプレス', 'サイドレイズ'],
      volume: 60 * 10 + 6 * 12,
    },
    { id: '2025-08-09', date: '2025-08-09', exercises: ['スクワット'], volume: 80 * 8 + 90 * 5 },
  ],
  '2025-07': [
    {
      id: '2025-07-28',
      date: '2025-07-28',
      exercises: ['デッドリフト', 'ラットプル'],
      volume: 100 * 5 + 40 * 12,
    },
  ],
}

export default function LogsPage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const ym = useMemo(() => formatYearMonth(currentMonth), [currentMonth])
  const rows = useMemo(() => demoTrainings[ym] ?? [], [ym])

  return (
    <Stack spacing={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton aria-label="前の月" onClick={() => setCurrentMonth((d) => addMonths(d, -1))}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ minWidth: 96, textAlign: 'center' }}
          >
            {ym}
          </Typography>
          <IconButton aria-label="次の月" onClick={() => setCurrentMonth((d) => addMonths(d, 1))}>
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Button variant="contained" color="primary">
          <AddIcon fontSize="medium" />
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 0 }}>
        <LogsTable rows={rows} />
      </Paper>
    </Stack>
  )
}
