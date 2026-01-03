'use client'

import type { Exercise } from '@/server/domain/entities'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import EditIcon from '@mui/icons-material/Edit'
import { IconButton, Stack, TableCell, TableRow, Typography } from '@mui/material'

type Props = {
  exercise: Exercise
  onEdit: (exercise: Exercise) => void
  onDelete: (exercise: Exercise) => void
}

export default function SortableExerciseItem({ exercise, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell sx={{ width: 48, p: 1 }}>
        <IconButton
          size="small"
          {...attributes}
          {...listeners}
          sx={{ cursor: 'grab', touchAction: 'none' }}
          aria-label="ドラッグして並び替え"
        >
          <DragIndicatorIcon />
        </IconButton>
      </TableCell>
      <TableCell>
        <Typography>{exercise.name}</Typography>
      </TableCell>
      <TableCell sx={{ width: 48, p: 1 }}>
        <IconButton size="small" onClick={() => onEdit(exercise)} aria-label="編集">
          <EditIcon fontSize="small" />
        </IconButton>
      </TableCell>
      <TableCell sx={{ width: 48, p: 1 }}>
        <IconButton size="small" onClick={() => onDelete(exercise)} aria-label="削除">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  )
}
