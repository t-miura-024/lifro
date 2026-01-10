'use client'

import type { Exercise } from '@/server/domain/entities'
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import {
  canDeleteExerciseAction,
  createExerciseAction,
  deleteExerciseAction,
  getExercisesAction,
  updateExerciseAction,
  updateExerciseSortOrderAction,
} from '../_actions'
import SortableExerciseItem from './SortableExerciseItem'

export default function ExerciseList() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isPending, startTransition] = useTransition()
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSorting, setIsSorting] = useState(false)
  const isInitialLoadRef = useRef(true)

  // ダイアログ状態
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [exerciseName, setExerciseName] = useState('')

  // エラー表示
  const [errorSnackbar, setErrorSnackbar] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // 種目リストを取得
  const loadExercises = useCallback(() => {
    startTransition(async () => {
      const data = await getExercisesAction()
      setExercises(data)
      if (isInitialLoadRef.current) {
        setIsInitialLoading(false)
        isInitialLoadRef.current = false
      }
    })
  }, [])

  useEffect(() => {
    loadExercises()
  }, [loadExercises])

  // ドラッグ終了時の処理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = exercises.findIndex((item) => item.id === active.id)
      const newIndex = exercises.findIndex((item) => item.id === over.id)
      const newItems = arrayMove(exercises, oldIndex, newIndex)

      // ローカル状態を即座に更新
      setExercises(newItems)

      // 並び順をサーバーに保存
      setIsSorting(true)
      startTransition(async () => {
        const sortOrderUpdates = newItems.map((item, index) => ({
          id: item.id,
          sortIndex: index,
        }))
        await updateExerciseSortOrderAction(sortOrderUpdates)
        setIsSorting(false)
      })
    }
  }

  // 新規作成
  const handleCreate = () => {
    setExerciseName('')
    setCreateDialogOpen(true)
  }

  const handleCreateConfirm = () => {
    if (!exerciseName.trim()) return

    startTransition(async () => {
      await createExerciseAction(exerciseName.trim())
      setCreateDialogOpen(false)
      setExerciseName('')
      loadExercises()
    })
  }

  // 編集
  const handleEdit = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setExerciseName(exercise.name)
    setEditDialogOpen(true)
  }

  const handleEditConfirm = () => {
    if (!selectedExercise || !exerciseName.trim()) return

    startTransition(async () => {
      await updateExerciseAction(selectedExercise.id, exerciseName.trim())
      setEditDialogOpen(false)
      setSelectedExercise(null)
      setExerciseName('')
      loadExercises()
    })
  }

  // 削除
  const handleDelete = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!selectedExercise) return

    startTransition(async () => {
      const canDelete = await canDeleteExerciseAction(selectedExercise.id)
      if (!canDelete) {
        setErrorSnackbar('この種目にはトレーニング記録が存在するため削除できません')
        setDeleteDialogOpen(false)
        setSelectedExercise(null)
        return
      }

      await deleteExerciseAction(selectedExercise.id)
      setDeleteDialogOpen(false)
      setSelectedExercise(null)
      loadExercises()
    })
  }

  // スケルトンローディング表示
  const renderSkeleton = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 48 }} />
            <TableCell>種目名</TableCell>
            <TableCell sx={{ width: 48 }} />
            <TableCell sx={{ width: 48 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {[1, 2, 3].map((i) => (
            <TableRow key={i}>
              <TableCell sx={{ width: 48, p: 1 }}>
                <Skeleton variant="circular" width={32} height={32} />
              </TableCell>
              <TableCell>
                <Skeleton variant="text" width="60%" />
              </TableCell>
              <TableCell sx={{ width: 48, p: 1 }}>
                <Skeleton variant="circular" width={28} height={28} />
              </TableCell>
              <TableCell sx={{ width: 48, p: 1 }}>
                <Skeleton variant="circular" width={28} height={28} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )

  return (
    <Box sx={{ position: 'relative' }}>
      {/* 並び替え保存中オーバーレイ */}
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
          onClick={handleCreate}
          disabled={isPending || isInitialLoading}
          aria-label="種目を追加"
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <AddIcon fontSize="medium" />
        </Button>
      </Stack>

      {isInitialLoading ? (
        renderSkeleton()
      ) : exercises.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            種目が登録されていません。
            <br />
            「追加」ボタンから種目を登録してください。
          </Typography>
        </Paper>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={exercises.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 48 }} />
                    <TableCell>種目名</TableCell>
                    <TableCell sx={{ width: 48 }} />
                    <TableCell sx={{ width: 48 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {exercises.map((exercise) => (
                    <SortableExerciseItem
                      key={exercise.id}
                      exercise={exercise}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SortableContext>
        </DndContext>
      )}

      {/* 新規作成ダイアログ */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>種目を追加</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="種目名"
            fullWidth
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                handleCreateConfirm()
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={isPending}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateConfirm}
            disabled={isPending || !exerciseName.trim()}
          >
            追加
          </Button>
        </DialogActions>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>種目を編集</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="種目名"
            fullWidth
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                handleEditConfirm()
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)} disabled={isPending}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleEditConfirm}
            disabled={isPending || !exerciseName.trim()}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>削除の確認</DialogTitle>
        <DialogContent>
          <Typography>
            「{selectedExercise?.name}」を削除しますか？
            <br />
            この操作は取り消せません。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isPending}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={isPending}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>

      {/* エラースナックバー */}
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
