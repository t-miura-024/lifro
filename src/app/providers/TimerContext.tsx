'use client'

import type { Timer } from '@/server/domain/entities'
import { audioScheduler, initAudioContext } from '@/utils/soundPlayer'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export type TimerStatus = 'idle' | 'playing' | 'paused'

export type TimerState = {
  status: TimerStatus
  timer: Timer | null
  currentUnitIndex: number
  remainingSeconds: number
  totalDuration: number // 現在のユニットタイマーの総時間（秒）
  isRepeat: boolean // リピート再生が有効かどうか
}

export type TimerActions = {
  startTimer: (timer: Timer) => void
  pause: () => void
  resume: () => void
  stop: () => void
  toggleRepeat: () => void
}

type TimerContextValue = TimerState & TimerActions

const TimerContext = createContext<TimerContextValue | null>(null)

const initialState: TimerState = {
  status: 'idle',
  timer: null,
  currentUnitIndex: 0,
  remainingSeconds: 0,
  totalDuration: 0,
  isRepeat: false,
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>(initialState)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ドリフト補正のための絶対時間基準
  // startTimeRef: 現在のユニットが開始した時刻
  // elapsedSecondsRef: 音を鳴らした秒数（累積ドリフトを防ぐため）
  const startTimeRef = useRef<number>(0)
  const elapsedSecondsRef = useRef<number>(0)
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
        // 全てのユニットタイマーが完了
        if (prev.isRepeat) {
          // リピート有効時は最初のユニットに戻る
          const firstUnit = prev.timer.unitTimers[0]
          // 時間基準をリセット
          startTimeRef.current = Date.now()
          elapsedSecondsRef.current = 0

          // 最初のユニットのサウンドをプリロード
          audioScheduler.preloadSounds([
            firstUnit.countSound,
            firstUnit.countSoundLast3Sec,
            firstUnit.endSound,
          ])

          return {
            ...prev,
            currentUnitIndex: 0,
            remainingSeconds: firstUnit.duration,
            totalDuration: firstUnit.duration,
          }
        }
        // リピート無効時は停止 - clearTimer は setState の外で実行
        setTimeout(() => clearTimer(), 0)
        return initialState
      }

      const nextUnit = prev.timer.unitTimers[nextIndex]
      // 新しいユニット開始時に時間基準をリセット
      startTimeRef.current = Date.now()
      elapsedSecondsRef.current = 0

      // 次のユニットのサウンドをプリロード
      audioScheduler.preloadSounds([
        nextUnit.countSound,
        nextUnit.countSoundLast3Sec,
        nextUnit.endSound,
      ])

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
    // 絶対時間基準で経過秒数を計算（ドリフト補正）
    const totalElapsedMs = now - startTimeRef.current
    const totalElapsedSeconds = Math.floor(totalElapsedMs / 1000)

    // 前回チェック時から秒数が進んでいなければ何もしない
    if (totalElapsedSeconds <= elapsedSecondsRef.current) return

    // 経過した秒数（複数秒進んでいる可能性がある）
    const secondsToProcess = totalElapsedSeconds - elapsedSecondsRef.current
    elapsedSecondsRef.current = totalElapsedSeconds

    setState((prev) => {
      if (prev.status !== 'playing' || !prev.timer) return prev
      if (isTransitioningRef.current) return prev // 遷移中はスキップ

      const currentUnit = prev.timer.unitTimers[prev.currentUnitIndex]
      if (!currentUnit) return prev

      const newRemaining = Math.max(0, prev.remainingSeconds - secondsToProcess)

      // サウンド再生のスケジューリング
      // Web Audio API を使用して正確なタイミングで再生
      for (let i = 1; i <= secondsToProcess; i++) {
        const remainingAtThisTick = prev.remainingSeconds - i

        if (remainingAtThisTick > 3) {
          // カウント音（残り4秒以上）
          audioScheduler.playNow(currentUnit.countSound)
        } else if (remainingAtThisTick > 0 && remainingAtThisTick <= 3) {
          // 終了3秒前の音（残り3秒、2秒、1秒）
          audioScheduler.playNow(currentUnit.countSoundLast3Sec)
        } else if (remainingAtThisTick === 0) {
          // ユニットタイマー終了
          isTransitioningRef.current = true
          audioScheduler.playNow(currentUnit.endSound)
          setTimeout(() => {
            moveToNextUnit()
            isTransitioningRef.current = false
          }, 500)
        }
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

      // サウンドをプリロード
      audioScheduler.preloadSounds([
        firstUnit.countSound,
        firstUnit.countSoundLast3Sec,
        firstUnit.endSound,
      ])

      setState((prev) => ({
        status: 'playing',
        timer,
        currentUnitIndex: 0,
        remainingSeconds: firstUnit.duration,
        totalDuration: firstUnit.duration,
        isRepeat: prev.isRepeat, // リピート状態を維持
      }))

      // 絶対時間基準を設定
      startTimeRef.current = Date.now()
      elapsedSecondsRef.current = 0
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
    setState((prev) => {
      // 再開時に時間基準をリセット（残り時間から逆算）
      const elapsed = prev.totalDuration - prev.remainingSeconds
      startTimeRef.current = Date.now() - elapsed * 1000
      elapsedSecondsRef.current = elapsed
      return {
        ...prev,
        status: 'playing',
      }
    })
    intervalRef.current = setInterval(tick, 100)
  }, [tick])

  // 停止
  const stop = useCallback(() => {
    clearTimer()
    isTransitioningRef.current = false // 遷移フラグをリセット
    setState(initialState)
  }, [clearTimer])

  // リピート切り替え
  const toggleRepeat = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRepeat: !prev.isRepeat,
    }))
  }, [])

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
    toggleRepeat,
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
