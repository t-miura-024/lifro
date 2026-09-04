'use client'

import type { Timer } from '@/server/domain/entities'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { Box, IconButton, Paper, Stack, Typography } from '@mui/material'
import { memo } from 'react'

type Props = {
  timer: Timer
  totalDuration: string
  unitCount: number
  onEdit: (timer: Timer) => void
  onPlay: (timer: Timer) => void
}

export default memo(function SortableTimerItem({
  timer,
  totalDuration,
  unitCount,
  onEdit,
  onPlay,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: timer.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      variant="outlined"
      sx={{
        p: 1.5,
        cursor: 'pointer',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
      onClick={() => onEdit(timer)}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <IconButton
          size="small"
          {...attributes}
          {...listeners}
          sx={{ cursor: 'grab', touchAction: 'none' }}
          aria-label="ドラッグして並び替え"
          onClick={(e) => e.stopPropagation()}
        >
          <DragIndicatorIcon />
        </IconButton>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {timer.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totalDuration} / {unitCount}個のユニット
          </Typography>
        </Box>

        <IconButton
          size="large"
          color="primary"
          onClick={(e) => {
            e.stopPropagation()
            onPlay(timer)
          }}
          aria-label="タイマーを開始"
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
        >
          <PlayArrowIcon />
        </IconButton>
      </Stack>
    </Paper>
  )
})
