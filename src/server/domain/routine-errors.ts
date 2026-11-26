/**
 * ルーティンのドメインエラー。
 *
 * 一意制約（user_id, name）違反はインフラ層で検出し、ユーザー向けの文言を持つ
 * ドメインエラーへ変換する。HTTP 境界でそのまま表示できるよう、procedure 層が
 * この型を ORPCError へ写像する。
 */

/** 同名ルーティンの作成・更新時にユーザーへ提示するメッセージ。 */
export const DUPLICATE_ROUTINE_NAME_MESSAGE = '同名のルーティンが既に存在します'

export class DuplicateRoutineNameError extends Error {
  constructor() {
    super(DUPLICATE_ROUTINE_NAME_MESSAGE)
    this.name = 'DuplicateRoutineNameError'
  }
}
