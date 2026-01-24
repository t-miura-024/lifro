/**
 * リポジトリインターフェース定義
 *
 * 日付パラメータについて:
 * - date: YYYY-MM-DD形式の文字列
 */

import type {
  BodyPart,
  BodyPartCategory,
  Exercise,
  ExerciseBodyPart,
  ExerciseHistory,
  ExerciseWithBodyParts,
  LatestExerciseSets,
  SetInput,
  Timer,
  TimerInput,
  Training,
  TrainingMemo,
  TrainingMemoInput,
  TrainingSummary,
  YearMonth,
} from '../entities'

/** トレーニングリポジトリ */
export interface ITrainingRepository {
  /**
   * 指定月のトレーニング一覧を取得
   */
  findByMonth(userId: number, year: number, month: number): Promise<TrainingSummary[]>

  /**
   * 特定日のトレーニング詳細を取得
   * @param date YYYY-MM-DD形式
   */
  findByDate(userId: number, date: string): Promise<Training | null>

  /**
   * トレーニング（セット群）を保存
   * - 既存セットの更新、新規セットの追加、削除されたセットの削除を行う
   * @param date YYYY-MM-DD形式
   */
  save(userId: number, date: string, sets: SetInput[]): Promise<Training>

  /**
   * 特定日のトレーニングを削除
   * @param date YYYY-MM-DD形式
   */
  deleteByDate(userId: number, date: string): Promise<void>

  /**
   * 種目の前回値（直近の記録）を取得
   * @param excludeDate 除外する日付（YYYY-MM-DD形式、この日付のセットは対象外）
   */
  getLatestHistory(
    userId: number,
    exerciseId: number,
    excludeDate?: string,
  ): Promise<ExerciseHistory | null>

  /**
   * 直近実施日の当該種目の全セットを取得
   * @param excludeDate 除外する日付（YYYY-MM-DD形式、この日付のセットは対象外）
   */
  getLatestExerciseSets(
    userId: number,
    exerciseId: number,
    excludeDate?: string,
  ): Promise<LatestExerciseSets | null>

  /**
   * 複数種目の直近実施日の全セットを一括取得
   * @param excludeDate 除外する日付（YYYY-MM-DD形式、この日付のセットは対象外）
   */
  getLatestExerciseSetsMultiple(
    userId: number,
    exerciseIds: number[],
    excludeDate?: string,
  ): Promise<Map<number, LatestExerciseSets>>

  /**
   * セット情報が存在する年月の一覧を取得（降順）
   */
  getAvailableYearMonths(userId: number): Promise<YearMonth[]>
}

/** 種目の並び順更新用入力 */
export type ExerciseSortOrderInput = {
  id: number
  sortIndex: number
}

/** 種目リポジトリ */
export interface IExerciseRepository {
  /**
   * ユーザーの全種目を取得（sortIndex順）
   */
  findAllByUserId(userId: number): Promise<Exercise[]>

  /**
   * 種目名で検索
   */
  searchByName(userId: number, query: string): Promise<Exercise[]>

  /**
   * 種目を作成
   */
  create(userId: number, name: string): Promise<Exercise>

  /**
   * 種目名を更新
   */
  update(userId: number, exerciseId: number, name: string): Promise<Exercise>

  /**
   * 種目の並び順を一括更新
   */
  updateSortOrder(userId: number, exercises: ExerciseSortOrderInput[]): Promise<void>

  /**
   * 種目を削除
   */
  delete(userId: number, exerciseId: number): Promise<void>

  /**
   * 種目に紐づくセットが存在するかチェック
   */
  hasRelatedSets(userId: number, exerciseId: number): Promise<boolean>
}

/** トレーニングメモリポジトリ */
export interface ITrainingMemoRepository {
  /**
   * 指定日のメモ一覧を取得
   * @param date YYYY-MM-DD形式
   */
  findByDate(userId: number, date: string): Promise<TrainingMemo[]>

  /**
   * 指定月のメモがある日付一覧を取得
   * @returns YYYY-MM-DD形式の日付配列
   */
  findDatesWithMemoByMonth(userId: number, year: number, month: number): Promise<string[]>

  /**
   * メモを作成
   * @param date YYYY-MM-DD形式
   */
  create(userId: number, date: string, content: string): Promise<TrainingMemo>

  /**
   * メモを更新
   */
  update(userId: number, memoId: number, content: string): Promise<TrainingMemo>

  /**
   * メモを削除
   */
  delete(userId: number, memoId: number): Promise<void>

  /**
   * メモを一括保存（追加・更新・削除）
   * @param date YYYY-MM-DD形式
   */
  saveAll(userId: number, date: string, memos: TrainingMemoInput[]): Promise<TrainingMemo[]>
}

/** タイマーの並び順更新用入力 */
export type TimerSortOrderInput = {
  id: number
  sortIndex: number
}

/** タイマーリポジトリ */
export interface ITimerRepository {
  /**
   * ユーザーの全タイマーを取得（sortIndex順）
   */
  findAllByUserId(userId: number): Promise<Timer[]>

  /**
   * タイマーをIDで取得
   */
  findById(userId: number, timerId: number): Promise<Timer | null>

  /**
   * タイマーを作成（ユニットタイマーも含めて）
   */
  create(userId: number, input: TimerInput): Promise<Timer>

  /**
   * タイマーを更新（ユニットタイマーも含めて）
   */
  update(userId: number, timerId: number, input: TimerInput): Promise<Timer>

  /**
   * タイマーの並び順を一括更新
   */
  updateSortOrder(userId: number, timers: TimerSortOrderInput[]): Promise<void>

  /**
   * タイマーを削除
   */
  delete(userId: number, timerId: number): Promise<void>
}

/** 部位リポジトリ */
export interface IBodyPartRepository {
  /**
   * 全部位を取得（カテゴリ・sortIndex順）
   */
  findAll(): Promise<BodyPart[]>

  /**
   * カテゴリ別に部位を取得
   */
  findByCategory(category: BodyPartCategory): Promise<BodyPart[]>

  /**
   * IDで部位を取得
   */
  findById(id: number): Promise<BodyPart | null>
}

/** 種目-部位紐付けの入力データ */
export type ExerciseBodyPartInput = {
  bodyPartId: number
  loadRatio: number // 負荷割合（0-100）
}

/** 種目-部位リポジトリ（IExerciseRepositoryの拡張） */
export interface IExerciseBodyPartRepository {
  /**
   * 種目の部位紐付けを取得
   */
  findByExerciseId(exerciseId: number): Promise<ExerciseBodyPart[]>

  /**
   * 種目の部位紐付けを一括更新（全置換）
   */
  saveAll(
    userId: number,
    exerciseId: number,
    bodyParts: ExerciseBodyPartInput[],
  ): Promise<ExerciseBodyPart[]>

  /**
   * ユーザーの全種目を部位情報付きで取得（主要カテゴリ・sortIndex順）
   */
  findAllWithBodyParts(userId: number): Promise<ExerciseWithBodyParts[]>
}
