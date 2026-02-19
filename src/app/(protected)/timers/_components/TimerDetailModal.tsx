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
import { audioScheduler } from '@/utils/soundPlayer'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import {
  Box,
  Button,
  Collapse,
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

// ソート可能なユニットタイマーアイテム
type SortableUnitTimerItemProps = {
  unit: UnitTimerFormData
  index: number
  isExpanded: boolean
  canDelete: boolean
  soundFiles: SoundFile[]
  onToggleExpanded: () => void
  onUnitChange: (index: number, field: keyof UnitTimerFormData, value: string) => void
  onRemoveUnit: (index: number) => void
  onPlaySound: (e: React.MouseEvent, filename: string) => void
  isValidTime: (unit: UnitTimerFormData) => boolean
  formatDuration: (minutes: string, seconds: string) => string
  getSoundDisplayName: (filename: string) => string
}

function SortableUnitTimerItem({
  unit,
  index,
  isExpanded,
  canDelete,
  soundFiles,
  onToggleExpanded,
  onUnitChange,
  onRemoveUnit,
  onPlaySound,
  isValidTime,
  formatDuration,
  getSoundDisplayName,
}: SortableUnitTimerItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: unit.key,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      variant="outlined"
      sx={{
        p: 1.5,
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
      }}
      onClick={onToggleExpanded}
    >
      {/* サマリービュー（常に表示） */}
      <Stack spacing={0.5}>
        {/* 1行目: ドラッグ・名前・時間・削除 */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton
            size="small"
            {...attributes}
            {...listeners}
            sx={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
            aria-label="ドラッグして並び替え"
            onClick={(e) => e.stopPropagation()}
          >
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
          <Typography
            sx={{
              flex: 1,
              fontWeight: 500,
              color: unit.name ? 'text.primary' : 'text.secondary',
            }}
          >
            {unit.name || '名前なし'}
          </Typography>
          <Typography
            variant="body2"
            color={isValidTime(unit) ? 'text.secondary' : 'error'}
            sx={{ fontFamily: 'monospace' }}
          >
            {formatDuration(unit.minutes, unit.seconds)}
          </Typography>
          {canDelete && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onRemoveUnit(index)
              }}
              aria-label="ユニットタイマーを削除"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>

        {/* 2行目: 音声設定サマリー */}
        <Typography variant="caption" color="text.secondary" sx={{ pl: 5 }}>
          カウント: {getSoundDisplayName(unit.countSound)} | 3秒前:{' '}
          {getSoundDisplayName(unit.countSoundLast3Sec)} | 終了:{' '}
          {getSoundDisplayName(unit.endSound)}
        </Typography>
      </Stack>

      {/* 詳細フォーム（展開時のみ） */}
      <Collapse in={isExpanded}>
        <Box sx={{ pt: 2 }} onClick={(e) => e.stopPropagation()}>
          <Stack spacing={2}>
            {/* 名前入力 */}
            <TextField
              size="small"
              label="名前"
              placeholder="名前なし"
              value={unit.name}
              onChange={(e) => onUnitChange(index, 'name', e.target.value)}
              fullWidth
            />

            {/* 時間入力 */}
            <Stack direction="row" spacing={1} alignItems="center">
              <FormControl size="small" sx={{ width: 80 }} error={!isValidTime(unit)}>
                <InputLabel>分</InputLabel>
                <Select
                  value={unit.minutes}
                  label="分"
                  onChange={(e: SelectChangeEvent) => onUnitChange(index, 'minutes', e.target.value)}
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
                  onChange={(e: SelectChangeEvent) => onUnitChange(index, 'seconds', e.target.value)}
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
                  onChange={(e: SelectChangeEvent) => onUnitChange(index, 'countSound', e.target.value)}
                  renderValue={(value) => {
                    if (value === SOUND_NONE) return 'なし'
                    const file = soundFiles.find((f) => f.filename === value)
                    return file?.name ?? value.replace(/\.[^.]+$/, '')
                  }}
                >
                  <MenuItem value={SOUND_NONE}>なし</MenuItem>
                  {soundFiles.map((file) => (
                    <MenuItem key={file.filename} value={file.filename}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%',
                        }}
                      >
                        <span>{file.name}</span>
                        <IconButton
                          size="small"
                          onClick={(e) => onPlaySound(e, file.filename)}
                          sx={{ ml: 1 }}
                        >
                          <VolumeUpIcon fontSize="small" />
                        </IconButton>
                      </Box>
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
                    onUnitChange(index, 'countSoundLast3Sec', e.target.value)
                  }
                  renderValue={(value) => {
                    if (value === SOUND_NONE) return 'なし'
                    const file = soundFiles.find((f) => f.filename === value)
                    return file?.name ?? value.replace(/\.[^.]+$/, '')
                  }}
                >
                  <MenuItem value={SOUND_NONE}>なし</MenuItem>
                  {soundFiles.map((file) => (
                    <MenuItem key={file.filename} value={file.filename}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%',
                        }}
                      >
                        <span>{file.name}</span>
                        <IconButton
                          size="small"
                          onClick={(e) => onPlaySound(e, file.filename)}
                          sx={{ ml: 1 }}
                        >
                          <VolumeUpIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>終了音</InputLabel>
                <Select
                  value={unit.endSound}
                  label="終了音"
                  onChange={(e: SelectChangeEvent) => onUnitChange(index, 'endSound', e.target.value)}
                  renderValue={(value) => {
                    if (value === SOUND_NONE) return 'なし'
                    const file = soundFiles.find((f) => f.filename === value)
                    return file?.name ?? value.replace(/\.[^.]+$/, '')
                  }}
                >
                  <MenuItem value={SOUND_NONE}>なし</MenuItem>
                  {soundFiles.map((file) => (
                    <MenuItem key={file.filename} value={file.filename}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%',
                        }}
                      >
                        <span>{file.name}</span>
                        <IconButton
                          size="small"
                          onClick={(e) => onPlaySound(e, file.filename)}
                          sx={{ ml: 1 }}
                        >
                          <VolumeUpIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  )
}

export default function TimerDetailModal({ open, onClose, onSaved, timer }: Props) {
  const [name, setName] = useState('')
  const [unitTimers, setUnitTimers] = useState<UnitTimerFormData[]>([createEmptyUnit()])
  const [isPending, startTransition] = useTransition()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [soundFiles, setSoundFiles] = useState<SoundFile[]>([])
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  const isEditMode = timer !== null

  // dnd-kit センサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  )

  // ドラッグ終了時の並び替え処理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = unitTimers.findIndex((u) => u.key === active.id)
    const newIndex = unitTimers.findIndex((u) => u.key === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      setUnitTimers(arrayMove(unitTimers, oldIndex, newIndex))
    }
  }

  // 展開/折りたたみのトグル
  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // サマリー表示用: 音声ファイル名を取得
  const getSoundDisplayName = (filename: string): string => {
    if (filename === SOUND_NONE) return 'なし'
    const file = soundFiles.find((f) => f.filename === filename)
    return file?.name ?? filename.replace(/\.[^.]+$/, '')
  }

  // サマリー表示用: 時間をフォーマット
  const formatDuration = (minutes: string, seconds: string): string => {
    const m = Number.parseInt(minutes, 10) || 0
    const s = Number.parseInt(seconds, 10) || 0
    return `${m}:${s.toString().padStart(2, '0')}`
  }

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

  // 音声プレビュー再生
  const handlePlaySound = (e: React.MouseEvent, filename: string) => {
    e.stopPropagation() // 選択確定を防ぐ
    audioScheduler.init() // iOS対応
    audioScheduler.playNow(filename)
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={unitTimers.map((u) => u.key)}
                  strategy={verticalListSortingStrategy}
                >
                  <Stack spacing={1.5}>
                    {unitTimers.map((unit, index) => (
                      <SortableUnitTimerItem
                        key={unit.key}
                        unit={unit}
                        index={index}
                        isExpanded={expandedKeys.has(unit.key)}
                        canDelete={unitTimers.length > 1}
                        soundFiles={soundFiles}
                        onToggleExpanded={() => toggleExpanded(unit.key)}
                        onUnitChange={handleUnitChange}
                        onRemoveUnit={handleRemoveUnit}
                        onPlaySound={handlePlaySound}
                        isValidTime={isValidTime}
                        formatDuration={formatDuration}
                        getSoundDisplayName={getSoundDisplayName}
                      />
                    ))}
                  </Stack>
                </SortableContext>
              </DndContext>

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
