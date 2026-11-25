import { orpc } from '@/lib/orpc-client'
import { queryKeys, refreshRoutinesCache } from '@/lib/query-keys'
import type { Routine } from '@/server/domain/entities'
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import {
  Alert,
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { memo, useCallback, useMemo, useState, useTransition } from 'react'

type SortableRoutineItemProps = {
  routine: Routine
  exerciseNames: string
  onEdit: (routine: Routine) => void
  onDelete: (routine: Routine) => void
}

const SortableRoutineItem = memo(function SortableRoutineItemInner({
  routine,
  exerciseNames,
  onEdit,
  onDelete,
}: SortableRoutineItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: routine.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const totalSets = routine.routineItems.reduce((sum, item) => sum + item.setCount, 0)

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      variant="outlined"
      sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
      onClick={() => onEdit(routine)}
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
            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {routine.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {routine.routineItems.length}種目 / 合計{totalSets}セット
          </Typography>
          {exerciseNames && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {exerciseNames}
            </Typography>
          )}
        </Box>

        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(routine)
          }}
          aria-label="ルーティンを削除"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Paper>
  )
})

function RoutineList() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: routines = [], isPending: isInitialLoading } = useQuery({
    queryKey: queryKeys.routines.list,
    queryFn: () => orpc.routines.list(),
  })
  const { data: exercises = [] } = useQuery({
    queryKey: queryKeys.exercises.withBodyParts,
    queryFn: () => orpc.exercises.listWithBodyParts(),
  })
  const [isPending, startTransition] = useTransition()
  const [isSorting, setIsSorting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Routine | null>(null)
  const [errorSnackbar, setErrorSnackbar] = useState<string | null>(null)

  const exerciseNameById = useMemo(
    () => new Map<number, string>(exercises.map((exercise) => [exercise.id, exercise.name])),
    [exercises],
  )

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = routines.findIndex((item) => item.id === active.id)
    const newIndex = routines.findIndex((item) => item.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newItems = arrayMove(routines, oldIndex, newIndex)

    // クライアントキャッシュを即座に更新（楽観更新）
    queryClient.setQueryData(queryKeys.routines.list, newItems)

    // 変更されたアイテムのみを抽出して並び順を保存
    const minIndex = Math.min(oldIndex, newIndex)
    const maxIndex = Math.max(oldIndex, newIndex)
    const changedItems = newItems
      .slice(minIndex, maxIndex + 1)
      .map((item, i) => ({ id: item.id, sortIndex: minIndex + i }))

    setIsSorting(true)
    startTransition(async () => {
      try {
        await orpc.routines.updateSortOrder(changedItems)
      } catch (error) {
        // 失敗時はサーバーの正しい順序へ戻す（楽観更新のロールバック）
        await refreshRoutinesCache(queryClient)
        console.error('[routines] updateSortOrder failed', error)
      } finally {
        setIsSorting(false)
      }
    })
  }

  const handleEdit = useCallback(
    (routine: Routine) => {
      void navigate({ to: '/routines/$routineId', params: { routineId: String(routine.id) } })
    },
    [navigate],
  )

  const handleDelete = useCallback((routine: Routine) => {
    setDeleteTarget(routine)
  }, [])

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    const target = deleteTarget

    startTransition(async () => {
      try {
        await orpc.routines.remove(target.id)
        void refreshRoutinesCache(queryClient)
        setDeleteTarget(null)
      } catch (error) {
        console.error('[routines] delete failed', error)
        setDeleteTarget(null)
        setErrorSnackbar('ルーティンの削除に失敗しました')
      }
    })
  }

  const renderSkeleton = () => (
    <Stack spacing={1.5}>
      {[1, 2, 3].map((i) => (
        <Paper key={i} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="40%" height={20} />
            </Box>
            <Skeleton variant="circular" width={32} height={32} />
          </Stack>
        </Paper>
      ))}
    </Stack>
  )

  return (
    <Box sx={{ position: 'relative' }}>
      <Backdrop
        open={isSorting}
        sx={{
          position: 'absolute',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'rgba(0, 0, 0, 0.5)',
          borderRadius: 1,
        }}
      >
        <Stack alignItems="center" gap={1}>
          <CircularProgress size={32} sx={{ color: 'white' }} />
          <Typography variant="body2" sx={{ color: 'white' }}>
            保存中...
          </Typography>
        </Stack>
      </Backdrop>

      <Stack direction="row" justifyContent="flex-end" alignItems="center" mb={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate({ to: '/routines/new' })}
          disabled={isPending || isInitialLoading}
          aria-label="ルーティンを追加"
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <AddIcon fontSize="medium" />
        </Button>
      </Stack>

      {isInitialLoading ? (
        renderSkeleton()
      ) : routines.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            ルーティンが登録されていません。
            <br />
            「追加」ボタンからルーティンを登録してください。
          </Typography>
        </Paper>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={routines.map((routine) => routine.id)}
            strategy={verticalListSortingStrategy}
          >
            <Stack spacing={1.5}>
              {routines.map((routine) => (
                <SortableRoutineItem
                  key={routine.id}
                  routine={routine}
                  exerciseNames={routine.routineItems
                    .map((item) => exerciseNameById.get(item.exerciseId))
                    .filter((exerciseName): exerciseName is string => Boolean(exerciseName))
                    .join(' / ')}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      )}

      <Dialog
        open={deleteTarget !== null}
        onClose={(_event, reason) => {
          if (reason === 'backdropClick') return
          setDeleteTarget(null)
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>削除の確認</DialogTitle>
        <DialogContent>
          <Typography>
            「{deleteTarget?.name}」を削除しますか？
            <br />
            この操作は取り消せません。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={isPending}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={isPending}
          >
            {isPending ? '削除中...' : '削除'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!errorSnackbar}
        autoHideDuration={5000}
        onClose={() => setErrorSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setErrorSnackbar(null)}>
          {errorSnackbar}
        </Alert>
      </Snackbar>
    </Box>
  )
}

function RoutinesPage() {
  return <RoutineList />
}

export const Route = createFileRoute('/_protected/routines/')({
  component: RoutinesPage,
})
