'use client'

import { client } from '@/app/_lib/hono/client'
import { useTimer } from '@/app/providers/TimerContext'
import type { Timer } from '@/server/domain/entities'
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
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import SortableTimerItem from './SortableTimerItem'
import TimerDetailModal from './TimerDetailModal'

export default function TimerList() {
  const [timers, setTimers] = useState<Timer[]>([])
  const [isPending, startTransition] = useTransition()
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSorting, setIsSorting] = useState(false)
  const isInitialLoadRef = useRef(true)

  // モーダル状態
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTimer, setSelectedTimer] = useState<Timer | null>(null)

  // タイマー実行コンテキスト
  const { startTimer } = useTimer()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // タイマーリストを取得
  const loadTimers = useCallback(() => {
    startTransition(async () => {
      const res = await client.api.timers.$get()
      const data = await res.json()
      setTimers(data)
      if (isInitialLoadRef.current) {
        setIsInitialLoading(false)
        isInitialLoadRef.current = false
      }
    })
  }, [])

  useEffect(() => {
    loadTimers()
  }, [loadTimers])

  // ドラッグ終了時の処理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = timers.findIndex((item) => item.id === active.id)
    const newIndex = timers.findIndex((item) => item.id === over.id)
    const newItems = arrayMove(timers, oldIndex, newIndex)

    // ローカル状態を即座に更新
    setTimers(newItems)

    // 変更されたアイテムのみを抽出して並び順を保存
    const minIndex = Math.min(oldIndex, newIndex)
    const maxIndex = Math.max(oldIndex, newIndex)
    const changedItems = newItems
      .slice(minIndex, maxIndex + 1)
      .map((item, i) => ({ id: item.id, sortIndex: minIndex + i }))

    setIsSorting(true)
    startTransition(async () => {
      await client.api.timers['sort-order'].$put({
        json: { timers: changedItems },
      })
      setIsSorting(false)
    })
  }

  // 新規作成
  const handleCreate = () => {
    setSelectedTimer(null)
    setModalOpen(true)
  }

  // 編集
  const handleEdit = useCallback((timer: Timer) => {
    setSelectedTimer(timer)
    setModalOpen(true)
  }, [])

  // 再生
  const handlePlay = useCallback(
    (timer: Timer) => {
      startTimer(timer)
    },
    [startTimer],
  )

  // モーダルを閉じた後
  const handleModalClose = () => {
    setModalOpen(false)
    setSelectedTimer(null)
  }

  // 保存後
  const handleSaved = () => {
    handleModalClose()
    loadTimers()
  }

  // 時間をフォーマット（秒 → mm:ss）
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // タイマーの総時間を計算
  const getTotalDuration = (timer: Timer): number => {
    return timer.unitTimers.reduce((sum, unit) => sum + unit.duration, 0)
  }

  // スケルトンローディング表示
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
            <Skeleton variant="circular" width={40} height={40} />
          </Stack>
        </Paper>
      ))}
    </Stack>
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
          aria-label="タイマーを追加"
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <AddIcon fontSize="medium" />
        </Button>
      </Stack>

      {isInitialLoading ? (
        renderSkeleton()
      ) : timers.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            タイマーが登録されていません。
            <br />
            「追加」ボタンからタイマーを登録してください。
          </Typography>
        </Paper>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={timers.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <Stack spacing={1.5}>
              {timers.map((timer) => (
                <SortableTimerItem
                  key={timer.id}
                  timer={timer}
                  totalDuration={formatDuration(getTotalDuration(timer))}
                  unitCount={timer.unitTimers.length}
                  onEdit={handleEdit}
                  onPlay={handlePlay}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      )}

      {/* タイマー詳細モーダル */}
      <TimerDetailModal
        open={modalOpen}
        onClose={handleModalClose}
        onSaved={handleSaved}
        timer={selectedTimer}
      />
    </Box>
  )
}
