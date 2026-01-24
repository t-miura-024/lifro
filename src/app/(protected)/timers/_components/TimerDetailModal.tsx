'use client'

import { client } from '@/app/_lib/hono/client'
import {
  DEFAULT_COUNT_SOUND,
  DEFAULT_COUNT_SOUND_LAST_3_SEC,
  DEFAULT_END_SOUND,
  SOUND_NONE,
  type SoundFile,
} from '@/constants/sounds'
import type { Timer, UnitTimerInput } from '@/server/domain/entities'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import {
  Box,
  Button,
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
  type SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState, useTransition } from 'react'

type UnitTimerFormData = {
  key: string
  id?: number
  name: string
  minutes: string
  seconds: string
  countSound: string
  countSoundLast3Sec: string
  endSound: string
}

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  timer: Timer | null
}

let unitKeyCounter = 0

// 分と秒の選択肢
const MINUTES_OPTIONS = Array.from({ length: 100 }, (_, i) => ({
  value: String(i),
  label: String(i),
}))
const SECONDS_OPTIONS = Array.from({ length: 60 }, (_, i) => ({
  value: String(i),
  label: String(i),
}))

function createEmptyUnit(): UnitTimerFormData {
  return {
    key: `unit-${Date.now()}-${unitKeyCounter++}`,
    name: '',
    minutes: '1',
    seconds: '0',
    countSound: DEFAULT_COUNT_SOUND || SOUND_NONE,
    countSoundLast3Sec: DEFAULT_COUNT_SOUND_LAST_3_SEC || SOUND_NONE,
    endSound: DEFAULT_END_SOUND || SOUND_NONE,
  }
}

function timerToFormData(timer: Timer): UnitTimerFormData[] {
  return timer.unitTimers.map((unit) => {
    const minutes = Math.floor(unit.duration / 60)
    const seconds = unit.duration % 60
    return {
      key: `unit-${Date.now()}-${unitKeyCounter++}`,
      id: unit.id,
      name: unit.name || '',
      minutes: minutes.toString(),
      seconds: seconds.toString(),
      countSound: unit.countSound || SOUND_NONE,
      countSoundLast3Sec: unit.countSoundLast3Sec || SOUND_NONE,
      endSound: unit.endSound || SOUND_NONE,
    }
  })
}

function formDataToUnitTimerInput(data: UnitTimerFormData): UnitTimerInput {
  const minutes = Number.parseInt(data.minutes, 10) || 0
  const seconds = Number.parseInt(data.seconds, 10) || 0
  const trimmedName = data.name.trim()
  return {
    id: data.id,
    name: trimmedName || undefined,
    sortIndex: 0, // Will be set later
    duration: minutes * 60 + seconds,
    countSound: data.countSound === SOUND_NONE ? null : data.countSound,
    countSoundLast3Sec: data.countSoundLast3Sec === SOUND_NONE ? null : data.countSoundLast3Sec,
    endSound: data.endSound === SOUND_NONE ? null : data.endSound,
  }
}

