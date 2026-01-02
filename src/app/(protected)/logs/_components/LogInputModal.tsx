'use client'

import type { Exercise } from '@/server/domain/entities'
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
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState, useTransition } from 'react'
import {
  createExerciseAction,
  fetchExerciseHistoryAction,
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

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  date: Date
  initialSets?: SetFormData[]
}

let setKeyCounter = 0
const emptySet = (): SetFormData => ({
  key: `set-${Date.now()}-${setKeyCounter++}`,
  exerciseId: null,
  exerciseName: '',
  weight: '',
  reps: '',
})

export default function LogInputModal({ open, onClose, onSaved, date, initialSets }: Props) {
  const [sets, setSets] = useState<SetFormData[]>([emptySet()])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isPending, startTransition] = useTransition()
  const [previousValues, setPreviousValues] = useState<
    Record<number, { weight: number; reps: number }>
  >({})

  // 種目リストを取得
  useEffect(() => {
    if (open) {
      getExercisesAction().then(setExercises)
      if (initialSets && initialSets.length > 0) {
        setSets(initialSets)
      } else {
        setSets([emptySet()])
      }
      setPreviousValues({})
    }
  }, [open, initialSets])

  // 種目変更時に前回値を取得
  const handleExerciseChange = async (
    index: number,
    exercise: Exercise | null,
    inputValue: string,
  ) => {
    const newSets = [...sets]
    if (exercise) {
      newSets[index] = {
        ...newSets[index],
        exerciseId: exercise.id,
        exerciseName: exercise.name,
      }
      // 前回値を取得
      if (!previousValues[exercise.id]) {
        const history = await fetchExerciseHistoryAction(exercise.id)
        if (history) {
          setPreviousValues((prev) => ({
            ...prev,
            [exercise.id]: history,
          }))
        }
      }
    } else {
      newSets[index] = {
        ...newSets[index],
        exerciseId: null,
        exerciseName: inputValue,
      }
    }
    setSets(newSets)
  }

  // 新規種目を作成
  const handleCreateExercise = async (name: string): Promise<Exercise> => {
    const newExercise = await createExerciseAction(name)
    setExercises((prev) => [...prev, newExercise].sort((a, b) => a.name.localeCompare(b.name)))
    return newExercise
  }

  const handleSetChange = (index: number, field: 'weight' | 'reps', value: string) => {
    const newSets = [...sets]
    newSets[index] = { ...newSets[index], [field]: value }
    setSets(newSets)
  }

  const handleAddSet = () => {
    setSets([...sets, emptySet()])
  }

  const handleRemoveSet = (index: number) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index))
    }
  }

  const handleSave = () => {
    startTransition(async () => {
      // バリデーション: 種目（既存または新規）と重量・回数が入力されているセットのみ
      const validSets = sets.filter(
        (s) => (s.exerciseId || s.exerciseName.trim()) && s.weight && s.reps,
      )

      if (validSets.length === 0) {
        return
      }

      // 新規種目がある場合は先に作成
      const setsToSave = await Promise.all(
        validSets.map(async (s, index) => {
          let exerciseId = s.exerciseId
          if (!exerciseId && s.exerciseName.trim()) {
            const newExercise = await handleCreateExercise(s.exerciseName.trim())
            exerciseId = newExercise.id
          }
          // validSets は exerciseId がある場合のみフィルタされているので、この時点で exerciseId は必ず存在する
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

  const dateStr = date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: { m: 1, width: 'calc(100% - 16px)', maxHeight: 'calc(100% - 16px)' },
      }}
    >
      <DialogTitle>{dateStr} のトレーニング</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {sets.map((set, index) => {
            const prevValue = set.exerciseId ? previousValues[set.exerciseId] : null
            return (
              <Box
                key={set.key}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" color="text.secondary">
                      セット {index + 1}
                    </Typography>
                    {sets.length > 1 && (
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveSet(index)}
                        aria-label="セットを削除"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>

                  <Autocomplete
                    freeSolo
                    options={exercises}
                    getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
                    value={exercises.find((e) => e.id === set.exerciseId) || null}
                    inputValue={set.exerciseName}
                    onInputChange={(_, value) => handleExerciseChange(index, null, value)}
                    onChange={(_, newValue) => {
                      if (typeof newValue === 'string') {
                        handleExerciseChange(index, null, newValue)
                      } else {
                        handleExerciseChange(index, newValue, newValue?.name || '')
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="種目"
                        size="small"
                        placeholder="種目を選択または入力"
                      />
                    )}
                  />

                  {prevValue && (
                    <Typography variant="caption" color="text.secondary">
                      前回: {prevValue.weight}kg × {prevValue.reps}回
                    </Typography>
                  )}

                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="重量 (kg)"
                      type="number"
                      size="small"
                      value={set.weight}
                      onChange={(e) => handleSetChange(index, 'weight', e.target.value)}
                      inputProps={{ min: 0, step: 0.5 }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="回数"
                      type="number"
                      size="small"
                      value={set.reps}
                      onChange={(e) => handleSetChange(index, 'reps', e.target.value)}
                      inputProps={{ min: 0, step: 1 }}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                </Stack>
              </Box>
            )
          })}

          <Button startIcon={<AddIcon />} onClick={handleAddSet} variant="outlined" fullWidth>
            セットを追加
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
  )
}
