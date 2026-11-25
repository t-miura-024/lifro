import type {
  RoutineExerciseOption,
  RoutineGroupFormData,
} from '@/components/routine/routine-form-types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'
import dayjs from 'dayjs'

/** 部位カテゴリの表示名 */
const categoryLabels: Record<string, string> = {
  CHEST: '胸',
  BACK: '背中',
  SHOULDER: '肩',
  ARM: '腕',
  ABS: '腹筋',
  LEG: '脚',
}

/** カテゴリの表示順 */
const categoryOrder = ['CHEST', 'BACK', 'SHOULDER', 'ARM', 'ABS', 'LEG']

/** 種目を部位カテゴリ別に並べた Select の選択肢 */
function renderExerciseOptions(exercises: RoutineExerciseOption[]): ReactNode[] {
  const grouped: Record<string, RoutineExerciseOption[]> = { UNCATEGORIZED: [] }
  for (const category of categoryOrder) {
    grouped[category] = []
  }
  for (const exercise of exercises) {
    const category = exercise.primaryCategory || 'UNCATEGORIZED'
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(exercise)
  }

  const items: ReactNode[] = []
  for (const category of [...categoryOrder, 'UNCATEGORIZED']) {
    const categoryExercises = grouped[category]
    if (categoryExercises.length === 0) continue
    items.push(
      <ListSubheader key={`header-${category}`} sx={{ lineHeight: '32px' }}>
        {category === 'UNCATEGORIZED' ? '未分類' : categoryLabels[category] || category}
      </ListSubheader>,
    )
    for (const exercise of categoryExercises) {
      items.push(
        <MenuItem key={exercise.id} value={exercise.id.toString()} sx={{ pl: 3 }}>
          {exercise.name}
        </MenuItem>,
      )
    }
  }
  return items
}

function isPositiveInteger(value: string): boolean {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0
}

type SortableRoutineGroupProps = {
  group: RoutineGroupFormData
  index: number
  exercises: RoutineExerciseOption[]
  canDeleteGroup: boolean
  onChangeExercise: (index: number, exerciseId: number | null) => void
  onChangeTargetReps: (groupIndex: number, setIndex: number, value: string) => void
  onAddSet: (groupIndex: number) => void
  onRemoveSet: (groupIndex: number, setIndex: number) => void
  onRemoveGroup: (index: number) => void
}

export function SortableRoutineGroup({
  group,
  index,
  exercises,
  canDeleteGroup,
  onChangeExercise,
  onChangeTargetReps,
  onAddSet,
  onRemoveSet,
  onRemoveGroup,
}: SortableRoutineGroupProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.key,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const groupVolume = group.sets.reduce((sum, set, setIndex) => {
    const previousWeight = group.latestSets?.sets[setIndex]?.weight ?? null
    if (previousWeight === null || !isPositiveInteger(set.targetReps)) return sum
    return sum + previousWeight * Number.parseInt(set.targetReps, 10)
  }, 0)

  return (
    <Paper ref={setNodeRef} style={style} variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton
            size="small"
            {...attributes}
            {...listeners}
            sx={{ cursor: 'grab', touchAction: 'none', flexShrink: 0 }}
            aria-label="ドラッグして並び替え"
          >
            <DragIndicatorIcon />
          </IconButton>

          <FormControl fullWidth size="small" disabled={exercises.length === 0}>
            <InputLabel id={`routine-exercise-label-${group.key}`}>
              {exercises.length === 0 ? '種目を登録してください' : '種目'}
            </InputLabel>
            <Select
              labelId={`routine-exercise-label-${group.key}`}
              value={group.exerciseId?.toString() ?? ''}
              label={exercises.length === 0 ? '種目を登録してください' : '種目'}
              onChange={(e) => {
                const value = e.target.value
                onChangeExercise(index, value ? Number.parseInt(value, 10) : null)
              }}
            >
              {renderExerciseOptions(exercises)}
            </Select>
          </FormControl>

          {canDeleteGroup && (
            <IconButton
              size="small"
              onClick={() => onRemoveGroup(index)}
              aria-label="種目を削除"
              sx={{ flexShrink: 0 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>

        {group.latestSets && (
          <Typography variant="caption" color="text.secondary">
            前回：{dayjs(group.latestSets.date).format('YYYY年M月D日')}
          </Typography>
        )}

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="right" width={80}>
                  重量 (kg)
                </TableCell>
                <TableCell align="right" width={100}>
                  目標回数
                </TableCell>
                <TableCell align="right" width={100}>
                  想定ボリューム
                </TableCell>
                <TableCell width={40} />
              </TableRow>
            </TableHead>
            <TableBody>
              {group.sets.map((set, setIndex) => {
                const previousWeight = group.latestSets?.sets[setIndex]?.weight ?? null
                const volume =
                  previousWeight !== null && isPositiveInteger(set.targetReps)
                    ? previousWeight * Number.parseInt(set.targetReps, 10)
                    : null

                return (
                  <TableRow key={set.key}>
                    <TableCell align="right">
                      {previousWeight !== null ? previousWeight.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell sx={{ p: 0 }}>
                      <TextField
                        type="number"
                        size="small"
                        value={set.targetReps}
                        onChange={(e) => onChangeTargetReps(index, setIndex, e.target.value)}
                        inputProps={{ min: 1, step: 1, placeholder: '任意' }}
                        sx={{
                          '& .MuiOutlinedInput-root': { borderRadius: 0 },
                          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                          '& .MuiInputBase-input': {
                            textAlign: 'right',
                            padding: 0,
                            '&::-webkit-outer-spin-button': {
                              WebkitAppearance: 'none',
                              margin: 0,
                            },
                            '&::-webkit-inner-spin-button': {
                              WebkitAppearance: 'none',
                              margin: 0,
                            },
                            '&[type=number]': { MozAppearance: 'textfield' },
                          },
                        }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell align="right">
                      {volume !== null ? volume.toLocaleString() : ''}
                    </TableCell>
                    <TableCell>
                      {group.sets.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={() => onRemoveSet(index, setIndex)}
                          aria-label="セットを削除"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow>
                <TableCell colSpan={2} align="right">
                  <Typography variant="subtitle2">合計</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="subtitle2">
                    {groupVolume > 0 ? groupVolume.toLocaleString() : '-'}
                  </Typography>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Button
          startIcon={<AddIcon />}
          onClick={() => onAddSet(index)}
          variant="text"
          size="small"
          fullWidth
          sx={{ borderRadius: 0, py: 0, minHeight: 'auto' }}
        >
          セットを追加
        </Button>
      </Stack>
    </Paper>
  )
}
