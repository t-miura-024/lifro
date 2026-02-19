'use client'

import { useTimer } from '@/app/providers/TimerContext'
import { audioScheduler } from '@/utils/soundPlayer'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RepeatIcon from '@mui/icons-material/Repeat'
import StopIcon from '@mui/icons-material/Stop'
import VolumeDownIcon from '@mui/icons-material/VolumeDown'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Popover,
  Slider,
  Stack,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function TimerOverlay() {
  const {
    status,
    timer,
    currentUnitIndex,
    remainingSeconds,
    totalDuration,
    isRepeat,
    pause,
    resume,
    stop,
    toggleRepeat,
  } = useTimer()
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false)
  const [volume, setVolume] = useState(100)
  const [volumeAnchorEl, setVolumeAnchorEl] = useState<HTMLButtonElement | null>(null)

  // 初期化時にaudioSchedulerから音量を取得
  useEffect(() => {
    setVolume(audioScheduler.getVolume())
  }, [])

  const handleVolumeClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setVolumeAnchorEl(event.currentTarget)
  }

  const handleVolumeClose = () => {
    setVolumeAnchorEl(null)
  }

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    const newVolume = newValue as number
    setVolume(newVolume)
    audioScheduler.setVolume(newVolume)
  }

  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeOffIcon />
    if (volume <= 50) return <VolumeDownIcon />
    return <VolumeUpIcon />
  }

  const volumePopoverOpen = Boolean(volumeAnchorEl)

  // タイマーが実行中でない場合は何も表示しない
  if (status === 'idle' || !timer) {
    return null
  }

  const currentUnit = timer.unitTimers[currentUnitIndex]
  const progress = totalDuration > 0 ? ((totalDuration - remainingSeconds) / totalDuration) * 100 : 0

  const handlePlayPause = () => {
    if (status === 'playing') {
      pause()
    } else {
      resume()
    }
  }

  const handleStop = () => {
    setStopConfirmOpen(true)
  }

  const handleStopConfirm = () => {
    stop()
    setStopConfirmOpen(false)
  }

  return (
    <>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.modal + 1,
          borderRadius: 0,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          pt: 'env(safe-area-inset-top)',
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            {/* 停止ボタン */}
            <IconButton
              size="small"
              onClick={handleStop}
              sx={{ color: 'inherit' }}
              aria-label="タイマーを停止"
            >
              <StopIcon />
            </IconButton>

            {/* リピートトグル */}
            <IconButton
              size="small"
              onClick={toggleRepeat}
              sx={{
                color: isRepeat ? 'primary.contrastText' : 'rgba(0, 0, 0, 0.35)',
              }}
              aria-label={isRepeat ? 'リピート再生を無効にする' : 'リピート再生を有効にする'}
            >
              <RepeatIcon />
            </IconButton>

            {/* 音量ボタン */}
            <IconButton
              size="small"
              onClick={handleVolumeClick}
              sx={{ color: 'inherit' }}
              aria-label="音量調整"
            >
              {getVolumeIcon()}
            </IconButton>

            {/* タイマー情報 */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography
                  variant="body2"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {currentUnit?.name || '名前なし'}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {currentUnitIndex + 1}/{timer.unitTimers.length}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h5" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatTime(remainingSeconds)}
                </Typography>
              </Stack>
            </Box>

            {/* 再生/一時停止ボタン */}
            <IconButton
              size="large"
              onClick={handlePlayPause}
              sx={{
                color: 'inherit',
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
              aria-label={status === 'playing' ? '一時停止' : '再開'}
            >
              {status === 'playing' ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
          </Stack>
        </Box>

        {/* プログレスバー */}
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 4,
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            '& .MuiLinearProgress-bar': {
              bgcolor: 'rgba(255, 255, 255, 0.8)',
            },
          }}
        />
      </Paper>

      {/* 停止確認ダイアログ */}
      <Dialog
        open={stopConfirmOpen}
        onClose={(_event, reason) => {
          if (reason === 'backdropClick') return
          setStopConfirmOpen(false)
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>タイマーを停止</DialogTitle>
        <DialogContent>
          <Typography>タイマーを停止しますか？</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setStopConfirmOpen(false)}>キャンセル</Button>
          <Button variant="contained" color="error" onClick={handleStopConfirm}>
            停止
          </Button>
        </DialogActions>
      </Dialog>

      {/* 音量ポップオーバー */}
      <Popover
        open={volumePopoverOpen}
        anchorEl={volumeAnchorEl}
        onClose={handleVolumeClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
      >
        <Box sx={{ p: 2, width: 200 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Slider
              value={volume}
              onChange={handleVolumeChange}
              min={0}
              max={500}
              step={10}
              aria-label="音量"
              sx={{ flex: 1 }}
            />
            <Typography variant="body2" sx={{ minWidth: 45, textAlign: 'right' }}>
              {volume}%
            </Typography>
          </Stack>
        </Box>
      </Popover>
    </>
  )
}
