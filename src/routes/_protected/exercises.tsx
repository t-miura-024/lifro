import { client, type InferResponseType } from '@/lib/hono-client'
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
import EditIcon from '@mui/icons-material/Edit'
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
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
  Tooltip,
  Typography,
} from '@mui/material'
import { createFileRoute } from '@tanstack/react-router'
import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
/** 部位情報 */
type BodyPartInfo = {
  bodyPartId: number
  loadRatio: number
  bodyPart?: {
    category: string
    name: string
  }
}

/** コンポーネントで使用する種目の型 */
type ExerciseItem = {
  id: number
  name: string
  bodyParts?: BodyPartInfo[]
}

type SortableExerciseItemProps<T extends ExerciseItem> = {
  exercise: T
  onEdit: (exercise: T) => void
  onDelete: (exercise: T) => void
  onBodyPartEdit?: (exercise: T) => void
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

/** 部位カテゴリの色定義 */
const categoryColors: Record<string, { bg: string; text: string }> = {
  CHEST: { bg: '#c17b7b', text: '#fff' }, // くすみ赤
  BACK: { bg: '#7b9fc1', text: '#fff' }, // くすみ青
  SHOULDER: { bg: '#c9a66b', text: '#fff' }, // くすみオレンジ
  ARM: { bg: '#9b7bb5', text: '#fff' }, // くすみ紫
  ABS: { bg: '#7bab7e', text: '#fff' }, // くすみ緑
  LEG: { bg: '#b57b8e', text: '#fff' }, // くすみピンク
}

function SortableExerciseItemInner<T extends ExerciseItem>({
  exercise,
  onEdit,
  onDelete,
  onBodyPartEdit,
}: SortableExerciseItemProps<T>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // 部位表示用のチップを生成（カテゴリバッジ付き）
  const bodyPartChips = exercise.bodyParts?.map((bp) => {
    const category = bp.bodyPart?.category ?? ''
    const categoryLabel = categoryLabels[category] ?? ''
    const colors = categoryColors[category] ?? { bg: '#f5f5f5', text: '#616161' }
    const partName = bp.bodyPart?.name ?? String(bp.bodyPartId)

    return (
      <Chip
        key={bp.bodyPartId}
        size="small"
        sx={{
          fontSize: '0.7rem',
          height: 22,
          backgroundColor: colors.bg,
          color: colors.text,
          '& .MuiChip-label': {
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          },
        }}
        label={
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              component="span"
              sx={{
                fontWeight: 600,
                borderRight: '1px solid rgba(255,255,255,0.4)',
                pr: 0.5,
                mr: 0.25,
              }}
            >
              {categoryLabel}
            </Box>
            <Box component="span">
              {partName} {bp.loadRatio}%
            </Box>
          </Box>
        }
      />
    )
  })

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell sx={{ width: 48, p: 1 }}>
        <IconButton
          size="small"
          {...attributes}
          {...listeners}
          sx={{ cursor: 'grab', touchAction: 'none' }}
          aria-label="ドラッグして並び替え"
        >
          <DragIndicatorIcon />
        </IconButton>
      </TableCell>
      <TableCell>
        <Stack spacing={0.5}>
          <Typography>{exercise.name}</Typography>
          {exercise.bodyParts && exercise.bodyParts.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {bodyPartChips}
            </Stack>
          )}
        </Stack>
      </TableCell>
      {onBodyPartEdit && (
        <TableCell sx={{ width: 48, p: 1 }}>
          <Tooltip title="部位を設定">
            <IconButton
              size="small"
              onClick={() => onBodyPartEdit(exercise)}
              aria-label="部位を設定"
            >
              <FitnessCenterIcon
                fontSize="small"
                color={exercise.bodyParts?.length ? 'primary' : 'disabled'}
              />
            </IconButton>
          </Tooltip>
        </TableCell>
      )}
      <TableCell sx={{ width: 48, p: 1 }}>
        <IconButton size="small" onClick={() => onEdit(exercise)} aria-label="編集">
          <EditIcon fontSize="small" />
        </IconButton>
      </TableCell>
      <TableCell sx={{ width: 48, p: 1 }}>
        <IconButton size="small" onClick={() => onDelete(exercise)} aria-label="削除">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  )
}

// ジェネリックコンポーネントをmemoで包む
const SortableExerciseItem = memo(SortableExerciseItemInner) as typeof SortableExerciseItemInner

const bodyPartsEndpoint = client.api.exercises['body-parts'].$get
type BodyPart = InferResponseType<typeof bodyPartsEndpoint>[number]

type ExerciseBodyPartInput = {
  bodyPartId: number
  loadRatio: number
}

type BodyPartEditDialogProps = {
  open: boolean
  onClose: () => void
  exerciseId: number | null
  exerciseName: string
  initialBodyParts: ExerciseBodyPartInput[]
  onSave: () => void
}

