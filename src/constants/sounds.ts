/**
 * 音声ファイルの型定義
 */
export type SoundFile = {
  /** ファイル名（拡張子付き） */
  filename: string
  /** 表示名（拡張子なし） */
  name: string
}

/**
 * 「なし」を表す特殊な値
 */
export const SOUND_NONE = 'none'

/**
 * カウント音のデフォルトファイル名
 * 存在しない場合は無音になる
 */
export const DEFAULT_COUNT_SOUND: string | null = null

/**
 * 終了3秒前の音のデフォルトファイル名
 * 存在しない場合は無音になる
 */
export const DEFAULT_COUNT_SOUND_LAST_3_SEC: string | null = null

/**
 * 終了音のデフォルトファイル名
 * 存在しない場合は無音になる
 */
export const DEFAULT_END_SOUND: string | null = null
