'use client'

import type { Exercise, LatestExerciseSets, TrainingMemo } from '@/server/domain/entities'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
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
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/ja'
import { useEffect, useState, useTransition } from 'react'
import {
  checkTrainingExistsAction,
  deleteTrainingAction,
  fetchLatestExerciseSetsAction,
  fetchLatestExerciseSetsMultipleAction,
  fetchMemosByDateAction,
  getExercisesAction,
  saveMemosAction,
  upsertTrainingAction,
} from '../_actions'

export type SetFormData = {
  key: string // unique key for React rendering
  id?: number
  exerciseId: number | null
  exerciseName: string
  weight: string
  reps: string
}

export type ExerciseGroup = {
  key: string // unique key for React rendering
  exerciseId: number | null
  exerciseName: string
  sets: SetFormData[]
  latestSets: LatestExerciseSets | null
}

type Props = {
  open: boolean
  onClose: () => void
  onSaved: (savedDate: Date) => void
  initialDate: Date
  initialSets?: SetFormData[]
}

export type MemoFormData = {
  key: string
  id?: number
  content: string
}

let groupKeyCounter = 0
let setKeyCounter = 0
let memoKeyCounter = 0

const emptySet = (exerciseId: number | null, exerciseName: string): SetFormData => ({
  key: `set-${Date.now()}-${setKeyCounter++}`,
  exerciseId,
  exerciseName,
  weight: '',
  reps: '',
})

const emptyMemo = (): MemoFormData => ({
  key: `memo-${Date.now()}-${memoKeyCounter++}`,
  content: '',
})

const emptyExerciseGroup = (): ExerciseGroup => ({
  key: `group-${Date.now()}-${groupKeyCounter++}`,
  exerciseId: null,
  exerciseName: '',
  sets: [emptySet(null, '')],
  latestSets: null,
})

// 差分をフォーマットする関数
const formatDelta = (current: number, previous: number | null) => {
  if (previous === null) return { text: 'NEW', color: 'text.secondary' }
  const delta = current - previous
  if (delta > 0) return { text: `+${delta.toLocaleString()}`, color: 'success.main' }
  if (delta < 0) return { text: delta.toLocaleString(), color: 'error.main' }
  return { text: '±0', color: 'text.disabled' }
}

