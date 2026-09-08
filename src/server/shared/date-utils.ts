/**
 * 層非依存の日付ユーティリティ。
 *
 * application層・infrastructure層のどちらからもimportできるよう、
 * 特定層への依存を持たない共有モジュールとして置く。
 * DB由来の変換（toDateString/toISOString）は
 * infrastructure/repositories/drizzle/helper に残す。
 */

/**
 * Date型をローカルタイムゾーンのYYYY-MM-DD形式の文字列に変換
 *
 * date型カラムとの比較やseedの日付判定など、クエリ条件の組み立てに使う。
 * toDateString(Date) は toISOString 経由でUTCにずれるため、月窓・当日判定にはこちらを使う。
 */
export const toLocalDateString = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
