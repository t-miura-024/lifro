/**
 * リポジトリインターフェース定義
 */

import type { Exercise, ExerciseHistory, SetInput, Training, TrainingSummary } from '../entities'

/** トレーニングリポジトリ */
export interface ITrainingRepository {
  /**
   * 指定月のトレーニング一覧を取得
   */
  findByMonth(userId: number, year: number, month: number): Promise<TrainingSummary[]>

  /**
   * 特定日のトレーニング詳細を取得
   */
  findByDate(userId: number, date: Date): Promise<Training | null>

  /**
   * トレーニング（セット群）を保存
   * - 既存セットの更新、新規セットの追加、削除されたセットの削除を行う
   */
  save(userId: number, date: Date, sets: SetInput[]): Promise<Training>

  /**
   * 特定日のトレーニングを削除
   */
  deleteByDate(userId: number, date: Date): Promise<void>

  /**
   * 種目の前回値（直近の記録）を取得
   */
  getLatestHistory(userId: number, exerciseId: number): Promise<ExerciseHistory | null>
}

/** 種目リポジトリ */
export interface IExerciseRepository {
  /**
   * ユーザーの全種目を取得
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
   * 種目を削除
   */
  delete(userId: number, exerciseId: number): Promise<void>
}