export default function LogInputModal({ open, onClose, onSaved, initialDate, initialSets }: Props) {
  const [exerciseGroups, setExerciseGroups] = useState<ExerciseGroup[]>([emptyExerciseGroup()])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [memos, setMemos] = useState<MemoFormData[]>([])
  const [isPending, startTransition] = useTransition()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs(initialDate))
  const [dateError, setDateError] = useState<string | null>(null)
  const today = dayjs()

  // モーダルが開いたときに日付を初期化
  useEffect(() => {
    if (open) {
      setSelectedDate(dayjs(initialDate))
    }
  }, [open, initialDate])

  // 種目リストを取得し、初期データを種目単位でグルーピング
  useEffect(() => {
    if (open) {
      const excludeDateStr = selectedDate.format('YYYY-MM-DD')
      getExercisesAction().then(setExercises)

      // メモを取得
      fetchMemosByDateAction(excludeDateStr).then((fetchedMemos) => {
        if (fetchedMemos.length > 0) {
          setMemos(
            fetchedMemos.map((m) => ({
              key: `memo-${Date.now()}-${memoKeyCounter++}`,
              id: m.id,
              content: m.content,
            })),
          )
        } else {
          setMemos([])
        }
      })

      if (initialSets && initialSets.length > 0) {
        // 種目単位でグルーピング
        const grouped = new Map<number | string, ExerciseGroup>()
        for (const set of initialSets) {
          const groupKey = set.exerciseId ?? (set.exerciseName || 'new')
          if (!grouped.has(groupKey)) {
            grouped.set(groupKey, {
              key: `group-${Date.now()}-${groupKeyCounter++}`,
              exerciseId: set.exerciseId,
              exerciseName: set.exerciseName,
              sets: [],
              latestSets: null,
            })
          }
          const group = grouped.get(groupKey)
          if (group) {
            group.sets.push(set)
          }
        }
        const groups = Array.from(grouped.values())
        setExerciseGroups(groups)
        // 種目IDがある場合は前回の記録を一括取得（当日分は除外）
        const exerciseIds = groups
          .map((g) => g.exerciseId)
          .filter((id): id is number => id !== null)
        if (exerciseIds.length > 0) {
          fetchLatestExerciseSetsMultipleAction(exerciseIds, excludeDateStr).then(
            (latestSetsMap) => {
              for (const group of groups) {
                if (group.exerciseId && latestSetsMap[group.exerciseId]) {
                  group.latestSets = latestSetsMap[group.exerciseId]
                }
              }
              setExerciseGroups([...groups])
            },
          )
        }
      } else {
        setExerciseGroups([emptyExerciseGroup()])
      }
    }
  }, [open, initialSets, selectedDate])

  // 種目変更時に前回値を取得
  const handleExerciseChange = async (groupIndex: number, exerciseId: number | null) => {
    const newGroups = [...exerciseGroups]
    const group = newGroups[groupIndex]
    const exercise = exercises.find((e) => e.id === exerciseId)
    const excludeDateStr = selectedDate.format('YYYY-MM-DD')

    if (exercise) {
      group.exerciseId = exercise.id
      group.exerciseName = exercise.name
      // グループ内の全セットの種目を更新
      group.sets = group.sets.map((set) => ({
        ...set,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
      }))
      // 前回値を取得（当日分は除外）
      const latestSets = await fetchLatestExerciseSetsAction(exercise.id, excludeDateStr)
      group.latestSets = latestSets
    } else {
      group.exerciseId = null
      group.exerciseName = ''
      group.sets = group.sets.map((set) => ({
        ...set,
        exerciseId: null,
        exerciseName: '',
      }))
      group.latestSets = null
    }
    setExerciseGroups(newGroups)
  }

  const handleSetChange = (
    groupIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string,
  ) => {
    const newGroups = [...exerciseGroups]
    const group = newGroups[groupIndex]
    group.sets[setIndex] = { ...group.sets[setIndex], [field]: value }
    setExerciseGroups(newGroups)
  }

  const handleAddSet = (groupIndex: number) => {
    const newGroups = [...exerciseGroups]
    const group = newGroups[groupIndex]
    group.sets.push(emptySet(group.exerciseId, group.exerciseName))
    setExerciseGroups(newGroups)
  }

  const handleRemoveSet = (groupIndex: number, setIndex: number) => {
    const newGroups = [...exerciseGroups]
    const group = newGroups[groupIndex]
    if (group.sets.length > 1) {
      group.sets = group.sets.filter((_, i) => i !== setIndex)
      setExerciseGroups(newGroups)
    }
  }

  const handleAddExerciseGroup = () => {
    setExerciseGroups([...exerciseGroups, emptyExerciseGroup()])
  }

  const handleRemoveExerciseGroup = (groupIndex: number) => {
    if (exerciseGroups.length > 1) {
      setExerciseGroups(exerciseGroups.filter((_, i) => i !== groupIndex))
    }
  }

  // メモ操作
  const handleAddMemo = () => {
    setMemos([...memos, emptyMemo()])
  }

  const handleMemoChange = (index: number, content: string) => {
    const newMemos = [...memos]
    newMemos[index] = { ...newMemos[index], content }
    setMemos(newMemos)
  }

  const handleRemoveMemo = (index: number) => {
    setMemos(memos.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    startTransition(async () => {
      // エラーをクリア
      setDateError(null)

      // 全グループから有効なセットを収集
      const allSets: SetFormData[] = []
      for (const group of exerciseGroups) {
        // バリデーション: 種目IDと重量・回数が入力されているセットのみ
        const validSets = group.sets.filter((s) => group.exerciseId && s.weight && s.reps)
        allSets.push(...validSets)
      }

      if (allSets.length === 0) {
        return
      }

      const dateStr = selectedDate.format('YYYY-MM-DD')
      const initialDateStr = dayjs(initialDate).format('YYYY-MM-DD')

      // 日付が変更された場合、変更先に既存データがないかチェック
      if (dateStr !== initialDateStr) {
        const exists = await checkTrainingExistsAction(dateStr)
        if (exists) {
          setDateError(
            `${selectedDate.format('YYYY年M月D日')} には既にトレーニング記録があります。別の日付を選択してください。`,
          )
          return
        }
      }

      const setsToSave = allSets.map((s, index) => {
        const group = exerciseGroups.find((g) => g.sets.includes(s))
        if (!group || !group.exerciseId) {
          throw new Error('Exercise ID is required')
        }
        return {
          id: s.id,
          exerciseId: group.exerciseId,
          weight: Number.parseFloat(s.weight),
          reps: Number.parseInt(s.reps, 10),
          sortIndex: index,
        }
      })

      await upsertTrainingAction(dateStr, setsToSave)

      // メモを保存（空でないメモのみ）
      const validMemos = memos.filter((m) => m.content.trim() !== '')
      await saveMemosAction(
        dateStr,
        validMemos.map((m) => ({ id: m.id, content: m.content })),
      )

      onSaved(selectedDate.toDate())
      onClose()
    })
  }

  const handleDelete = () => {
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = () => {
    startTransition(async () => {
      const dateStr = selectedDate.format('YYYY-MM-DD')
      await deleteTrainingAction(dateStr)
      setDeleteConfirmOpen(false)
      onSaved(selectedDate.toDate())
      onClose()
    })
  }

  // 既存データがあるかどうかを判定（initialSetsが存在し、かつidが設定されているセットがある場合）
  const hasExistingData = initialSets?.some((set) => set.id !== undefined) ?? false

  // 種目が0件の場合の判定
  const hasNoExercises = exercises.length === 0

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: { m: 1, width: 'calc(100% - 16px)', maxHeight: 'calc(100% - 16px)' },
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <DatePicker
              value={selectedDate}
              onChange={(newDate) => {
                if (newDate) {
                  setSelectedDate(newDate)
                  setDateError(null)
                }
              }}
              maxDate={today}
              format="YYYY年M月D日"
              slotProps={{
                textField: {
                  variant: 'standard',
                  sx: {
                    '& .MuiInputBase-input': {
                      fontSize: '1.25rem',
                      fontWeight: 500,
                    },
                  },
                },
              }}
            />
            {hasExistingData && (
              <IconButton
                onClick={handleDelete}
                disabled={isPending}
                aria-label="トレーニングを削除"
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            {dateError && (
              <Alert severity="error" onClose={() => setDateError(null)}>
                {dateError}
              </Alert>
            )}
            {exerciseGroups.map((group, groupIndex) => {
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
                <Paper
                  key={group.key}
                  variant="outlined"
                  sx={{
                    p: 2,
                  }}
                  style={{ marginTop: '12px' }}
                >
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <FormControl fullWidth size="small" disabled={hasNoExercises}>
                        <InputLabel id={`exercise-label-${groupIndex}`}>
                          {hasNoExercises ? '種目を登録してください' : '種目'}
                        </InputLabel>
                        <Select
                          labelId={`exercise-label-${groupIndex}`}
                          value={group.exerciseId?.toString() || ''}
                          label={hasNoExercises ? '種目を登録してください' : '種目'}
                          onChange={(e: SelectChangeEvent) => {
                            const value = e.target.value
                            handleExerciseChange(
                              groupIndex,
                              value ? Number.parseInt(value, 10) : null,
                            )
                          }}
                          sx={{
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderRadius: 0,
                            },
                          }}
                        >
                          {exercises.map((exercise) => (
                            <MenuItem key={exercise.id} value={exercise.id.toString()}>
                              {exercise.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {exerciseGroups.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveExerciseGroup(groupIndex)}
                          aria-label="種目を削除"
                          sx={{ flexShrink: 0 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                    {group.latestSets && (
                      <Box style={{ marginTop: '6px' }}>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary' }}
                          style={{ fontSize: '0.875rem' }}
                        >
                          前回：{group.latestSets.date.toLocaleDateString('ja-JP')}
                        </Typography>
                      </Box>
                    )}

                    <TableContainer style={{ marginTop: '2px' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell align="right" width={120}>
                              重量 (kg)
                            </TableCell>
                            <TableCell align="right" width={100}>
                              回数
                            </TableCell>
                            <TableCell align="right" width={120}>
                              ボリューム
                            </TableCell>
                            <TableCell width={60} />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {group.sets.map((set, setIndex) => {
                            const weight = Number.parseFloat(set.weight) || 0
                            const reps = Number.parseInt(set.reps, 10) || 0
                            const volume = weight * reps
                            const previousSet = group.latestSets?.sets[setIndex] || null
                            const previousWeight = previousSet?.weight ?? null
                            const previousReps = previousSet?.reps ?? null
                            const previousVolume = previousSet
                              ? previousSet.weight * previousSet.reps
                              : null
                            const weightDelta = formatDelta(weight, previousWeight)
                            const repsDelta = formatDelta(reps, previousReps)
                            const volumeDelta = formatDelta(volume, previousVolume)
                            return (
                              <TableRow key={set.key}>
                                <TableCell sx={{ p: 0 }}>
                                  <Stack spacing={0.5}>
                                    <TextField
                                      type="number"
                                      size="small"
                                      value={set.weight}
                                      onChange={(e) =>
                                        handleSetChange(
                                          groupIndex,
                                          setIndex,
                                          'weight',
                                          e.target.value,
                                        )
                                      }
                                      inputProps={{ min: 0, step: 0.5 }}
                                      sx={{
                                        '& .MuiOutlinedInput-root': {
                                          borderRadius: 0,
                                        },
                                        '& .MuiOutlinedInput-notchedOutline': {
                                          border: 'none',
                                        },
                                        '& .MuiInputBase-input': {
                                          textAlign: 'right',
                                          padding: 0,
                                          '&::-webkit-outer-spin-button': {
                                            WebkitAppearance: 'none',
                                            margin: 0,
                                          },
                                          '&::-webkit-inner-spin-button': {
                                            WebkitAppearance: 'none',
                                            margin: 0,
                                          },
                                          '&[type=number]': {
                                            MozAppearance: 'textfield',
                                          },
                                        },
                                      }}
                                      fullWidth
                                    />
                                    {group.latestSets && (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          textAlign: 'right',
                                          color: weightDelta.color,
                                          fontSize: '0.7rem',
                                        }}
                                        style={{ marginTop: 0 }}
                                      >
                                        {weightDelta.text}
                                      </Typography>
                                    )}
                                  </Stack>
                                </TableCell>
                                <TableCell sx={{ p: 0 }}>
                                  <Stack spacing={0.5}>
                                    <TextField
                                      type="number"
                                      size="small"
                                      value={set.reps}
                                      onChange={(e) =>
                                        handleSetChange(
                                          groupIndex,
                                          setIndex,
                                          'reps',
                                          e.target.value,
                                        )
                                      }
                                      inputProps={{ min: 0, step: 1 }}
                                      sx={{
                                        '& .MuiOutlinedInput-root': {
                                          borderRadius: 0,
                                        },
                                        '& .MuiOutlinedInput-notchedOutline': {
                                          border: 'none',
                                        },
                                        '& .MuiInputBase-input': {
                                          textAlign: 'right',
                                          padding: 0,
                                          '&::-webkit-outer-spin-button': {
                                            WebkitAppearance: 'none',
                                            margin: 0,
                                          },
                                          '&::-webkit-inner-spin-button': {
                                            WebkitAppearance: 'none',
                                            margin: 0,
                                          },
                                          '&[type=number]': {
                                            MozAppearance: 'textfield',
                                          },
                                        },
                                      }}
                                      fullWidth
                                    />
                                    {group.latestSets && (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          textAlign: 'right',
                                          color: repsDelta.color,
                                          fontSize: '0.7rem',
                                        }}
                                        style={{ marginTop: 0 }}
                                      >
                                        {repsDelta.text}
                                      </Typography>
                                    )}
                                  </Stack>
                                </TableCell>
                                <TableCell align="right">
                                  <Stack spacing={0.5} alignItems="flex-end">
                                    <Typography>
                                      {volume > 0 ? volume.toLocaleString() : '-'}
                                    </Typography>
                                    {group.latestSets && (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: volumeDelta.color,
                                          fontSize: '0.7rem',
                                        }}
                                        style={{ marginTop: 0 }}
                                      >
                                        {volumeDelta.text}
                                      </Typography>
                                    )}
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  {group.sets.length > 1 && (
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRemoveSet(groupIndex, setIndex)}
                                      aria-label="セットを削除"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          <TableRow>
                            <TableCell colSpan={2} align="right">
                              <Typography variant="subtitle2">合計</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Stack spacing={0.5} alignItems="flex-end">
                                <Typography variant="subtitle2">
                                  {totalVolume > 0 ? totalVolume.toLocaleString() : '-'}
                                </Typography>
                                {group.latestSets && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: totalVolumeDelta.color,
                                      fontSize: '0.7rem',
                                    }}
                                    style={{ marginTop: 0 }}
                                  >
                                    {totalVolumeDelta.text}
                                  </Typography>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => handleAddSet(groupIndex)}
                      variant="text"
                      size="small"
                      fullWidth
                      sx={{
                        borderRadius: 0,
                        my: 0,
                        py: 0,
                        minHeight: 'auto',
                        '& .MuiButton-startIcon': {
                          marginRight: 1,
                        },
                      }}
                      style={{ marginTop: '4px' }}
                    >
                      セットを追加
                    </Button>
                  </Stack>
                </Paper>
              )
            })}

            <Button
              startIcon={<AddIcon />}
              onClick={handleAddExerciseGroup}
              variant="text"
              fullWidth
              sx={{
                borderRadius: 0,
                my: 0,
                py: 0,
                minHeight: 'auto',
                '& .MuiButton-startIcon': {
                  marginRight: 1,
                },
              }}
              style={{ marginTop: '4px' }}
            >
              種目を追加
            </Button>

            {/* メモセクション */}
            <Divider sx={{ my: 2 }} />
            <Box>
              <Stack spacing={1}>
                {memos.map((memo, index) => (
                  <Stack key={memo.key} direction="row" spacing={1} alignItems="flex-start">
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      maxRows={4}
                      size="small"
                      placeholder="メモを入力..."
                      value={memo.content}
                      onChange={(e) => handleMemoChange(index, e.target.value)}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveMemo(index)}
                      aria-label="メモを削除"
                      sx={{ mt: 0.5 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddMemo}
                  variant="text"
                  size="small"
                  sx={{
                    alignSelf: 'flex-start',
                    borderRadius: 0,
                  }}
                >
                  メモを追加
                </Button>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={isPending}>
            {isPending ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>削除の確認</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedDate.format('YYYY年M月D日')} の記録を全て削除しますか？
            <br />
            この操作は取り消せません。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={isPending}>
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
    </LocalizationProvider>
  )
}
