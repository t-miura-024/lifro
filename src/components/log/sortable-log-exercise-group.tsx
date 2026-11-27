import type { ExerciseGroup } from '@/components/log/log-form-types'
import { PreviousRecordChip } from '@/components/log/previous-record-chip'
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
import {
  type LoadMode,
  formatLoadFormula,
  parseNumericInput,
  validateAssistedLoad,
} from '@/lib/assisted-load'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import {
  Alert,
  Box,
  IconButton,
  TableBody,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'

// 差分をフォーマットする関数
const formatDelta = (current: number, previous: number | null) => {
  if (previous === null) return { text: 'NEW', color: 'text.secondary' }
  const delta = current - previous
  if (delta > 0) return { text: `+${delta.toLocaleString()}`, color: 'success.main' }
  if (delta < 0) return { text: delta.toLocaleString(), color: 'error.main' }
  return { text: '±0', color: 'text.disabled' }
}

/** アシスト対応種目の列定義。モードに応じて入力列の見出しと負荷の計算式を変える。 */
const toAssistedColumns = (label: string, formulaHint: string): SetTableColumn[] => [
  { key: 'assist', label, unit: 'kg', width: '29%' },
  { key: 'weight', label: '負荷', unit: 'kg', width: '25%', hint: formulaHint },
  { key: 'reps', label: '回数', width: '11%' },
  { key: 'volume', label: 'ボリューム', width: '24%' },
]

type SortableLogExerciseGroupProps = {
  group: ExerciseGroup
  index: number
  exerciseGroups: ExerciseSelectGroup[]
  canDeleteGroup: boolean
  columns: SetTableColumn[]
  targetDate: string
  bodyWeight: string
  onChangeBodyWeight: (value: string) => void
  onChangeLoadMode: (index: number, mode: LoadMode) => void
  onChangeExercise: (index: number, exerciseId: number | null) => void
  onChangeSet: (
    groupIndex: number,
    setIndex: number,
    field: 'weight' | 'reps' | 'assist',
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
  columns: baseColumns,
  targetDate,
  bodyWeight,
  onChangeBodyWeight,
  onChangeLoadMode,
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
  const loadModeLabel = group.loadMode === 'assist' ? 'アシスト' : '加重'
  const assistValidation = group.supportsAssist
    ? validateAssistedLoad([group], bodyWeight)
    : { valid: true, message: null }
  const formulaHint = formatLoadFormula(group.loadMode, bodyWeight)
  const columns = group.supportsAssist ? toAssistedColumns(loadModeLabel, formulaHint) : baseColumns

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

        {!group.supportsAssist && group.latestSets && (
          <PreviousRecordChip date={group.latestSets.date} targetDate={targetDate} />
        )}

        {group.supportsAssist && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              columnGap: 0.25,
              rowGap: 1,
              flexWrap: 'wrap',
            }}
          >
            {group.latestSets && (
              <PreviousRecordChip date={group.latestSets.date} targetDate={targetDate} />
            )}
            <TextField
              size="small"
              type="number"
              label="体重 (kg)"
              value={bodyWeight}
              onChange={(e) => onChangeBodyWeight(e.target.value)}
              inputProps={{ min: 0, step: 0.1 }}
              sx={{
                width: { xs: 62, sm: 96 },
                flexShrink: 0,
                '& .MuiInputBase-root': { height: 28, borderRadius: 0 },
                '& .MuiInputBase-input': {
                  px: { xs: 0.75, sm: 1 },
                  py: 0,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  textAlign: 'right',
                },
                '& .MuiInputLabel-root': { fontSize: { xs: '0.7rem', sm: '0.875rem' } },
              }}
            />
            <ToggleButtonGroup
              size="small"
              exclusive
              value={group.loadMode}
              onChange={(_event, mode: LoadMode | null) => {
                if (mode) onChangeLoadMode(index, mode)
              }}
              aria-label="負荷のモード"
              sx={{
                ml: 'auto',
                flexShrink: 0,
                borderRadius: 0,
                '& .MuiToggleButtonGroup-grouped': {
                  width: { xs: 42, sm: 64 },
                  height: 28,
                  borderRadius: 0,
                  px: { xs: 0.25, sm: 1 },
                  py: 0,
                  fontSize: { xs: '0.58rem', sm: '0.75rem' },
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  textTransform: 'none',
                  color: 'text.secondary',
                  borderColor: 'divider',
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.dark' },
                  },
                },
              }}
            >
              <ToggleButton value="assist">アシスト</ToggleButton>
              <ToggleButton value="weighted">加重</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {assistValidation.message && (
          <Alert severity="error" sx={{ py: 0 }}>
            {assistValidation.message}
          </Alert>
        )}

        <SetTable columns={columns} compact={group.supportsAssist}>
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
              // アシスト対応カードでは負荷が計算できていない行に前回差分を出さない
              const showRowDelta =
                Boolean(group.latestSets) && (!group.supportsAssist || weight > 0)

              return (
                <TableRow key={set.key}>
                  {group.supportsAssist ? (
                    <>
                      <SetNumberInputCell
                        value={set.assistValue}
                        onChange={(value) => onChangeSet(index, setIndex, 'assist', value)}
                        min={0}
                        step={0.5}
                      />
                      <SetValueCell
                        value={
                          parseNumericInput(set.weight) === null ? '-' : weight.toLocaleString()
                        }
                        note={
                          showRowDelta ? (
                            <SetCellNote color={weightDelta.color}>{weightDelta.text}</SetCellNote>
                          ) : undefined
                        }
                      />
                    </>
                  ) : (
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
                  )}
                  <SetNumberInputCell
                    value={set.reps}
                    onChange={(value) => onChangeSet(index, setIndex, 'reps', value)}
                    min={0}
                    step={1}
                    placeholder="0"
                    note={
                      showRowDelta ? (
                        <SetCellNote color={repsDelta.color}>{repsDelta.text}</SetCellNote>
                      ) : undefined
                    }
                  />
                  <SetValueCell
                    value={volume > 0 ? volume.toLocaleString() : '-'}
                    note={
                      showRowDelta ? (
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
              labelColSpan={group.supportsAssist ? 3 : 2}
              note={
                group.latestSets && (!group.supportsAssist || totalVolume > 0) ? (
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
