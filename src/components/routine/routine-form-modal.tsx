import {
  type RoutineExerciseOption,
  type RoutineGroupFormData,
  type RoutineSetFormData,
  createEmptyRoutineGroup,
  createEmptyRoutineSet,
} from '@/components/routine/routine-form-types'
import { SortableRoutineGroup } from '@/components/routine/sortable-routine-group'
import { AddRowButton } from '@/components/ui/add-row-button'
import type { ExerciseSelectGroup } from '@/components/ui/exercise-select'
import { FormDialogActions } from '@/components/ui/form-dialog-actions'
import { ApiError, orpc } from '@/lib/orpc-client'
import { queryKeys, refreshRoutinesCache } from '@/lib/query-keys'
import type { Routine } from '@/server/domain/entities'
import { groupRoutineSets } from '@/server/domain/routine-sets'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, useTransition } from 'react'

function isPositiveIntegerString(value: string): boolean {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0
}

/**
 * 保存失敗時にサーバが返したユーザー向けメッセージを取り出す。
 * 4xx はサーバが理由を返す契約（同名ルーティン等）。5xx の汎用文言は
 * ユーザーに意味がないため表示しない。
 */
function toServerErrorMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null
  if (error.status < 400 || error.status >= 500) return null
  if (typeof error.body !== 'object' || error.body === null) return null
  const message = (error.body as { error?: unknown }).error
  return typeof message === 'string' && message !== '' ? message : null
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

/** 種目一覧を部位カテゴリ別の選択肢グループへ整形する。 */
function toExerciseSelectGroups(exercises: RoutineExerciseOption[]): ExerciseSelectGroup[] {
  const grouped = new Map<string, { id: number; name: string }[]>()
  for (const category of categoryOrder) {
    grouped.set(category, [])
  }
  for (const exercise of exercises) {
    const category = exercise.primaryCategory || 'UNCATEGORIZED'
    const options = grouped.get(category) ?? []
    options.push({ id: exercise.id, name: exercise.name })
    grouped.set(category, options)
  }

  return [...categoryOrder, 'UNCATEGORIZED']
    .map((category) => ({
      label: category === 'UNCATEGORIZED' ? '未分類' : categoryLabels[category] || category,
      options: grouped.get(category) ?? [],
    }))
    .filter((group) => group.options.length > 0)
}

function groupsFromRoutine(routine: Routine): RoutineGroupFormData[] {
  const groups = groupRoutineSets(routine.routineSets)
  if (groups.length === 0) {
    return [createEmptyRoutineGroup()]
  }

  return groups.map((group) => ({
    ...createEmptyRoutineGroup(),
    exerciseId: group.exerciseId,
    latestSets: null,
    sets: group.sets.map(
      (set): RoutineSetFormData => ({
        ...createEmptyRoutineSet(),
        targetReps: set.targetReps === null ? '' : set.targetReps.toString(),
      }),
    ),
  }))
}

type RoutineFormModalProps = {
  open: boolean
  routine: Routine | null
  onClose: () => void
  onSaved: () => void
}

/**
 * ルーティンの作成・編集モーダル。
 * 種目グループは routine_sets の連続から導出し、保存時にグループ順→セット行順の
 * 連番へ振り直して routine_sets を全置換する。
 */
