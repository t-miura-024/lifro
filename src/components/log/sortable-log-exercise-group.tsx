import type { ExerciseGroup } from '@/components/log/log-form-types'
import { AddRowButton } from '@/components/ui/add-row-button'
import { ExerciseCard, ExerciseCardHeader } from '@/components/ui/exercise-card'
import { ExerciseSelect, type ExerciseSelectGroup } from '@/components/ui/exercise-select'
import {
  SetCellNote,
  SetNumberInputCell,
  SetRemoveCell,
  SetTable,
  type SetTableColumn,
  SetTotalRow,
  SetValueCell,
} from '@/components/ui/set-table'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { Box, IconButton, TableBody, TableRow, Typography } from '@mui/material'
import dayjs from 'dayjs'

// 差分をフォーマットする関数
const formatDelta = (current: number, previous: number | null) => {
  if (previous === null) return { text: 'NEW', color: 'text.secondary' }
  const delta = current - previous
  if (delta > 0) return { text: `+${delta.toLocaleString()}`, color: 'success.main' }
  if (delta < 0) return { text: delta.toLocaleString(), color: 'error.main' }
  return { text: '±0', color: 'text.disabled' }
}

type SortableLogExerciseGroupProps = {
  group: ExerciseGroup
  index: number
  exerciseGroups: ExerciseSelectGroup[]
  canDeleteGroup: boolean
  columns: SetTableColumn[]
  onChangeExercise: (index: number, exerciseId: number | null) => void
  onChangeSet: (
    groupIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string,
  ) => void
  onAddSet: (groupIndex: number) => void
  onRemoveSet: (groupIndex: number, setIndex: number) => void
  onRemoveGroup: (index: number) => void
}

/** ログ入力モーダルの種目カード。ドラッグハンドル付きで並び替え可能にする。 */
export function SortableLogExerciseGroup({
  group,
  index,
  exerciseGroups,
  canDeleteGroup,
  columns,
  onChangeExercise,
  onChangeSet,
  onAddSet,
  onRemoveSet,
  onRemoveGroup,
}: SortableLogExerciseGroupProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.key,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const totalVolume = group.sets.reduce((sum, set) => {
    const weight = Number.parseFloat(set.weight) || 0
    const reps = Number.parseInt(set.reps, 10) || 0
    return sum + weight * reps
  }, 0)
  const previousTotalVolume = group.latestSets
    ? group.latestSets.sets.reduce((sum, set) => sum + set.weight * set.reps, 0)
    : null
  const totalVolumeDelta = formatDelta(totalVolume, previousTotalVolume)

  return (
    <Box ref={setNodeRef} style={style}>
      <ExerciseCard>
        <ExerciseCardHeader>
          <IconButton
            size="small"
            {...attributes}
            {...listeners}
            sx={{ cursor: 'grab', touchAction: 'none', flexShrink: 0 }}
            aria-label="ドラッグして並び替え"
          >
            <DragIndicatorIcon />
          </IconButton>

          <ExerciseSelect
            labelId={`exercise-label-${group.key}`}
            label="種目"
            emptyLabel="種目を登録してください"
            value={group.exerciseId}
            groups={exerciseGroups}
            onChange={(exerciseId) => onChangeExercise(index, exerciseId)}
          />

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
        </ExerciseCardHeader>

        {group.latestSets && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            前回：{dayjs(group.latestSets.date).format('YYYY年M月D日')}
          </Typography>
        )}

        <SetTable columns={columns}>
          <TableBody>
            {group.sets.map((set, setIndex) => {
              const weight = Number.parseFloat(set.weight) || 0
              const reps = Number.parseInt(set.reps, 10) || 0
              const volume = weight * reps
              const previousSet = group.latestSets?.sets[setIndex] || null
              const previousWeight = previousSet?.weight ?? null
              const previousReps = previousSet?.reps ?? null
              const previousVolume = previousSet ? previousSet.weight * previousSet.reps : null
              const weightDelta = formatDelta(weight, previousWeight)
              const repsDelta = formatDelta(reps, previousReps)
              const volumeDelta = formatDelta(volume, previousVolume)

              return (
                <TableRow key={set.key}>
                  <SetNumberInputCell
                    value={set.weight}
                    onChange={(value) => onChangeSet(index, setIndex, 'weight', value)}
                    min={0}
                    step={0.5}
                    placeholder="0"
                    note={
                      group.latestSets ? (
                        <SetCellNote color={weightDelta.color}>{weightDelta.text}</SetCellNote>
                      ) : undefined
                    }
                  />
                  <SetNumberInputCell
                    value={set.reps}
                    onChange={(value) => onChangeSet(index, setIndex, 'reps', value)}
                    min={0}
                    step={1}
                    placeholder="0"
                    note={
                      group.latestSets ? (
                        <SetCellNote color={repsDelta.color}>{repsDelta.text}</SetCellNote>
                      ) : undefined
                    }
                  />
                  <SetValueCell
                    value={volume > 0 ? volume.toLocaleString() : '-'}
                    note={
                      group.latestSets ? (
                        <SetCellNote color={volumeDelta.color}>{volumeDelta.text}</SetCellNote>
                      ) : undefined
                    }
                  />
                  <SetRemoveCell
                    canRemove={group.sets.length > 1}
                    onRemove={() => onRemoveSet(index, setIndex)}
                  />
                </TableRow>
              )
            })}
            <SetTotalRow
              value={totalVolume > 0 ? totalVolume.toLocaleString() : '-'}
              note={
                group.latestSets ? (
                  <SetCellNote color={totalVolumeDelta.color}>{totalVolumeDelta.text}</SetCellNote>
                ) : undefined
              }
            />
          </TableBody>
        </SetTable>

        <AddRowButton label="セットを追加" onClick={() => onAddSet(index)} />
      </ExerciseCard>
    </Box>
  )
}
