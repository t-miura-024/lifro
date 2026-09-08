/**
 * 日付変換ユーティリティ
 *
 * インフラ層でDB(Date型・date文字列)とドメイン層(string型)の変換を担当
 */

/**
 * Date型またはdate文字列をYYYY-MM-DD形式の文字列に変換
 * @param date DateオブジェクトまたはYYYY-MM-DD形式の文字列
 * @returns YYYY-MM-DD形式の文字列
 */
export const toDateString = (date: Date | string): string =>
  typeof date === 'string' ? date.slice(0, 10) : date.toISOString().split('T')[0]

/**
 * Date型またはdate文字列をISO 8601フル形式の文字列に変換
 *
 * timestamp型カラム（drizzleはDateで返す）専用。string入力はDB由来のISO文字列を
 * そのまま返す。new Date経由の再変換はTZずれ（date文字列がUTC深夜として解釈される等）の
 * 原因になるため行わない。date型カラムには toDateString を使うこと。
 * 既存呼び出しはすべて createdAt/updatedAt（timestamp型=Date入力）のため等価。
 * @param date DateオブジェクトまたはISO 8601形式の文字列
 * @returns ISO 8601形式の文字列（例: 2024-01-15T12:34:56.789Z）
 */
export const toISOString = (date: Date | string): string =>
  typeof date === 'string' ? date : date.toISOString()
