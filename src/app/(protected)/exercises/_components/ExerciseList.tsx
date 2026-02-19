'use client'

import { client, type InferResponseType } from '@/app/_lib/hono/client'
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
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import {
  Alert,
  Backdrop,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import BodyPartEditDialog from './BodyPartEditDialog'
import SortableExerciseItem, { categoryColors } from './SortableExerciseItem'

/** APIレスポンスから推論された種目型 */
const exercisesWithBodyPartsEndpoint = client.api.exercises['with-body-parts'].$get
type ExerciseWithBodyParts = InferResponseType<typeof exercisesWithBodyPartsEndpoint>[number]

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

export default function ExerciseList() {
  const [exercises, setExercises] = useState<ExerciseWithBodyParts[]>([])
  const [isPending, startTransition] = useTransition()
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSorting, setIsSorting] = useState(false)
  const isInitialLoadRef = useRef(true)

  // ダイアログ状態
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bodyPartDialogOpen, setBodyPartDialogOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithBodyParts | null>(null)
  const [exerciseName, setExerciseName] = useState('')

  // エラー表示
  const [errorSnackbar, setErrorSnackbar] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // カテゴリでグループ化
  const groupedExercises = useMemo(() => {
    const groups: Record<string, ExerciseWithBodyParts[]> = {}

    // まず未分類グループを初期化
    groups.UNCATEGORIZED = []

    // カテゴリ順にグループを初期化
    for (const category of categoryOrder) {
      groups[category] = []
    }

    // 種目をグループに振り分け
    for (const exercise of exercises) {
      const category = exercise.primaryCategory || 'UNCATEGORIZED'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(exercise)
    }

    return groups
  }, [exercises])

  // 種目リストを取得
  const loadExercises = useCallback(() => {
    startTransition(async () => {
      const res = await client.api.exercises['with-body-parts'].$get()
      const data = await res.json()
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

  // ドラッグ終了時の処理（同一カテゴリ内のみ許可）
  const handleDragEnd = (event: DragEndEvent, categoryExercises: ExerciseWithBodyParts[]) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = categoryExercises.findIndex((item) => item.id === active.id)
    const newIndex = categoryExercises.findIndex((item) => item.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const newItems = arrayMove(categoryExercises, oldIndex, newIndex)

    // ローカル状態を更新
    setExercises((prev) => {
      const updated = [...prev]
      for (let i = 0; i < newItems.length; i++) {
        const exerciseIndex = updated.findIndex((e) => e.id === newItems[i].id)
        if (exerciseIndex !== -1) {
          updated[exerciseIndex] = { ...updated[exerciseIndex], sortIndex: i }
        }
      }
      return updated
    })

    // 変更されたアイテムのみを抽出して並び順を保存
    const minIndex = Math.min(oldIndex, newIndex)
    const maxIndex = Math.max(oldIndex, newIndex)
    const changedItems = newItems
      .slice(minIndex, maxIndex + 1)
      .map((item, i) => ({ id: item.id, sortIndex: minIndex + i }))

    setIsSorting(true)
    startTransition(async () => {
      await client.api.exercises['sort-order'].$put({
        json: { exercises: changedItems },
      })
      setIsSorting(false)
    })
  }

  // 新規作成
  const handleCreate = () => {
    setExerciseName('')
    setCreateDialogOpen(true)
  }

  const handleCreateConfirm = () => {
    if (!exerciseName.trim()) return

    startTransition(async () => {
      await client.api.exercises.$post({
        json: { name: exerciseName.trim() },
      })
      setCreateDialogOpen(false)
      setExerciseName('')
      loadExercises()
    })
  }

  // 編集
  const handleEdit = useCallback((exercise: ExerciseWithBodyParts) => {
    setSelectedExercise(exercise)
    setExerciseName(exercise.name)
    setEditDialogOpen(true)
  }, [])

  const handleEditConfirm = () => {
    if (!selectedExercise || !exerciseName.trim()) return

    startTransition(async () => {
      await client.api.exercises[':id'].$put({
        param: { id: String(selectedExercise.id) },
        json: { name: exerciseName.trim() },
      })
      setEditDialogOpen(false)
      setSelectedExercise(null)
      setExerciseName('')
      loadExercises()
    })
  }

  // 削除
  const handleDelete = useCallback((exercise: ExerciseWithBodyParts) => {
    setSelectedExercise(exercise)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = () => {
    if (!selectedExercise) return

    startTransition(async () => {
      const canDeleteRes = await client.api.exercises[':id']['can-delete'].$get({
        param: { id: String(selectedExercise.id) },
      })
      const { canDelete } = await canDeleteRes.json()
      if (!canDelete) {
        setErrorSnackbar('この種目にはトレーニング記録が存在するため削除できません')
        setDeleteDialogOpen(false)
        setSelectedExercise(null)
        return
      }

      await client.api.exercises[':id'].$delete({
        param: { id: String(selectedExercise.id) },
      })
      setDeleteDialogOpen(false)
      setSelectedExercise(null)
      loadExercises()
    })
  }

  // 部位編集
  const handleBodyPartEdit = useCallback((exercise: ExerciseWithBodyParts) => {
    setSelectedExercise(exercise)
    setBodyPartDialogOpen(true)
  }, [])

  // スケルトンローディング表示
  const renderSkeleton = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 48 }} />
            <TableCell>種目名</TableCell>
            <TableCell>部位</TableCell>
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
              <TableCell>
                <Skeleton variant="text" width="40%" />
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

  // カテゴリグループをレンダリング
  const renderCategoryGroup = (category: string, categoryExercises: ExerciseWithBodyParts[]) => {
    if (categoryExercises.length === 0) return null

    const categoryLabel =
      category === 'UNCATEGORIZED' ? '未分類' : categoryLabels[category] || category

    return (
      <Box key={category} sx={{ mb: 3 }}>
        <Typography
          variant="subtitle1"
          sx={{
            mb: 1,
            px: 1.5,
            py: 0.75,
            bgcolor: categoryColors[category]?.bg ?? 'action.hover',
            color: categoryColors[category]?.text ?? 'text.primary',
            borderRadius: 1,
            fontWeight: 'bold',
          }}
        >
          {categoryLabel}
        </Typography>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => handleDragEnd(event, categoryExercises)}
        >
          <SortableContext
            items={categoryExercises.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableBody>
                  {categoryExercises.map((exercise) => (
                    <SortableExerciseItem
                      key={exercise.id}
                      exercise={exercise}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onBodyPartEdit={handleBodyPartEdit}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SortableContext>
        </DndContext>
      </Box>
    )
  }

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
        <Box>
          {/* カテゴリ順にレンダリング */}
          {categoryOrder.map((category) =>
            renderCategoryGroup(category, groupedExercises[category] || []),
          )}
          {/* 未分類は最後に */}
          {renderCategoryGroup('UNCATEGORIZED', groupedExercises.UNCATEGORIZED || [])}
        </Box>
      )}

      {/* 新規作成ダイアログ */}
      <Dialog
        open={createDialogOpen}
        onClose={(_event, reason) => {
          if (reason === 'backdropClick') return
          setCreateDialogOpen(false)
        }}
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
        onClose={(_event, reason) => {
          if (reason === 'backdropClick') return
          setEditDialogOpen(false)
        }}
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
        onClose={(_event, reason) => {
          if (reason === 'backdropClick') return
          setDeleteDialogOpen(false)
        }}
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

      {/* 部位編集ダイアログ */}
      <BodyPartEditDialog
        open={bodyPartDialogOpen}
        onClose={() => {
          setBodyPartDialogOpen(false)
          setSelectedExercise(null)
        }}
        exerciseId={selectedExercise?.id ?? null}
        exerciseName={selectedExercise?.name ?? ''}
        initialBodyParts={
          selectedExercise?.bodyParts?.map((bp) => ({
            bodyPartId: bp.bodyPartId,
            loadRatio: bp.loadRatio,
          })) ?? []
        }
        onSave={loadExercises}
      />

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