export default function TimerDetailModal({ open, onClose, onSaved, timer }: Props) {
  const [name, setName] = useState('')
  const [unitTimers, setUnitTimers] = useState<UnitTimerFormData[]>([createEmptyUnit()])
  const [isPending, startTransition] = useTransition()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [soundFiles, setSoundFiles] = useState<SoundFile[]>([])

  const isEditMode = timer !== null

  // 音声ファイル一覧を取得
  useEffect(() => {
    if (open) {
      client.api.timers.sounds.$get().then(async (res) => {
        const data = await res.json()
        setSoundFiles(data)
      })
    }
  }, [open])

  // モーダルが開いたときに初期化
  useEffect(() => {
    if (open) {
      if (timer) {
        setName(timer.name)
        setUnitTimers(timerToFormData(timer))
      } else {
        setName('')
        setUnitTimers([createEmptyUnit()])
      }
    }
  }, [open, timer])

  // ユニットタイマーの値を変更
  const handleUnitChange = (index: number, field: keyof UnitTimerFormData, value: string) => {
    const newUnits = [...unitTimers]
    newUnits[index] = { ...newUnits[index], [field]: value }
    setUnitTimers(newUnits)
  }

  // ユニットタイマーを追加
  const handleAddUnit = () => {
    setUnitTimers([...unitTimers, createEmptyUnit()])
  }

  // ユニットタイマーを削除
  const handleRemoveUnit = (index: number) => {
    if (unitTimers.length > 1) {
      setUnitTimers(unitTimers.filter((_, i) => i !== index))
    }
  }

  // 保存
  const handleSave = () => {
    if (!name.trim()) return
    if (unitTimers.length === 0) return

    // バリデーション: 全てのユニットタイマーの時間が1秒以上か
    const invalidUnits = unitTimers.filter((unit) => {
      const minutes = Number.parseInt(unit.minutes, 10) || 0
      const seconds = Number.parseInt(unit.seconds, 10) || 0
      return minutes * 60 + seconds < 1
    })
    if (invalidUnits.length > 0) return

    const unitTimerInputs = unitTimers.map((unit, index) => ({
      ...formDataToUnitTimerInput(unit),
      sortIndex: index,
    }))

    startTransition(async () => {
      if (isEditMode && timer) {
        await client.api.timers[':id'].$put({
          param: { id: String(timer.id) },
          json: {
            name: name.trim(),
            sortIndex: timer.sortIndex,
            unitTimers: unitTimerInputs,
          },
        })
      } else {
        await client.api.timers.$post({
          json: {
            name: name.trim(),
            sortIndex: 0,
            unitTimers: unitTimerInputs,
          },
        })
      }
      onSaved()
    })
  }

  // 削除
  const handleDelete = () => {
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!timer) return

    startTransition(async () => {
      await client.api.timers[':id'].$delete({
        param: { id: String(timer.id) },
      })
      setDeleteConfirmOpen(false)
      onSaved()
    })
  }

  // 時間のバリデーション
  const isValidTime = (unit: UnitTimerFormData): boolean => {
    const minutes = Number.parseInt(unit.minutes, 10) || 0
    const seconds = Number.parseInt(unit.seconds, 10) || 0
    return minutes * 60 + seconds >= 1
  }

  // フォーム全体のバリデーション
  const isFormValid = name.trim() !== '' && unitTimers.every(isValidTime)

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
            <Typography variant="h6">{isEditMode ? 'タイマーを編集' : 'タイマーを作成'}</Typography>
            {isEditMode && (
              <IconButton onClick={handleDelete} disabled={isPending} aria-label="タイマーを削除">
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            {/* タイマー名 */}
            <TextField
              label="タイマー名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
            />

            {/* ユニットタイマー一覧 */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                ユニットタイマー
              </Typography>
              <Stack spacing={2}>
                {unitTimers.map((unit, index) => (
                  <Paper key={unit.key} variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      {/* ヘッダー */}
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <IconButton
                          size="small"
                          sx={{ cursor: 'grab', touchAction: 'none' }}
                          aria-label="ドラッグして並び替え"
                          disabled
                        >
                          <DragIndicatorIcon fontSize="small" />
                        </IconButton>
                        <TextField
                          size="small"
                          placeholder="名前なし"
                          value={unit.name}
                          onChange={(e) => handleUnitChange(index, 'name', e.target.value)}
                          sx={{ flex: 1 }}
                        />
                        {unitTimers.length > 1 && (
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveUnit(index)}
                            aria-label="ユニットタイマーを削除"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>

                      {/* 時間入力 */}
                      <Stack direction="row" spacing={1} alignItems="center">
                        <FormControl size="small" sx={{ width: 80 }} error={!isValidTime(unit)}>
                          <InputLabel>分</InputLabel>
                          <Select
                            value={unit.minutes}
                            label="分"
                            onChange={(e: SelectChangeEvent) =>
                              handleUnitChange(index, 'minutes', e.target.value)
                            }
                          >
                            {MINUTES_OPTIONS.map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Typography>:</Typography>
                        <FormControl size="small" sx={{ width: 80 }} error={!isValidTime(unit)}>
                          <InputLabel>秒</InputLabel>
                          <Select
                            value={unit.seconds}
                            label="秒"
                            onChange={(e: SelectChangeEvent) =>
                              handleUnitChange(index, 'seconds', e.target.value)
                            }
                          >
                            {SECONDS_OPTIONS.map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Stack>

                      {/* 音声設定 */}
                      <Stack spacing={1.5}>
                        <FormControl size="small" fullWidth>
                          <InputLabel>カウント音</InputLabel>
                          <Select
                            value={unit.countSound}
                            label="カウント音"
                            onChange={(e: SelectChangeEvent) =>
                              handleUnitChange(index, 'countSound', e.target.value)
                            }
                          >
                            <MenuItem value={SOUND_NONE}>なし</MenuItem>
                            {soundFiles.map((file) => (
                              <MenuItem key={file.filename} value={file.filename}>
                                {file.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl size="small" fullWidth>
                          <InputLabel>終了3秒前の音</InputLabel>
                          <Select
                            value={unit.countSoundLast3Sec}
                            label="終了3秒前の音"
                            onChange={(e: SelectChangeEvent) =>
                              handleUnitChange(index, 'countSoundLast3Sec', e.target.value)
                            }
                          >
                            <MenuItem value={SOUND_NONE}>なし</MenuItem>
                            {soundFiles.map((file) => (
                              <MenuItem key={file.filename} value={file.filename}>
                                {file.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl size="small" fullWidth>
                          <InputLabel>終了音</InputLabel>
                          <Select
                            value={unit.endSound}
                            label="終了音"
                            onChange={(e: SelectChangeEvent) =>
                              handleUnitChange(index, 'endSound', e.target.value)
                            }
                          >
                            <MenuItem value={SOUND_NONE}>なし</MenuItem>
                            {soundFiles.map((file) => (
                              <MenuItem key={file.filename} value={file.filename}>
                                {file.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>

              <Button
                startIcon={<AddIcon />}
                onClick={handleAddUnit}
                variant="text"
                fullWidth
                sx={{ mt: 2 }}
              >
                ユニットタイマーを追加
              </Button>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={isPending || !isFormValid}>
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
            「{timer?.name}」を削除しますか？
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
