'use client'

import type { Timer } from '@/server/domain/entities'
import { initAudioContext, playSound } from '@/utils/soundPlayer'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export type TimerStatus = 'idle' | 'playing' | 'paused'

export type TimerState = {
  status: TimerStatus
  timer: Timer | null
  currentUnitIndex: number
  remainingSeconds: number
  totalDuration: number // 現在のユニットタイマーの総時間（秒）
}

export type TimerActions = {
  startTimer: (timer: Timer) => void
  pause: () => void
  resume: () => void
  stop: () => void
}

type TimerContextValue = TimerState & TimerActions

const TimerContext = createContext<TimerContextValue | null>(null)

const initialState: TimerState = {
  status: 'idle',
  timer: null,
  currentUnitIndex: 0,
  remainingSeconds: 0,
  totalDuration: 0,
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>(initialState)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastTickRef = useRef<number>(0)
  const isTransitioningRef = useRef<boolean>(false) // 遷移中フラグ

  // クリーンアップ
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // 次のユニットタイマーへ移動
  const moveToNextUnit = useCallback(() => {
    setState((prev) => {
      if (!prev.timer) return prev

      const nextIndex = prev.currentUnitIndex + 1
      if (nextIndex >= prev.timer.unitTimers.length) {
        // 全てのユニットタイマーが完了 - clearTimer は setState の外で実行
        setTimeout(() => clearTimer(), 0)
        return initialState
      }

      const nextUnit = prev.timer.unitTimers[nextIndex]
      // 新しいユニット開始時に lastTickRef をリセット
      lastTickRef.current = Date.now()

      return {
        ...prev,
        currentUnitIndex: nextIndex,
        remainingSeconds: nextUnit.duration,
        totalDuration: nextUnit.duration,
      }
    })
  }, [clearTimer])

  // タイマーのtick処理
  const tick = useCallback(() => {
    const now = Date.now()
    const elapsed = now - lastTickRef.current

    // 経過秒数を計算（1秒単位）
    const elapsedSeconds = Math.floor(elapsed / 1000)
    if (elapsedSeconds === 0) return // 1秒未満なら何もしない

    // 1秒以上経過したときだけ lastTickRef を更新
    lastTickRef.current = now

    setState((prev) => {
      if (prev.status !== 'playing' || !prev.timer) return prev
      if (isTransitioningRef.current) return prev // 遷移中はスキップ

      const currentUnit = prev.timer.unitTimers[prev.currentUnitIndex]
      if (!currentUnit) return prev

      const newRemaining = Math.max(0, prev.remainingSeconds - elapsedSeconds)

      // 副作用をスケジュール（setState の外で実行）
      // カウント音を再生（残り4秒以上で毎秒）
      if (newRemaining > 3 && prev.remainingSeconds !== newRemaining) {
        setTimeout(() => playSound(currentUnit.countSound), 0)
      }

      // 終了3秒前の音を再生（残り3秒、2秒、1秒）
      if (newRemaining <= 3 && newRemaining > 0 && prev.remainingSeconds !== newRemaining) {
        setTimeout(() => playSound(currentUnit.countSoundLast3Sec), 0)
      }

      // ユニットタイマー終了（既に0の場合は処理しない）
      if (newRemaining === 0 && prev.remainingSeconds > 0) {
        isTransitioningRef.current = true
        setTimeout(() => {
          playSound(currentUnit.endSound)
          setTimeout(() => {
            moveToNextUnit()
            isTransitioningRef.current = false
          }, 500)
        }, 0)
      }

      return {
        ...prev,
        remainingSeconds: newRemaining,
      }
    })
  }, [moveToNextUnit])

  // タイマー開始
  const startTimer = useCallback(
    (timer: Timer) => {
      if (timer.unitTimers.length === 0) return

      // AudioContextを初期化（ユーザーインタラクションのタイミングで）
      initAudioContext()

      clearTimer()
      isTransitioningRef.current = false // 遷移フラグをリセット

      const firstUnit = timer.unitTimers[0]
      setState({
        status: 'playing',
        timer,
        currentUnitIndex: 0,
        remainingSeconds: firstUnit.duration,
        totalDuration: firstUnit.duration,
      })

      lastTickRef.current = Date.now()
      intervalRef.current = setInterval(tick, 100) // 100msごとにチェック
    },
    [clearTimer, tick],
  )

  // 一時停止
  const pause = useCallback(() => {
    clearTimer()
    setState((prev) => ({
      ...prev,
      status: 'paused',
    }))
  }, [clearTimer])

  // 再開
  const resume = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'playing',
    }))
    lastTickRef.current = Date.now()
    intervalRef.current = setInterval(tick, 100)
  }, [tick])

  // 停止
  const stop = useCallback(() => {
    clearTimer()
    isTransitioningRef.current = false // 遷移フラグをリセット
    setState(initialState)
  }, [clearTimer])

  // アンマウント時にクリーンアップ
  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  const value: TimerContextValue = {
    ...state,
    startTimer,
    pause,
    resume,
    stop,
  }

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}

export function useTimer(): TimerContextValue {
  const context = useContext(TimerContext)
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider')
  }
  return context
}
