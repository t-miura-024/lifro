/**
 * 日付変換ユーティリティ
 *
 * インフラ層でDB(Date型)とドメイン層(string型)の変換を担当
 */

/**
 * Date型をYYYY-MM-DD形式の文字列に変換
 * @param date Dateオブジェクト
 * @returns YYYY-MM-DD形式の文字列
 */
export const toDateString = (date: Date): string => date.toISOString().split('T')[0]

/**
 * Date型をISO 8601フル形式の文字列に変換
 * @param date Dateオブジェクト
 * @returns ISO 8601形式の文字列（例: 2024-01-15T12:34:56.789Z）
 */
export const toISOString = (date: Date): string => date.toISOString()

/**
 * 日付文字列をDate型に変換
 * @param dateStr YYYY-MM-DD形式またはISO 8601形式の文字列
 * @returns Dateオブジェクト
 */
export const parseDate = (dateStr: string): Date => new Date(dateStr)