function BodyPartEditDialog({
  open,
  onClose,
  exerciseId,
  exerciseName,
  initialBodyParts,
  onSave,
}: BodyPartEditDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [allBodyParts, setAllBodyParts] = useState<BodyPart[]>([])
  const [selectedBodyParts, setSelectedBodyParts] = useState<ExerciseBodyPartInput[]>([])
  const [error, setError] = useState<string | null>(null)

  // 部位マスタを取得
  useEffect(() => {
    if (open) {
      startTransition(async () => {
        const res = await client.api.exercises['body-parts'].$get()
        const data = await res.json()
        setAllBodyParts(data)
      })
      setSelectedBodyParts(initialBodyParts)
      setError(null)
    }
  }, [open, initialBodyParts])

  // 負荷割合の合計を計算
  const totalRatio = selectedBodyParts.reduce((sum, bp) => sum + bp.loadRatio, 0)
  const isValid = selectedBodyParts.length === 0 || totalRatio === 100

  // 部位を追加
  const handleAddBodyPart = () => {
    // まだ選択されていない部位を探す
    const usedIds = new Set(selectedBodyParts.map((bp) => bp.bodyPartId))
    const availableBodyPart = allBodyParts.find((bp) => !usedIds.has(bp.id))
    if (availableBodyPart) {
      setSelectedBodyParts([
        ...selectedBodyParts,
        { bodyPartId: availableBodyPart.id, loadRatio: 0 },
      ])
    }
  }

  // 部位を削除
  const handleRemoveBodyPart = (index: number) => {
    setSelectedBodyParts(selectedBodyParts.filter((_, i) => i !== index))
  }

  // 部位を変更
  const handleBodyPartChange = (index: number, bodyPartId: number) => {
    const newBodyParts = [...selectedBodyParts]
    newBodyParts[index] = { ...newBodyParts[index], bodyPartId }
    setSelectedBodyParts(newBodyParts)
  }

  // 負荷割合を変更
  const handleRatioChange = (index: number, ratio: number) => {
    const newBodyParts = [...selectedBodyParts]
    newBodyParts[index] = { ...newBodyParts[index], loadRatio: ratio }
    setSelectedBodyParts(newBodyParts)
  }

  // 保存
  const handleSave = useCallback(() => {
    if (!exerciseId) return
    if (!isValid) {
      setError('負荷割合の合計は100%にしてください')
      return
    }

    startTransition(async () => {
      await client.api.exercises[':exerciseId']['body-parts'].$put({
        param: { exerciseId: String(exerciseId) },
        json: { bodyParts: selectedBodyParts },
      })
      onSave()
      onClose()
    })
  }, [exerciseId, isValid, selectedBodyParts, onSave, onClose])

  // 部位をカテゴリでグループ化
  const bodyPartsByCategory = allBodyParts.reduce(
    (acc, bp) => {
      if (!acc[bp.category]) {
        acc[bp.category] = []
      }
      acc[bp.category].push(bp)
      return acc
    },
    {} as Record<string, BodyPart[]>,
  )

  // 選択済みの部位IDを取得
  const selectedIds = new Set(selectedBodyParts.map((bp) => bp.bodyPartId))

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === 'backdropClick') return
        onClose()
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>部位を設定 - {exerciseName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {selectedBodyParts.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              部位が設定されていません
            </Typography>
          ) : (
            selectedBodyParts.map((bp, index) => {
              const bodyPart = allBodyParts.find((p) => p.id === bp.bodyPartId)
              return (
                <Stack key={bp.bodyPartId} direction="row" spacing={1} alignItems="center">
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>部位</InputLabel>
                    <Select
                      value={bp.bodyPartId}
                      label="部位"
                      onChange={(e) => handleBodyPartChange(index, e.target.value as number)}
                    >
                      {Object.entries(bodyPartsByCategory).map(([category, parts]) => [
                        <MenuItem key={`header-${category}`} disabled sx={{ fontWeight: 'bold' }}>
                          {categoryLabels[category] || category}
                        </MenuItem>,
                        ...parts.map((part) => (
                          <MenuItem
                            key={part.id}
                            value={part.id}
                            disabled={selectedIds.has(part.id) && part.id !== bp.bodyPartId}
                            sx={{ pl: 3 }}
                          >
                            {part.name}
                          </MenuItem>
                        )),
                      ])}
                    </Select>
                  </FormControl>
                  <TextField
                    size="small"
                    type="number"
                    label="負荷%"
                    value={bp.loadRatio}
                    onChange={(e) => handleRatioChange(index, Number(e.target.value))}
                    inputProps={{ min: 0, max: 100, step: 5 }}
                    sx={{ width: 100 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveBodyPart(index)}
                    aria-label="削除"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              )
            })
          )}

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddBodyPart}
              disabled={selectedBodyParts.length >= allBodyParts.length}
            >
              部位を追加
            </Button>
          </Box>

          {selectedBodyParts.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Typography variant="body2">合計:</Typography>
              <Chip label={`${totalRatio}%`} color={isValid ? 'success' : 'error'} size="small" />
            </Box>
          )}

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isPending}>
          キャンセル
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={isPending || !isValid}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/** APIレスポンスから推論された種目型 */
const exercisesWithBodyPartsEndpoint = client.api.exercises['with-body-parts'].$get
type ExerciseWithBodyParts = InferResponseType<typeof exercisesWithBodyPartsEndpoint>[number]

/** カテゴリの表示順 */
const categoryOrder = ['CHEST', 'BACK', 'SHOULDER', 'ARM', 'ABS', 'LEG']

function ExerciseList() {
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

/**
 * 種目ページ本体（純粋UI層。`src/routes/_protected/exercises.tsx` が参照する。
 * Hono クライアントは型のみ `@/server/api/hono-app` を参照する
 * `@/lib/hono-client` 経由）。
 */
function ExercisesPage() {
  return <ExerciseList />
}

/**
 * Start 側 `/exercises`（`_protected` layout 配下。URL は `/exercises` のまま）。
 * Shell（nav・認証）は親 layout `src/routes/_protected/route.tsx` が提供する。
 */
export const Route = createFileRoute('/_protected/exercises')({
  component: ExercisesPage,
})
