/**
 * ドメインエンティティの型定義
 *
 * 日付フィールドの型について:
 * - date: YYYY-MM-DD形式の文字列
 * - createdAt/updatedAt: ISO 8601形式の文字列 (YYYY-MM-DDTHH:mm:ss.sssZ)
 */

/** ユーザー */
export type User = {
  id: number
  email: string
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

/** 部位大カテゴリ */
export type BodyPartCategory = 'CHEST' | 'BACK' | 'SHOULDER' | 'ARM' | 'ABS' | 'LEG'

/** 部位大カテゴリの表示名 */
export const BodyPartCategoryLabels: Record<BodyPartCategory, string> = {
  CHEST: '胸',
  BACK: '背中',
  SHOULDER: '肩',
  ARM: '腕',
  ABS: '腹筋',
  LEG: '脚',
}

/** 部位大カテゴリの表示順 */
export const BodyPartCategoryOrder: BodyPartCategory[] = [
  'CHEST',
  'BACK',
  'SHOULDER',
  'ARM',
  'ABS',
  'LEG',
]

/** 部位 */
export type BodyPart = {
  id: number
  category: BodyPartCategory
  name: string
  sortIndex: number
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

/** 種目-部位の紐付け */
export type ExerciseBodyPart = {
  id: number
  exerciseId: number
  bodyPartId: number
  loadRatio: number // 負荷割合（0-100）
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  bodyPart?: BodyPart
}

/** 種目 */
export type Exercise = {
  id: number
  userId: number
  name: string
  sortIndex: number
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  bodyParts?: ExerciseBodyPart[]
}

/** 種目（部位情報付き） */
export type ExerciseWithBodyParts = Exercise & {
  bodyParts: ExerciseBodyPart[]
  primaryCategory: BodyPartCategory | null
}

/** セット（トレーニングの最小単位） */
export type TrainingSet = {
  id: number
  exerciseId: number
  userId: number
  weight: number
  reps: number
  date: string // YYYY-MM-DD
  sortIndex: number
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  exercise?: Exercise
}

/**
 * トレーニング（日付単位でまとめられたセットの集約）
 * - DBには存在しない、アプリケーション層で使用する集約オブジェクト
 */
export type Training = {
  date: string // YYYY-MM-DD
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
  date: string // YYYY-MM-DD
}

/** 直近実施日の当該種目の全セット */
export type LatestExerciseSets = {
  exerciseId: number
  exerciseName: string
  date: string // YYYY-MM-DD
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
  date: string // YYYY-MM-DD
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
  date: string // YYYY-MM-DD
  content: string
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
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
  name: string | null // 名前（任意）
  sortIndex: number
  duration: number // 秒単位
  countSound: string | null
  countSoundLast3Sec: string | null
  endSound: string | null
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

/** タイマー */
export type Timer = {
  id: number
  userId: number
  name: string
  sortIndex: number
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  unitTimers: UnitTimer[]
}

/** ユニットタイマーの入力データ（新規作成・更新用） */
export type UnitTimerInput = {
  id?: number
  name?: string // 名前（任意）
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