export function RoutineFormModal({ open, routine, onClose, onSaved }: RoutineFormModalProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [groups, setGroups] = useState<RoutineGroupFormData[]>([createEmptyRoutineGroup()])
  const [exercises, setExercises] = useState<RoutineExerciseOption[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setError(null)
    setName(routine?.name ?? '')
    setGroups(routine ? groupsFromRoutine(routine) : [createEmptyRoutineGroup()])
    setExercises([])

    const load = async () => {
      const exerciseData = await queryClient.fetchQuery({
        queryKey: queryKeys.exercises.withBodyParts,
        queryFn: () => orpc.exercises.listWithBodyParts(),
      })
      if (cancelled) return
      setExercises(exerciseData)

      if (!routine) return
      const exerciseIds = [...new Set(routine.routineSets.map((set) => set.exerciseId))]
      if (exerciseIds.length === 0) return

      const latestSetsMap = await queryClient.fetchQuery({
        queryKey: queryKeys.logs.latestSetsMultiple(exerciseIds),
        queryFn: () => orpc.logs.getLatestSetsMultiple(exerciseIds),
      })
      if (cancelled) return
      setGroups((current) =>
        current.map((group) => {
          if (group.exerciseId === null) return group
          const latestSets = latestSetsMap[group.exerciseId]
          // 取得中に種目が変更されたグループは上書きしない
          return latestSets === undefined ? group : { ...group, latestSets }
        }),
      )
    }

    load().catch((loadError) => {
      console.error('[routines] initial load failed', loadError)
    })

    return () => {
      cancelled = true
    }
  }, [open, routine, queryClient])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = groups.findIndex((group) => group.key === active.id)
    const newIndex = groups.findIndex((group) => group.key === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      setGroups(arrayMove(groups, oldIndex, newIndex))
    }
  }

  const handleChangeExercise = async (index: number, exerciseId: number | null) => {
    setGroups((current) =>
      current.map((group, groupIndex) =>
        groupIndex === index ? { ...group, exerciseId, latestSets: null } : group,
      ),
    )
    if (exerciseId === null) return

    try {
      const latestSets = await queryClient.fetchQuery({
        queryKey: queryKeys.logs.latestSets(exerciseId),
        queryFn: () => orpc.logs.getLatestSets(exerciseId),
      })
      setGroups((current) =>
        current.map((group, groupIndex) =>
          groupIndex === index && group.exerciseId === exerciseId
            ? { ...group, latestSets }
            : group,
        ),
      )
    } catch (loadError) {
      console.error('[routines] latest sets load failed', loadError)
    }
  }

  const handleChangeTargetReps = (groupIndex: number, setIndex: number, value: string) => {
    setGroups((current) =>
      current.map((group, index) => {
        if (index !== groupIndex) return group
        return {
          ...group,
          sets: group.sets.map((set, index2) =>
            index2 === setIndex ? { ...set, targetReps: value } : set,
          ),
        }
      }),
    )
  }

  const handleAddSet = (groupIndex: number) => {
    setGroups((current) =>
      current.map((group, index) =>
        index === groupIndex ? { ...group, sets: [...group.sets, createEmptyRoutineSet()] } : group,
      ),
    )
  }

  const handleRemoveSet = (groupIndex: number, setIndex: number) => {
    setGroups((current) =>
      current.map((group, index) => {
        if (index !== groupIndex || group.sets.length <= 1) return group
        return { ...group, sets: group.sets.filter((_, i) => i !== setIndex) }
      }),
    )
  }

  const handleAddGroup = () => {
    setGroups((current) => [...current, createEmptyRoutineGroup()])
  }

  const handleRemoveGroup = (groupIndex: number) => {
    setGroups((current) =>
      current.length > 1 ? current.filter((_, index) => index !== groupIndex) : current,
    )
  }

  const activeGroups = groups.filter((group) => group.exerciseId !== null)
  const exerciseSelectGroups = toExerciseSelectGroups(exercises)
  const isFormValid =
    name.trim() !== '' &&
    activeGroups.length > 0 &&
    activeGroups.every(
      (group) =>
        group.sets.length > 0 &&
        group.sets.every(
          (set) => set.targetReps.trim() === '' || isPositiveIntegerString(set.targetReps),
        ),
    )

  const handleSave = () => {
    if (!isFormValid) return
    setError(null)

    startTransition(async () => {
      try {
        const trimmedName = name.trim()
        const routinesList = await queryClient.fetchQuery({
          queryKey: queryKeys.routines.list,
          queryFn: () => orpc.routines.list(),
        })
        if (routinesList.some((item) => item.id !== routine?.id && item.name === trimmedName)) {
          setError('同名のルーティンが既に存在します')
          return
        }

        const routineSets: {
          exerciseId: number
          sortIndex: number
          targetReps: number | null
        }[] = []
        let sortIndex = 0
        for (const group of groups) {
          if (group.exerciseId === null) continue
          for (const set of group.sets) {
            routineSets.push({
              exerciseId: group.exerciseId,
              sortIndex: sortIndex++,
              targetReps: set.targetReps.trim() === '' ? null : Number.parseInt(set.targetReps, 10),
            })
          }
        }

        const input = {
          name: trimmedName,
          sortIndex: routine?.sortIndex ?? 0,
          routineSets,
        }

        if (routine) {
          await orpc.routines.update(routine.id, input)
        } else {
          await orpc.routines.create(input)
        }

        void refreshRoutinesCache(queryClient)
        onSaved()
      } catch (saveError) {
        console.error('[routines] save failed', saveError)
        setError(toServerErrorMessage(saveError) ?? '保存に失敗しました')
      }
    })
  }

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === 'backdropClick') return
        onClose()
      }}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: { m: 1, width: 'calc(100% - 16px)', maxHeight: 'calc(100% - 16px)' },
      }}
    >
      <DialogTitle>{routine ? 'ルーティンを編集' : 'ルーティンを作成'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            label="ルーティン名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              種目（上から適用順）
            </Typography>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={groups.map((group) => group.key)}
                strategy={verticalListSortingStrategy}
              >
                <Stack spacing={1.5}>
                  {groups.map((group, index) => (
                    <SortableRoutineGroup
                      key={group.key}
                      group={group}
                      index={index}
                      exerciseGroups={exerciseSelectGroups}
                      canDeleteGroup={groups.length > 1}
                      onChangeExercise={handleChangeExercise}
                      onChangeTargetReps={handleChangeTargetReps}
                      onAddSet={handleAddSet}
                      onRemoveSet={handleRemoveSet}
                      onRemoveGroup={handleRemoveGroup}
                    />
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>

            <Box sx={{ mt: 2 }}>
              <AddRowButton label="種目を追加" onClick={handleAddGroup} />
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <FormDialogActions
        onClose={onClose}
        onSave={handleSave}
        closeDisabled={isSaving}
        saveDisabled={isSaving || !isFormValid}
        isSaving={isSaving}
      />
    </Dialog>
  )
}
