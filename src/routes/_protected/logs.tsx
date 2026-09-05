import { useTimer } from '@/components/timer/TimerContext'
import { client, type InferResponseType } from '@/lib/hono-client'
import type {
  ExerciseVolume,
  LatestExerciseSets,
  Timer,
  Training,
  TrainingMemo,
  TrainingSummary,
  YearMonth,
} from '@/server/domain/entities'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import TimerIcon from '@mui/icons-material/Timer'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  MenuItem,
  Paper,
  Popover,
  Select,
  type SelectChangeEvent,
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
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { createFileRoute } from '@tanstack/react-router'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/ja'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'

type TrainingRow = {
  id: string // date を含むユニークID
  date: string // YYYY-MM-DD
  exercises: ExerciseVolume[]
  volume: number // 総ボリューム
  memos: TrainingMemo[]
}

type LogListProps = {
  rows: TrainingRow[]
  onRowClick?: (date: string) => void
}

function LogList({ rows, onRowClick }: LogListProps) {
  return (
    <Stack spacing={1.5}>
      {rows.map((row) => (
        <Card
          key={row.id}
          variant="outlined"
          onClick={() => onRowClick?.(row.date)}
          sx={{
            cursor: onRowClick ? 'pointer' : 'default',
            '&:hover': onRowClick ? { bgcolor: 'action.hover' } : {},
          }}
        >
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            {/* ヘッダー: 日付 + 総ボリューム */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2" fontWeight={700}>
                {row.date}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {row.volume.toLocaleString()}kg
              </Typography>
            </Box>

            {/* 種目リスト */}
            <Stack spacing={0.5}>
              {row.exercises.map((exercise) => (
                <Box
                  key={exercise.exerciseId}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" color="text.secondary">
                    {exercise.exerciseName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {exercise.volume.toLocaleString()}kg
                  </Typography>
                </Box>
              ))}
            </Stack>

            {/* メモ */}
            {row.memos.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={0.5} divider={<Divider />}>
                  {row.memos.map((memo) => (
                    <Typography
                      key={memo.id}
                      variant="body2"
                      color="text.secondary"
                      sx={{ whiteSpace: 'pre-wrap' }}
                    >
                      {memo.content}
                    </Typography>
                  ))}
                </Stack>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}

/** 部位情報付き種目 */
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
type SetFormData = {
  key: string // unique key for React rendering
  id?: number
  exerciseId: number | null
  exerciseName: string
  weight: string
  reps: string
}

type ExerciseGroup = {
  key: string // unique key for React rendering
  exerciseId: number | null
  exerciseName: string
  sets: SetFormData[]
  latestSets: LatestExerciseSets | null
}

type LogInputModalProps = {
  open: boolean
  onClose: () => void
  onSaved: (savedDate: Date) => void
  initialDate: Date
  initialSets?: SetFormData[]
}

type MemoFormData = {
  key: string
  id?: number
  content: string
}

type BaselineState = {
  exerciseGroups: { exerciseId: number | null; sets: { weight: string; reps: string }[] }[]
  memos: { content: string }[]
  selectedDate: string
}

let groupKeyCounter = 0
let modalSetKeyCounter = 0
let memoKeyCounter = 0

const emptySet = (exerciseId: number | null, exerciseName: string): SetFormData => ({
  key: `set-${Date.now()}-${modalSetKeyCounter++}`,
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

function LogInputModal({ open, onClose, onSaved, initialDate, initialSets }: LogInputModalProps) {
  const [exerciseGroups, setExerciseGroups] = useState<ExerciseGroup[]>([emptyExerciseGroup()])
  const [exercises, setExercises] = useState<ExerciseWithBodyParts[]>([])
  const [memos, setMemos] = useState<MemoFormData[]>([])
  const [isPending, startTransition] = useTransition()
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs(initialDate))
  const [dateError, setDateError] = useState<string | null>(null)
  const today = dayjs()

  // タイマー関連の状態
  const [timerAnchorEl, setTimerAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [timers, setTimers] = useState<Timer[]>([])
  const [isLoadingTimers, setIsLoadingTimers] = useState(false)
  const { startTimer } = useTimer()

  // 変更検知用のベースライン状態
  const [baseline, setBaseline] = useState<BaselineState | null>(null)

  // 変更があるかどうかを判定
  const hasChanges = useMemo(() => {
    if (!baseline) return false

    // 日付の比較
    if (selectedDate.format('YYYY-MM-DD') !== baseline.selectedDate) {
      return true
    }

    // 種目グループの比較
    if (exerciseGroups.length !== baseline.exerciseGroups.length) {
      return true
    }
    for (let i = 0; i < exerciseGroups.length; i++) {
      const current = exerciseGroups[i]
      const base = baseline.exerciseGroups[i]
      if (current.exerciseId !== base.exerciseId) {
        return true
      }
      if (current.sets.length !== base.sets.length) {
        return true
      }
      for (let j = 0; j < current.sets.length; j++) {
        const currentSet = current.sets[j]
        const baseSet = base.sets[j]
        if (currentSet.weight !== baseSet.weight || currentSet.reps !== baseSet.reps) {
          return true
        }
      }
    }

    // メモの比較
    if (memos.length !== baseline.memos.length) {
      return true
    }
    for (let i = 0; i < memos.length; i++) {
      if (memos[i].content !== baseline.memos[i].content) {
        return true
      }
    }

    return false
  }, [baseline, exerciseGroups, memos, selectedDate])

  // 必須入力が満たされているかどうかを判定（少なくとも1つの種目が選択されている）
  const isRequiredFieldsFilled = useMemo(() => {
    return exerciseGroups.some((group) => group.exerciseId !== null)
  }, [exerciseGroups])

  const isTimerPopoverOpen = Boolean(timerAnchorEl)

  // モーダルが開いたときに日付を初期化
  useEffect(() => {
    if (open) {
      setSelectedDate(dayjs(initialDate))
    }
  }, [open, initialDate])

  // 種目リストを取得し、初期データを種目単位でグルーピング
  useEffect(() => {
    if (open) {
      setIsInitialLoading(true)
      const excludeDateStr = selectedDate.format('YYYY-MM-DD')

      const loadData = async () => {
        // 種目リストを取得（部位情報付き）
        const exercisesRes = await client.api.exercises['with-body-parts'].$get()
        const exercisesData = await exercisesRes.json()
        setExercises(exercisesData)

        // メモを取得
        const memosRes = await client.api.trainings[':date'].memos.$get({
          param: { date: excludeDateStr },
        })
        const fetchedMemos = await memosRes.json()
        let loadedMemos: MemoFormData[] = []
        if (fetchedMemos.length > 0) {
          loadedMemos = fetchedMemos.map((m) => ({
            key: `memo-${Date.now()}-${memoKeyCounter++}`,
            id: m.id,
            content: m.content,
          }))
          setMemos(loadedMemos)
        } else {
          setMemos([])
        }

        let loadedGroups: ExerciseGroup[] = []
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
          loadedGroups = groups
          // 種目IDがある場合は前回の記録を一括取得（当日分は除外）
          const exerciseIds = groups
            .map((g) => g.exerciseId)
            .filter((id): id is number => id !== null)
          if (exerciseIds.length > 0) {
            const latestSetsRes = await client.api.trainings.exercises[
              'latest-sets-multiple'
            ].$post({
              json: { exerciseIds, excludeDate: excludeDateStr },
            })
            const latestSetsMap = await latestSetsRes.json()
            for (const group of groups) {
              if (group.exerciseId && latestSetsMap[group.exerciseId]) {
                group.latestSets = latestSetsMap[group.exerciseId]
              }
            }
            setExerciseGroups([...groups])
            loadedGroups = [...groups]
          }
        } else {
          const initialGroup = emptyExerciseGroup()
          setExerciseGroups([initialGroup])
          loadedGroups = [initialGroup]
        }

        // ベースラインを設定
        setBaseline({
          exerciseGroups: loadedGroups.map((g) => ({
            exerciseId: g.exerciseId,
            sets: g.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
          })),
          memos: loadedMemos.map((m) => ({ content: m.content })),
          selectedDate: excludeDateStr,
        })

        setIsInitialLoading(false)
      }

      loadData()
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
      const res = await client.api.trainings.exercises[':exerciseId']['latest-sets'].$get({
        param: { exerciseId: String(exercise.id) },
        query: { excludeDate: excludeDateStr },
      })
      const latestSets = await res.json()
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

  // タイマー操作
  const handleOpenTimerPopover = async (event: React.MouseEvent<HTMLButtonElement>) => {
    setTimerAnchorEl(event.currentTarget)
    setIsLoadingTimers(true)
    try {
      const res = await client.api.timers.$get()
      const loadedTimers = await res.json()
      setTimers(loadedTimers)
    } catch (error) {
      console.error('Failed to load timers:', error)
    } finally {
      setIsLoadingTimers(false)
    }
  }

  const handleCloseTimerPopover = () => {
    setTimerAnchorEl(null)
  }

  const handleSelectTimer = (timer: Timer) => {
    startTimer(timer)
    handleCloseTimerPopover()
  }

  // 時間をフォーマット（秒 → mm:ss）
  const formatTimerDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // タイマーの総時間を計算
  const getTotalTimerDuration = (timer: Timer): number => {
    return timer.unitTimers.reduce((sum, unit) => sum + unit.duration, 0)
  }

  const handleSave = () => {
    startTransition(async () => {
      // エラーをクリア
      setDateError(null)

      // 全グループから有効なセットを収集
      const allSets: SetFormData[] = []
      for (const group of exerciseGroups) {
        // バリデーション: 種目IDが選択されているセットのみ（重量・回数は空でも可）
        const validSets = group.sets.filter((s) => group.exerciseId)
        allSets.push(...validSets)
      }

      if (allSets.length === 0) {
        return
      }

      const dateStr = selectedDate.format('YYYY-MM-DD')
      const initialDateStr = dayjs(initialDate).format('YYYY-MM-DD')

      // 日付が変更された場合、変更先に既存データがないかチェック
      if (dateStr !== initialDateStr) {
        const existsRes = await client.api.trainings[':date'].exists.$get({
          param: { date: dateStr },
        })
        const { exists } = await existsRes.json()
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
          weight: s.weight === '' ? 0 : Number.parseFloat(s.weight),
          reps: s.reps === '' ? 0 : Number.parseInt(s.reps, 10),
          sortIndex: index,
        }
      })

      await client.api.trainings[':date'].$put({
        param: { date: dateStr },
        json: { sets: setsToSave },
      })

      // メモを保存（空でないメモのみ）
      const validMemos = memos.filter((m) => m.content.trim() !== '')
      await client.api.trainings[':date'].memos.$put({
        param: { date: dateStr },
        json: { memos: validMemos.map((m) => ({ id: m.id, content: m.content })) },
      })

      // 保存後にベースラインを更新
      setBaseline({
        exerciseGroups: exerciseGroups.map((g) => ({
          exerciseId: g.exerciseId,
          sets: g.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
        })),
        memos: memos.map((m) => ({ content: m.content })),
        selectedDate: dateStr,
      })

      onSaved(selectedDate.toDate())
    })
  }

  const handleDelete = () => {
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = () => {
    startTransition(async () => {
      const dateStr = selectedDate.format('YYYY-MM-DD')
      await client.api.trainings[':date'].$delete({
        param: { date: dateStr },
      })
      setDeleteConfirmOpen(false)
      onSaved(selectedDate.toDate())
      onClose()
    })
  }

  // スケルトンローディング表示
  const renderExerciseGroupSkeleton = () => (
    <Paper variant="outlined" sx={{ p: 2 }} style={{ marginTop: '12px' }}>
      <Stack spacing={2}>
        {/* 種目選択スケルトン */}
        <Skeleton variant="rounded" height={40} />
        {/* 前回日付スケルトン */}
        <Skeleton variant="text" width={120} height={20} sx={{ mt: 1 }} />
        {/* テーブルスケルトン */}
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
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell sx={{ p: 1 }}>
                    <Stack spacing={0.5}>
                      <Skeleton variant="text" width="100%" height={24} />
                      <Skeleton variant="text" width={40} height={16} sx={{ ml: 'auto' }} />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ p: 1 }}>
                    <Stack spacing={0.5}>
                      <Skeleton variant="text" width="100%" height={24} />
                      <Skeleton variant="text" width={30} height={16} sx={{ ml: 'auto' }} />
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ p: 1 }}>
                    <Stack spacing={0.5} alignItems="flex-end">
                      <Skeleton variant="text" width={60} height={24} />
                      <Skeleton variant="text" width={40} height={16} />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ p: 1 }}>
                    <Skeleton variant="circular" width={28} height={28} />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2} align="right">
                  <Typography variant="subtitle2">合計</Typography>
                </TableCell>
                <TableCell align="right">
                  <Skeleton variant="text" width={60} height={24} sx={{ ml: 'auto' }} />
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        {/* セット追加ボタンスケルトン */}
        <Skeleton variant="text" width={100} height={24} sx={{ mx: 'auto' }} />
      </Stack>
    </Paper>
  )

  // 既存データがあるかどうかを判定（initialSetsが存在し、かつidが設定されているセットがある場合）
  const hasExistingData = initialSets?.some((set) => set.id !== undefined) ?? false

  // 種目が0件の場合の判定
  const hasNoExercises = exercises.length === 0

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
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
            <Stack direction="row" spacing={0.5}>
              <IconButton
                onClick={handleOpenTimerPopover}
                disabled={isPending}
                aria-label="タイマーを選択"
                color="primary"
              >
                <TimerIcon />
              </IconButton>
              {hasExistingData && (
                <IconButton
                  onClick={handleDelete}
                  disabled={isPending}
                  aria-label="トレーニングを削除"
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Stack>
          </Box>
        </DialogTitle>

        {/* タイマー選択ポップオーバー */}
        <Popover
          open={isTimerPopoverOpen}
          anchorEl={timerAnchorEl}
          onClose={handleCloseTimerPopover}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <Box sx={{ width: 280, maxHeight: 300, overflow: 'auto' }}>
            {isLoadingTimers ? (
              <Box sx={{ p: 2 }}>
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="70%" />
              </Box>
            ) : timers.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  タイマーが登録されていません
                </Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {timers.map((timer) => (
                  <ListItemButton key={timer.id} onClick={() => handleSelectTimer(timer)}>
                    <ListItemText
                      primary={timer.name}
                      secondary={`${formatTimerDuration(getTotalTimerDuration(timer))} / ${timer.unitTimers.length}個のユニット`}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Popover>
        <DialogContent dividers>
          <Stack spacing={3}>
            {dateError && (
              <Alert severity="error" onClose={() => setDateError(null)}>
                {dateError}
              </Alert>
            )}
            {isInitialLoading ? (
              <>
                {renderExerciseGroupSkeleton()}
                <Skeleton variant="text" width={100} height={24} sx={{ mx: 'auto' }} />
                <Divider sx={{ my: 2 }} />
                <Skeleton variant="text" width={100} height={24} />
              </>
            ) : (
              <>
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
                              {/* カテゴリ順に種目をグループ化して表示 */}
                              {(() => {
                                const grouped: Record<string, ExerciseWithBodyParts[]> = {}
                                for (const category of categoryOrder) {
                                  grouped[category] = []
                                }
                                grouped.UNCATEGORIZED = []

                                for (const exercise of exercises) {
                                  const category = exercise.primaryCategory || 'UNCATEGORIZED'
                                  if (!grouped[category]) {
                                    grouped[category] = []
                                  }
                                  grouped[category].push(exercise)
                                }

                                const items: React.ReactNode[] = []
                                for (const category of [...categoryOrder, 'UNCATEGORIZED']) {
                                  const categoryExercises = grouped[category]
                                  if (categoryExercises.length > 0) {
                                    const label =
                                      category === 'UNCATEGORIZED'
                                        ? '未分類'
                                        : categoryLabels[category] || category
                                    items.push(
                                      <ListSubheader key={`header-${category}`} sx={{ lineHeight: '32px' }}>
                                        {label}
                                      </ListSubheader>,
                                    )
                                    for (const exercise of categoryExercises) {
                                      items.push(
                                        <MenuItem
                                          key={exercise.id}
                                          value={exercise.id.toString()}
                                          sx={{ pl: 3 }}
                                        >
                                          {exercise.name}
                                        </MenuItem>,
                                      )
                                    }
                                  }
                                }
                                return items
                              })()}
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
                              前回：{dayjs(group.latestSets.date).format('YYYY年M月D日')}
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
                                          inputProps={{ min: 0, step: 0.5, placeholder: '0' }}
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
                                          inputProps={{ min: 0, step: 1, placeholder: '0' }}
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
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={isPending || isInitialLoading}>
            閉じる
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isPending || isInitialLoading || !hasChanges || !isRequiredFieldsFilled}
          >
            {isPending ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={(_event, reason) => {
          if (reason === 'backdropClick') return
          setDeleteConfirmOpen(false)
        }}
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

function yearMonthToKey(ym: YearMonth): string {
  return `${ym.year}-${ym.month}`
}

function formatYearMonthLabel(ym: YearMonth): string {
  return `${ym.year}年${ym.month}月`
}

function summaryToRow(summary: TrainingSummary): TrainingRow {
  return {
    id: summary.date,
    date: summary.date,
    exercises: summary.exercises,
    volume: summary.totalVolume,
    memos: summary.memos,
  }
}

let setKeyCounter = 0
function trainingToSetFormData(training: Training | null): SetFormData[] {
  if (!training || training.sets.length === 0) {
    return []
  }
  return training.sets
    .sort((a, b) => a.sortIndex - b.sortIndex)
    .map((set) => ({
      key: `set-${Date.now()}-${setKeyCounter++}`,
      id: set.id,
      exerciseId: set.exerciseId,
      exerciseName: set.exercise?.name || '',
      weight: set.weight === 0 ? '' : set.weight.toString(),
      reps: set.reps === 0 ? '' : set.reps.toString(),
    }))
}

/**
 * ログページ本体（純粋UI層。Hono クライアントは
 * 型のみ `@/server/api/hono-app` を参照する `@/lib/hono-client` 経由、
 * タイマーは `@/components/timer/TimerContext` 経由）。
 */
function LogsPage() {
  const [availableYearMonths, setAvailableYearMonths] = useState<YearMonth[]>([])
  const [selectedYearMonth, setSelectedYearMonth] = useState<YearMonth | null>(null)
  const [rows, setRows] = useState<TrainingRow[]>([])
  const [isLoading, startLoading] = useTransition()
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [initialSets, setInitialSets] = useState<SetFormData[] | undefined>(undefined)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  // 初回ロード: 年月一覧を取得
  useEffect(() => {
    const loadYearMonths = async () => {
      const res = await client.api.trainings['year-months'].$get()
      const yearMonths = await res.json()
      setAvailableYearMonths(yearMonths)
      // 最新の年月を選択（降順なので先頭）
      if (yearMonths.length > 0) {
        setSelectedYearMonth(yearMonths[0])
      }
      setIsInitialLoading(false)
    }
    loadYearMonths()
  }, [])

  // 選択された年月のデータを取得
  const loadData = useCallback(() => {
    if (!selectedYearMonth) return
    startLoading(async () => {
      const res = await client.api.trainings.$get({
        query: {
          year: String(selectedYearMonth.year),
          month: String(selectedYearMonth.month),
        },
      })
      const summaries = await res.json()
      setRows(summaries.map(summaryToRow))
    })
  }, [selectedYearMonth])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 年月選択変更
  const handleYearMonthChange = (event: SelectChangeEvent) => {
    const [year, month] = event.target.value.split('-').map(Number)
    setSelectedYearMonth({ year, month })
  }

  // 新規追加ボタン
  const handleAddClick = async () => {
    const today = new Date()
    setSelectedDate(today)
    const dateStr = today.toISOString().split('T')[0]
    const res = await client.api.trainings[':date'].$get({
      param: { date: dateStr },
    })
    const training = await res.json()
    // 当日のデータが存在する場合は詳細モーダルを表示、存在しない場合は新規作成
    if (training && training.sets.length > 0) {
      setInitialSets(trainingToSetFormData(training))
    } else {
      setInitialSets(undefined)
    }
    setModalOpen(true)
  }

  // 行クリックで編集
  const handleRowClick = async (dateStr: string) => {
    const date = new Date(dateStr)
    setSelectedDate(date)
    const res = await client.api.trainings[':date'].$get({
      param: { date: dateStr },
    })
    const training = await res.json()
    setInitialSets(trainingToSetFormData(training))
    setModalOpen(true)
  }

  // 保存完了時（年月一覧を更新し、保存された月を選択）
  const handleSaved = async (savedDate: Date) => {
    const savedYear = savedDate.getFullYear()
    const savedMonth = savedDate.getMonth() + 1

    // 年月一覧を再取得
    const res = await client.api.trainings['year-months'].$get()
    const yearMonths = await res.json()
    setAvailableYearMonths(yearMonths)

    // 保存された年月を選択
    const savedYearMonth = yearMonths.find((ym) => ym.year === savedYear && ym.month === savedMonth)
    if (savedYearMonth) {
      setSelectedYearMonth(savedYearMonth)
    }

    setSnackbar({
      open: true,
      message: '保存しました',
      severity: 'success',
    })
  }

  // スケルトンローディング表示
  const renderSkeleton = () => (
    <Stack spacing={1.5}>
      {[1, 2, 3].map((i) => (
        <Card key={i} variant="outlined">
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            {/* ヘッダー */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Skeleton variant="text" width={90} height={24} />
              <Skeleton variant="text" width={70} height={20} />
            </Box>
            {/* 種目リスト */}
            <Stack spacing={0.5}>
              {[1, 2, 3].map((j) => (
                <Box key={j} display="flex" justifyContent="space-between" alignItems="center">
                  <Skeleton variant="text" width={100 + j * 20} height={20} />
                  <Skeleton variant="text" width={50} height={20} />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )

  // 初期ロード中
  if (isInitialLoading) {
    return (
      <Stack spacing={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
          <Skeleton variant="rounded" width={140} height={40} />
          <Skeleton variant="rounded" width={44} height={44} />
        </Box>
        {renderSkeleton()}
      </Stack>
    )
  }

  return (
    <Stack spacing={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
        {availableYearMonths.length > 0 && selectedYearMonth ? (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={yearMonthToKey(selectedYearMonth)}
              onChange={handleYearMonthChange}
              sx={{ fontWeight: 700 }}
            >
              {availableYearMonths.map((ym) => (
                <MenuItem key={yearMonthToKey(ym)} value={yearMonthToKey(ym)}>
                  {formatYearMonthLabel(ym)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Typography variant="subtitle1" color="text.secondary">
            データがありません
          </Typography>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddClick}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <AddIcon fontSize="medium" />
        </Button>
      </Box>

      {isLoading ? (
        renderSkeleton()
      ) : rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">この月のトレーニング記録はありません</Typography>
        </Paper>
      ) : (
        <LogList rows={rows} onRowClick={handleRowClick} />
      )}

      <LogInputModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setInitialSets(undefined)
        }}
        onSaved={handleSaved}
        initialDate={selectedDate}
        initialSets={initialSets}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  )
}

/** Start 側 `/logs`（`_protected` layout 配下。URL は `/logs` のまま）。 */
export const Route = createFileRoute('/_protected/logs')({
  component: LogsPage,
})
