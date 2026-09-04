'use client'

import type { ExerciseVolume, TrainingMemo } from '@/server/domain/entities'
import { Box, Card, CardContent, Divider, Stack, Typography } from '@mui/material'

export type TrainingRow = {
  id: string // date を含むユニークID
  date: string // YYYY-MM-DD
  exercises: ExerciseVolume[]
  volume: number // 総ボリューム
  memos: TrainingMemo[]
}

type Props = {
  rows: TrainingRow[]
  onRowClick?: (date: string) => void
}

export default function LogList({ rows, onRowClick }: Props) {
  return (
    <Stack spacing={1.5}>
      {rows.map((row) => (
        <Card
          key={row.id}
          variant="outlined"
          onClick={() => onRowClick?.(row.date)}
          sx={{
            cursor: onRowClick ? 'pointer' : 'default',
            '&:hover': onRowClick ? { bgcolor: 'action.hover' } : {},
          }}
        >
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            {/* ヘッダー: 日付 + 総ボリューム */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2" fontWeight={700}>
                {row.date}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {row.volume.toLocaleString()}kg
              </Typography>
            </Box>

            {/* 種目リスト */}
            <Stack spacing={0.5}>
              {row.exercises.map((exercise) => (
                <Box
                  key={exercise.exerciseId}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" color="text.secondary">
                    {exercise.exerciseName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {exercise.volume.toLocaleString()}kg
                  </Typography>
                </Box>
              ))}
            </Stack>

            {/* メモ */}
            {row.memos.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={0.5} divider={<Divider />}>
                  {row.memos.map((memo) => (
                    <Typography
                      key={memo.id}
                      variant="body2"
                      color="text.secondary"
                      sx={{ whiteSpace: 'pre-wrap' }}
                    >
                      {memo.content}
                    </Typography>
                  ))}
                </Stack>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}
