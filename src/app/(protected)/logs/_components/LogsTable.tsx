'use client'

import type { TrainingMemo } from '@/server/domain/entities'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Popover,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { fetchMemosByDateAction } from '../_actions'

export type TrainingRow = {
  id: string // date を含むユニークID
  date: string // YYYY-MM-DD
  exercises: string[]
  volume: number // 総ボリューム
  hasMemo: boolean
}

type Props = {
  rows: TrainingRow[]
  onRowClick?: (date: string) => void
}

export default function LogsTable({ rows, onRowClick }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [memos, setMemos] = useState<TrainingMemo[]>([])
  const [isLoadingMemos, setIsLoadingMemos] = useState(false)

  const handleMemoClick = async (event: React.MouseEvent<HTMLButtonElement>, dateStr: string) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
    setIsLoadingMemos(true)
    try {
      const fetchedMemos = await fetchMemosByDateAction(dateStr)
      setMemos(fetchedMemos)
    } finally {
      setIsLoadingMemos(false)
    }
  }

  const handlePopoverClose = () => {
    setAnchorEl(null)
    setMemos([])
  }

  const open = Boolean(anchorEl)

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="training logs table">
          <TableHead>
            <TableRow>
              <TableCell width={140}>日付</TableCell>
              <TableCell>種目</TableCell>
              <TableCell align="right" width={140}>
                ボリューム
              </TableCell>
              <TableCell width={48} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                hover
                onClick={() => onRowClick?.(row.date)}
                sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                <TableCell>{row.date}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {row.exercises.map((name) => (
                      <Chip key={name} label={name} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell align="right">{row.volume.toLocaleString()}</TableCell>
                <TableCell align="center" sx={{ p: 0 }}>
                  {row.hasMemo && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleMemoClick(e, row.date)}
                      aria-label="メモを表示"
                    >
                      <ChatBubbleOutlineIcon fontSize="small" color="action" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, minWidth: 200, maxWidth: 320 }}>
          {isLoadingMemos ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={24} />
            </Box>
          ) : memos.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              メモがありません
            </Typography>
          ) : (
            <Stack spacing={1} divider={<Divider />}>
              {memos.map((memo) => (
                <Box key={memo.id}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    {new Date(memo.createdAt).toLocaleString('ja-JP', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {memo.content}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Popover>
    </>
  )
}
