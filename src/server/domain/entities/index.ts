/**
 * ドメインエンティティの型定義
 */

/** ユーザー */
export type User = {
  id: number
  email: string
  createdAt: Date
  updatedAt: Date
}

/** 種目 */
export type Exercise = {
  id: number
  userId: number
  name: string
  sortIndex: number
  createdAt: Date
  updatedAt: Date
}

/** セット（トレーニングの最小単位） */
export type TrainingSet = {
  id: number
  exerciseId: number
  userId: number
  weight: number
  reps: number
  date: Date
  sortIndex: number
  createdAt: Date
  updatedAt: Date
  exercise?: Exercise
}

/**
 * トレーニング（日付単位でまとめられたセットの集約）
 * - DBには存在しない、アプリケーション層で使用する集約オブジェクト
 */
export type Training = {
  date: Date
  userId: number
  sets: TrainingSet[]
}

/** セットの入力データ（新規作成・更新用） */
export type SetInput = {
  id?: number
  exerciseId: number
  weight: number
  reps: number
  sortIndex: number
}

/** 前回値（種目の最終記録） */
export type ExerciseHistory = {
  exerciseId: number
  exerciseName: string
  weight: number
  reps: number
  date: Date
}

/** 直近実施日の当該種目の全セット */
export type LatestExerciseSets = {
  exerciseId: number
  exerciseName: string
  date: Date
  sets: Array<{
    weight: number
    reps: number
    sortIndex: number
  }>
}

/** 種目ごとのボリューム */
export type ExerciseVolume = {
  exerciseId: number
  exerciseName: string
  volume: number
}

/** トレーニングの要約（一覧表示用） */
export type TrainingSummary = {
  date: Date
  exerciseNames: string[]
  exercises: ExerciseVolume[]
  totalVolume: number
  setCount: number
  memos: TrainingMemo[]
}

/** トレーニングメモ */
export type TrainingMemo = {
  id: number
  userId: number
  date: Date
  content: string
  createdAt: Date
  updatedAt: Date
}

/** トレーニングメモの入力データ（新規作成・更新用） */
export type TrainingMemoInput = {
  id?: number
  content: string
}

/** 年月（プルダウン選択用） */
export type YearMonth = {
  year: number
  month: number
}

/** ユニットタイマー（タイマーを構成する個々の時間単位） */
export type UnitTimer = {
  id: number
  timerId: number
  sortIndex: number
  duration: number // 秒単位
  countSound: string | null
  countSoundLast3Sec: string | null
  endSound: string | null
  createdAt: Date
  updatedAt: Date
}

/** タイマー */
export type Timer = {
  id: number
  userId: number
  name: string
  sortIndex: number
  createdAt: Date
  updatedAt: Date
  unitTimers: UnitTimer[]
}

/** ユニットタイマーの入力データ（新規作成・更新用） */
export type UnitTimerInput = {
  id?: number
  sortIndex: number
  duration: number
  countSound: string | null
  countSoundLast3Sec: string | null
  endSound: string | null
}

/** タイマーの入力データ（新規作成・更新用） */
export type TimerInput = {
  id?: number
  name: string
  sortIndex: number
  unitTimers: UnitTimerInput[]
}
