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

/** トレーニングの要約（一覧表示用） */
export type TrainingSummary = {
  date: Date
  exerciseNames: string[]
  totalVolume: number
  setCount: number
}
