import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import {
  FormControl,
  IconButton,
  InputLabel,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
} from '@mui/material'

/** ルーティン項目フォームの状態（文字列は入力途中の値も保持するため） */
export type RoutineItemFormData = {
  key: string
  exerciseId: number | null
  setCount: string
  targetReps: string
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

/** カテゴリの表示順 */
const categoryOrder = ['CHEST', 'BACK', 'SHOULDER', 'ARM', 'ABS', 'LEG']

type ExerciseWithBodyParts = {
  id: number
  name: string
  primaryCategory: string | null
}

let routineItemKeyCounter = 0

export function createEmptyRoutineItem(): RoutineItemFormData {
  return {
    key: `routine-item-${Date.now()}-${routineItemKeyCounter++}`,
    exerciseId: null,
    setCount: '3',
    targetReps: '',
  }
}

/** 種目を部位カテゴリ別に並べた Select の選択肢 */
function renderExerciseOptions(exercises: ExerciseWithBodyParts[]): React.ReactNode[] {
  const grouped: Record<string, ExerciseWithBodyParts[]> = { UNCATEGORIZED: [] }
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

  const items: React.ReactNode[] = []
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

type SortableRoutineItemProps = {
  item: RoutineItemFormData
  index: number
  exercises: ExerciseWithBodyParts[]
  canDelete: boolean
  onChange: (index: number, field: 'exerciseId' | 'setCount' | 'targetReps', value: string) => void
  onRemove: (index: number) => void
}

export function SortableRoutineItem({
  item,
  index,
  exercises,
  canDelete,
  onChange,
  onRemove,
}: SortableRoutineItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

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
            <InputLabel id={`routine-exercise-label-${item.key}`}>
              {exercises.length === 0 ? '種目を登録してください' : '種目'}
            </InputLabel>
            <Select
              labelId={`routine-exercise-label-${item.key}`}
              value={item.exerciseId?.toString() ?? ''}
              label={exercises.length === 0 ? '種目を登録してください' : '種目'}
              onChange={(e) => onChange(index, 'exerciseId', e.target.value)}
            >
              {renderExerciseOptions(exercises)}
            </Select>
          </FormControl>

          {canDelete && (
            <IconButton
              size="small"
              onClick={() => onRemove(index)}
              aria-label="種目を削除"
              sx={{ flexShrink: 0 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            type="number"
            size="small"
            label="セット数"
            value={item.setCount}
            onChange={(e) => onChange(index, 'setCount', e.target.value)}
            inputProps={{ min: 1, step: 1 }}
            sx={{ width: 110 }}
            required
          />
          <TextField
            type="number"
            size="small"
            label="目標回数"
            value={item.targetReps}
            onChange={(e) => onChange(index, 'targetReps', e.target.value)}
            inputProps={{ min: 1, step: 1 }}
            placeholder="任意"
            sx={{ width: 110 }}
          />
        </Stack>
      </Stack>
    </Paper>
  )
}
