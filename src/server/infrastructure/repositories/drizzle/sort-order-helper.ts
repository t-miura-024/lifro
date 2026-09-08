import { sql } from 'drizzle-orm'
import type { AppDatabase } from '../../database/drizzle/client'

/** sort_index 一括更新の入力 */
export type SortOrderItem = {
  id: number
  sortIndex: number
}

/** CASE 一括更新を許可するテーブル（allowlist。任意文字列は受け付けない） */
export type SortOrderTableName = 'exercises' | 'timers'

/** 実行時に tableName を照合する allowlist */
const SORT_ORDER_TABLES: readonly SortOrderTableName[] = ['exercises', 'timers']

/** tableName→エラーラベル対応表（ヘルパー内に一本化。呼び出し側の手作業一致は不要） */
const SORT_ORDER_ENTITY_LABELS: Record<SortOrderTableName, string> = {
  exercises: 'Exercise',
  timers: 'Timer',
}

/** D1/SQLite の束縛上限・書き込み保持長期化を避けるための1文あたりの上限 */
export const SORT_ORDER_CHUNK_SIZE = 100

/** chunkSize の上限。巨大値で束縛対策を迂回させない */
export const SORT_ORDER_CHUNK_SIZE_MAX = 200

function assertPositiveInt(value: number, name: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`[sort-order] invalid ${name}: ${String(value)}`)
  }
}

/**
 * sort_index の CASE 一括更新をチャンク分割で実行する infra 共通ヘルパー。
 *
 * D1/SQLite に Postgres の UPDATE..FROM(VALUES)+列別名はないため、
 * 単文の CASE 式で一括更新する。updated_at はスキーマ (INTEGER ms) に合わせ
 * JS 時刻を束縛する。書き込みは `db.run` で実行し `meta.changes` で更新件数を
 * 検証する（0件更新・所有権不一致の検出）。
 *
 * db は実行引数で受ける（共有インスタンスの直接importはしない）。
 * chunkSize は有限・正整数・上限以下でなければ throw する
 * （0/負数/NaN では for 文が前進せず無限ループするため）。
 * tableName は実行時に allowlist 照合し、不正時は throw する
 * （sql.raw への素文字列埋め込みのため）。
 * userId・各 item の id/sortIndex は有限・整数（id/userId は正整数、
 * sortIndex は非負整数）でなければ throw する（NaN/Infinity/非整数の
 * 黙示変換・破損 sort_index 書込を防ぐため。検証は束縛前に行う）。
 *
 * 全チャンクは `db.transaction` で一括し、途中失敗時は全体をロールバックする
 * （チャンク毎の独立 run では2チャンク目以降の失敗で先行確定だけが残り
 * 半適用になるため。旧単文 UPDATE の原子性をチャンク分割後も保つ）。
 */
export async function bulkUpdateSortOrder(
  db: AppDatabase,
  tableName: SortOrderTableName,
  userId: number,
  items: SortOrderItem[],
  chunkSize: number = SORT_ORDER_CHUNK_SIZE,
): Promise<void> {
  if (!SORT_ORDER_TABLES.includes(tableName)) {
    throw new Error(`[sort-order] invalid table name: ${String(tableName)}`)
  }
  if (
    !Number.isFinite(chunkSize) ||
    !Number.isInteger(chunkSize) ||
    chunkSize <= 0 ||
    chunkSize > SORT_ORDER_CHUNK_SIZE_MAX
  ) {
    throw new Error(
      `[sort-order] invalid chunkSize: ${String(chunkSize)} ` +
        `(must be a positive integer <= ${SORT_ORDER_CHUNK_SIZE_MAX})`,
    )
  }
  assertPositiveInt(userId, 'userId')
  for (const item of items) {
    assertPositiveInt(item.id, 'item.id')
    if (!Number.isFinite(item.sortIndex) || !Number.isInteger(item.sortIndex) || item.sortIndex < 0) {
      throw new Error(`[sort-order] invalid item.sortIndex: ${String(item.sortIndex)}`)
    }
  }

  if (items.length === 0) return

  const entityLabel = SORT_ORDER_ENTITY_LABELS[tableName]

  await db.transaction(async (tx) => {
    for (let offset = 0; offset < items.length; offset += chunkSize) {
      const chunk = items.slice(offset, offset + chunkSize)
      const nowMs = Date.now()
      const cases = sql.join(
        chunk.map((item) => sql`WHEN ${item.id} THEN ${item.sortIndex}`),
        sql` `,
      )
      const ids = sql.join(
        chunk.map((item) => sql`${item.id}`),
        sql`, `,
      )
      const table = sql.raw(tableName)
      const result = await tx.run(sql`
        UPDATE ${table}
        SET sort_index = CASE id ${cases} ELSE sort_index END, updated_at = ${nowMs}
        WHERE user_id = ${userId} AND id IN (${ids})
      `)
      const changes = (result as unknown as { meta?: { changes?: unknown } }).meta?.changes
      if (typeof changes !== 'number') {
        console.warn(`[sort-order] missing meta.changes for ${entityLabel} chunk at offset ${offset}`)
        throw new Error(
          `${entityLabel} sort order update failed: meta.changes is not a number (offset ${offset})`,
        )
      }
      if (changes !== chunk.length) {
        throw new Error(
          `${entityLabel} sort order update mismatch: expected ${chunk.length}, updated ${changes}`,
        )
      }
    }
  })
}
