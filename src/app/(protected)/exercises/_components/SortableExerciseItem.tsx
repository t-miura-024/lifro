'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import EditIcon from '@mui/icons-material/Edit'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import { Box, Chip, IconButton, Stack, TableCell, TableRow, Tooltip, Typography } from '@mui/material'
import { memo } from 'react'

/** 部位情報 */
type BodyPartInfo = {
  bodyPartId: number
  loadRatio: number
  bodyPart?: {
    category: string
    name: string
  }
}

/** コンポーネントで使用する種目の型 */
type ExerciseItem = {
  id: number
  name: string
  bodyParts?: BodyPartInfo[]
}

type Props<T extends ExerciseItem> = {
  exercise: T
  onEdit: (exercise: T) => void
  onDelete: (exercise: T) => void
  onBodyPartEdit?: (exercise: T) => void
}

/** 部位カテゴリの表示名 */
const categoryLabels: Record<string, string> = {
  CHEST: '胸',
  BACK: '背中',
  SHOULDER: '肩',
  ARM: '腕',
  ABS: '腹筋',
  LEG: '脚',
}

/** 部位カテゴリの色定義 */
const categoryColors: Record<string, { bg: string; text: string }> = {
  CHEST: { bg: '#c17b7b', text: '#fff' }, // くすみ赤
  BACK: { bg: '#7b9fc1', text: '#fff' }, // くすみ青
  SHOULDER: { bg: '#c9a66b', text: '#fff' }, // くすみオレンジ
  ARM: { bg: '#9b7bb5', text: '#fff' }, // くすみ紫
  ABS: { bg: '#7bab7e', text: '#fff' }, // くすみ緑
  LEG: { bg: '#b57b8e', text: '#fff' }, // くすみピンク
}

function SortableExerciseItemInner<T extends ExerciseItem>({
  exercise,
  onEdit,
  onDelete,
  onBodyPartEdit,
}: Props<T>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // 部位表示用のチップを生成（カテゴリバッジ付き）
  const bodyPartChips = exercise.bodyParts?.map((bp) => {
    const category = bp.bodyPart?.category ?? ''
    const categoryLabel = categoryLabels[category] ?? ''
    const colors = categoryColors[category] ?? { bg: '#f5f5f5', text: '#616161' }
    const partName = bp.bodyPart?.name ?? String(bp.bodyPartId)

    return (
      <Chip
        key={bp.bodyPartId}
        size="small"
        sx={{
          fontSize: '0.7rem',
          height: 22,
          backgroundColor: colors.bg,
          color: colors.text,
          '& .MuiChip-label': {
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          },
        }}
        label={
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              component="span"
              sx={{
                fontWeight: 600,
                borderRight: '1px solid rgba(255,255,255,0.4)',
                pr: 0.5,
                mr: 0.25,
              }}
            >
              {categoryLabel}
            </Box>
            <Box component="span">
              {partName} {bp.loadRatio}%
            </Box>
          </Box>
        }
      />
    )
  })

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
        <Stack spacing={0.5}>
          <Typography>{exercise.name}</Typography>
          {exercise.bodyParts && exercise.bodyParts.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {bodyPartChips}
            </Stack>
          )}
        </Stack>
      </TableCell>
      {onBodyPartEdit && (
        <TableCell sx={{ width: 48, p: 1 }}>
          <Tooltip title="部位を設定">
            <IconButton
              size="small"
              onClick={() => onBodyPartEdit(exercise)}
              aria-label="部位を設定"
            >
              <FitnessCenterIcon
                fontSize="small"
                color={exercise.bodyParts?.length ? 'primary' : 'disabled'}
              />
            </IconButton>
          </Tooltip>
        </TableCell>
      )}
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

// ジェネリックコンポーネントをmemoで包む
export default memo(SortableExerciseItemInner) as typeof SortableExerciseItemInner
