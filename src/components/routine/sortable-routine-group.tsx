import type { RoutineGroupFormData } from '@/components/routine/routine-form-types'
import { AddRowButton } from '@/components/ui/add-row-button'
import { ExerciseCard, ExerciseCardHeader } from '@/components/ui/exercise-card'
import { ExerciseSelect, type ExerciseSelectGroup } from '@/components/ui/exercise-select'
import {
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

function isPositiveInteger(value: string): boolean {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0
}

const setTableColumns: SetTableColumn[] = [
  { key: 'weight', label: '重量', unit: 'kg', width: 120 },
  { key: 'targetReps', label: '目標回数', width: 100 },
  { key: 'volume', label: '想定ボリューム', width: 120 },
]

type SortableRoutineGroupProps = {
  group: RoutineGroupFormData
  index: number
  exerciseGroups: ExerciseSelectGroup[]
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
  exerciseGroups,
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
            labelId={`routine-exercise-label-${group.key}`}
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

        <SetTable columns={setTableColumns}>
          <TableBody>
            {group.sets.map((set, setIndex) => {
              const previousWeight = group.latestSets?.sets[setIndex]?.weight ?? null
              const volume =
                previousWeight !== null && isPositiveInteger(set.targetReps)
                  ? previousWeight * Number.parseInt(set.targetReps, 10)
                  : null

              return (
                <TableRow key={set.key}>
                  <SetValueCell
                    value={previousWeight !== null ? previousWeight.toLocaleString() : '-'}
                  />
                  <SetNumberInputCell
                    value={set.targetReps}
                    onChange={(value) => onChangeTargetReps(index, setIndex, value)}
                    min={1}
                    step={1}
                    placeholder="任意"
                  />
                  <SetValueCell value={volume !== null ? volume.toLocaleString() : ''} />
                  <SetRemoveCell
                    canRemove={group.sets.length > 1}
                    onRemove={() => onRemoveSet(index, setIndex)}
                  />
                </TableRow>
              )
            })}
            <SetTotalRow value={groupVolume > 0 ? groupVolume.toLocaleString() : '-'} />
          </TableBody>
        </SetTable>

        <AddRowButton label="セットを追加" onClick={() => onAddSet(index)} />
      </ExerciseCard>
    </Box>
  )
}
