import {
  type RoutineItemFormData,
  SortableRoutineItem,
  createEmptyRoutineItem,
} from '@/components/routine/sortable-routine-item'
import { orpc } from '@/lib/orpc-client'
import { queryKeys, refreshRoutinesCache } from '@/lib/query-keys'
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
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useTransition } from 'react'

type ExerciseWithBodyParts = Awaited<ReturnType<typeof orpc.exercises.listWithBodyParts>>[number]

function isPositiveIntegerString(value: string): boolean {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0
}

type RoutineFormPageProps = {
  routineId: number | null
}

/**
 * ルーティンの作成・編集画面（新規は routineId=null）。
 * 一覧画面とは別 route にし、同じフォームを新規/編集で共用する。
 */
export function RoutineFormPage({ routineId }: RoutineFormPageProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [items, setItems] = useState<RoutineItemFormData[]>([createEmptyRoutineItem()])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startTransition] = useTransition()

  const { data: exercises = [] } = useQuery({
    queryKey: queryKeys.exercises.withBodyParts,
    queryFn: () => orpc.exercises.listWithBodyParts(),
  })

  const routineQuery = useQuery({
    queryKey: queryKeys.routines.detail(routineId ?? 0),
    queryFn: () => orpc.routines.get(routineId as number),
    enabled: routineId !== null,
  })
  const existing = routineQuery.data ?? null
  const isRoutineLoading = routineId !== null && routineQuery.isPending

  useEffect(() => {
    if (routineId === null) {
      setName('')
      setItems([createEmptyRoutineItem()])
      return
    }
    if (!existing) return
    setName(existing.name)
    setItems(
      existing.routineItems.length > 0
        ? existing.routineItems.map((item) => ({
            key: `routine-item-${item.id}`,
            exerciseId: item.exerciseId,
            setCount: item.setCount.toString(),
            targetReps: item.targetReps === null ? '' : item.targetReps.toString(),
          }))
        : [createEmptyRoutineItem()],
    )
  }, [routineId, existing])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((item) => item.key === active.id)
    const newIndex = items.findIndex((item) => item.key === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      setItems(arrayMove(items, oldIndex, newIndex))
    }
  }

  const handleItemChange = (
    index: number,
    field: 'exerciseId' | 'setCount' | 'targetReps',
    value: string,
  ) => {
    const next = [...items]
    if (field === 'exerciseId') {
      next[index] = { ...next[index], exerciseId: value ? Number.parseInt(value, 10) : null }
    } else {
      next[index] = { ...next[index], [field]: value }
    }
    setItems(next)
  }

  const handleAddItem = () => {
    setItems([...items, createEmptyRoutineItem()])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  // 種目が未選択の行は保存対象から除外する（追加直後の空行を許容するため）
  const filledItems = items.filter(
    (item): item is RoutineItemFormData & { exerciseId: number } => item.exerciseId !== null,
  )
  const isFormValid =
    name.trim() !== '' &&
    filledItems.length > 0 &&
    filledItems.every(
      (item) =>
        isPositiveIntegerString(item.setCount) &&
        (item.targetReps.trim() === '' || isPositiveIntegerString(item.targetReps)),
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
        if (
          routinesList.some((routine) => routine.id !== routineId && routine.name === trimmedName)
        ) {
          setError('同名のルーティンが既に存在します')
          return
        }

        const input = {
          name: trimmedName,
          sortIndex: existing?.sortIndex ?? 0,
          routineItems: filledItems.map((item, index) => ({
            exerciseId: item.exerciseId,
            sortIndex: index,
            setCount: Number(item.setCount),
            targetReps: item.targetReps.trim() === '' ? null : Number(item.targetReps),
          })),
        }

        if (routineId === null) {
          await orpc.routines.create(input)
        } else {
          await orpc.routines.update(routineId, input)
        }

        void refreshRoutinesCache(queryClient)
        await navigate({ to: '/routines' })
      } catch (saveError) {
        console.error('[routines] save failed', saveError)
        setError('保存に失敗しました。同じ名前のルーティンがないか確認してください。')
      }
    })
  }

  if (isRoutineLoading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={48} />
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={120} />
      </Stack>
    )
  }

  if (routineId !== null && !existing) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary" gutterBottom>
          ルーティンが見つかりません
        </Typography>
        <Button onClick={() => navigate({ to: '/routines' })} sx={{ mt: 2 }}>
          一覧へ戻る
        </Button>
      </Paper>
    )
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton
          onClick={() => navigate({ to: '/routines' })}
          disabled={isSaving}
          aria-label="一覧へ戻る"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>
          {routineId === null ? 'ルーティンを作成' : 'ルーティンを編集'}
        </Typography>
      </Stack>

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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={items.map((item) => item.key)}
            strategy={verticalListSortingStrategy}
          >
            <Stack spacing={1.5}>
              {items.map((item, index) => (
                <SortableRoutineItem
                  key={item.key}
                  item={item}
                  index={index}
                  exercises={exercises}
                  canDelete={items.length > 1}
                  onChange={handleItemChange}
                  onRemove={handleRemoveItem}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>

        <Button
          startIcon={<AddIcon />}
          onClick={handleAddItem}
          variant="text"
          fullWidth
          sx={{ mt: 2 }}
        >
          種目を追加
        </Button>
      </Box>

      <Button
        variant="contained"
        onClick={handleSave}
        disabled={isSaving || !isFormValid}
        sx={{ minHeight: 48 }}
      >
        {isSaving ? '保存中...' : '保存'}
      </Button>
    </Stack>
  )
}
