'use client'

import type { Exercise, LatestExerciseSets } from '@/server/domain/entities'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
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
import { Fragment, useEffect, useState, useTransition } from 'react'
import {
  createExerciseAction,
  deleteTrainingAction,
  fetchLatestExerciseSetsAction,
  getExercisesAction,
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
  onSaved: () => void
  date: Date
  initialSets?: SetFormData[]
}

let groupKeyCounter = 0
let setKeyCounter = 0

const emptySet = (exerciseId: number | null, exerciseName: string): SetFormData => ({
  key: `set-${Date.now()}-${setKeyCounter++}`,
  exerciseId,
  exerciseName,
  weight: '',
  reps: '',
})

const emptyExerciseGroup = (): ExerciseGroup => ({
  key: `group-${Date.now()}-${groupKeyCounter++}`,
  exerciseId: null,
  exerciseName: '',
  sets: [emptySet(null, '')],
  latestSets: null,
})

export default function LogInputModal({ open, onClose, onSaved, date, initialSets }: Props) {
  const [exerciseGroups, setExerciseGroups] = useState<ExerciseGroup[]>([emptyExerciseGroup()])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isPending, startTransition] = useTransition()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // 種目リストを取得し、初期データを種目単位でグルーピング
  useEffect(() => {
    if (open) {
      getExercisesAction().then(setExercises)
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
          grouped.get(groupKey)!.sets.push(set)
        }
        const groups = Array.from(grouped.values())
        setExerciseGroups(groups)
        // 種目IDがある場合は前回の記録を取得
        Promise.all(
          groups.map(async (group) => {
            if (group.exerciseId) {
              const latestSets = await fetchLatestExerciseSetsAction(group.exerciseId)
              group.latestSets = latestSets
            }
          }),
        ).then(() => {
          setExerciseGroups([...groups])
        })
      } else {
        setExerciseGroups([emptyExerciseGroup()])
      }
    }
  }, [open, initialSets])

  // 種目変更時に前回値を取得
  const handleExerciseChange = async (
    groupIndex: number,
    exercise: Exercise | null,
    inputValue: string,
  ) => {
    const newGroups = [...exerciseGroups]
    const group = newGroups[groupIndex]
    if (exercise) {
      group.exerciseId = exercise.id
      group.exerciseName = exercise.name
      // グループ内の全セットの種目を更新
      group.sets = group.sets.map((set) => ({
        ...set,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
      }))
      // 前回値を取得
      if (!group.latestSets) {
        const latestSets = await fetchLatestExerciseSetsAction(exercise.id)
        group.latestSets = latestSets
      }
    } else {
      group.exerciseId = null
      group.exerciseName = inputValue
      // グループ内の全セットの種目を更新
      group.sets = group.sets.map((set) => ({
        ...set,
        exerciseId: null,
        exerciseName: inputValue,
      }))
      group.latestSets = null
    }
    setExerciseGroups(newGroups)
  }

  // 新規種目を作成
  const handleCreateExercise = async (name: string): Promise<Exercise> => {
    const newExercise = await createExerciseAction(name)
    setExercises((prev) => [...prev, newExercise].sort((a, b) => a.name.localeCompare(b.name)))
    return newExercise
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

  const handleSave = () => {
    startTransition(async () => {
      // 全グループから有効なセットを収集
      const allSets: SetFormData[] = []
      for (const group of exerciseGroups) {
        // バリデーション: 種目（既存または新規）と重量・回数が入力されているセットのみ
        const validSets = group.sets.filter(
          (s) => (group.exerciseId || group.exerciseName.trim()) && s.weight && s.reps,
        )
        allSets.push(...validSets)
      }

      if (allSets.length === 0) {
        return
      }

      // 新規種目がある場合は先に作成
      const setsToSave = await Promise.all(
        allSets.map(async (s, index) => {
          const group = exerciseGroups.find((g) => g.sets.includes(s))
          if (!group) {
            throw new Error('Group not found')
          }
          let exerciseId = group.exerciseId
          if (!exerciseId && group.exerciseName.trim()) {
            const newExercise = await handleCreateExercise(group.exerciseName.trim())
            exerciseId = newExercise.id
          }
          if (!exerciseId) {
            throw new Error('Exercise ID is required')
          }
          return {
            id: s.id,
            exerciseId,
            weight: Number.parseFloat(s.weight),
            reps: Number.parseInt(s.reps, 10),
            sortIndex: index,
          }
        }),
      )

      const dateStr = date.toISOString().split('T')[0]
      await upsertTrainingAction(dateStr, setsToSave)
      onSaved()
      onClose()
    })
  }

  const handleDelete = () => {
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = () => {
    startTransition(async () => {
      const dateStr = date.toISOString().split('T')[0]
      await deleteTrainingAction(dateStr)
      setDeleteConfirmOpen(false)
      onSaved()
      onClose()
    })
  }

  // 既存データがあるかどうかを判定（initialSetsが存在し、かつidが設定されているセットがある場合）
  const hasExistingData = initialSets && initialSets.some((set) => set.id !== undefined)

  const dateStr = date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
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
            <Typography variant="h6" component="span">
              {dateStr} のトレーニング
            </Typography>
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
            {exerciseGroups.map((group, groupIndex) => {
              const totalVolume = group.sets.reduce((sum, set) => {
                const weight = Number.parseFloat(set.weight) || 0
                const reps = Number.parseInt(set.reps, 10) || 0
                return sum + weight * reps
              }, 0)

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
                    <Box sx={{ position: 'relative' }}>
                      <Autocomplete
                        freeSolo
                        options={exercises}
                        getOptionLabel={(option) =>
                          typeof option === 'string' ? option : option.name
                        }
                        value={exercises.find((e) => e.id === group.exerciseId) || null}
                        inputValue={group.exerciseName}
                        onInputChange={(_, value) => handleExerciseChange(groupIndex, null, value)}
                        onChange={(_, newValue) => {
                          if (typeof newValue === 'string') {
                            handleExerciseChange(groupIndex, null, newValue)
                          } else {
                            handleExerciseChange(groupIndex, newValue, newValue?.name || '')
                          }
                        }}
                        fullWidth
                        slotProps={{
                          paper: {
                            sx: {
                              borderRadius: 0,
                              borderTopLeftRadius: 0,
                              borderTopRightRadius: 0,
                              borderBottomRightRadius: 0,
                              borderBottomLeftRadius: 0,
                            },
                          },
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="種目"
                            size="small"
                            placeholder="種目を選択または入力"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 0,
                                borderTopLeftRadius: 0,
                                borderTopRightRadius: 0,
                                borderBottomRightRadius: 0,
                                borderBottomLeftRadius: 0,
                              },
                            }}
                          />
                        )}
                      />
                      {exerciseGroups.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveExerciseGroup(groupIndex)}
                          aria-label="種目を削除"
                          sx={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                    {group.latestSets && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          前回 ({group.latestSets.date.toLocaleDateString('ja-JP')}):{' '}
                          {group.latestSets.sets
                            .map((s) => `${s.weight}kg × ${s.reps}回`)
                            .join(', ')}
                        </Typography>
                      </Box>
                    )}

                    <TableContainer>
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
                            <TableCell width={60}></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {group.sets.map((set, setIndex) => {
                            const weight = Number.parseFloat(set.weight) || 0
                            const reps = Number.parseInt(set.reps, 10) || 0
                            const volume = weight * reps
                            return (
                              <TableRow key={set.key}>
                                <TableCell sx={{ p: 0 }}>
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
                                </TableCell>
                                <TableCell sx={{ p: 0 }}>
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={set.reps}
                                    onChange={(e) =>
                                      handleSetChange(groupIndex, setIndex, 'reps', e.target.value)
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
                                </TableCell>
                                <TableCell align="right">
                                  {volume > 0 ? volume.toLocaleString() : '-'}
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
                              <Typography variant="subtitle2">
                                {totalVolume > 0 ? totalVolume.toLocaleString() : '-'}
                              </Typography>
                            </TableCell>
                            <TableCell></TableCell>
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
            {dateStr} のトレーニング記録を全て削除しますか？
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
    </>
  )
}
