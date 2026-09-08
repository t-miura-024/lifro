import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

/** drizzle-orm/d1 が受け付ける D1 バインディング。 */
export type D1Client = Parameters<typeof drizzle>[0]

/** アプリ全体で共有する DB 型。 */
export type AppDatabase = ReturnType<typeof createDb>

export function createDb(client: D1Client) {
  return drizzle(client, { schema })
}

let injectedClient: D1Client | undefined
let cachedDb: AppDatabase | undefined

/**
 * D1 バインディングの明示注入シーム。
 *
 * 本モジュールは `cloudflare:workers` を import しない (bun 直実行・
 * plain node・workerd なし vitest でのモジュール評価を壊さないため)。
 * バインディングの取得は composition root の責務であり、`db` 利用前に
 * `configureDatabase(client)` で注入すること。
 */
export function configureDatabase(client: D1Client): void {
  // 同一バインディングなら再生成せず cachedDb を維持する。リクエスト毎の
  // 呼び出しでは通常同一 binding が渡されるため、毎リクエストの
  // drizzle 再生成を避けられる。
  // 並行安全性: 代入は同期的で既存インスタンスを mutate しない (差し替えのみ)。
  // 同一 isolate 内の並行リクエストは同一 binding を共有するため使い回しは安全。
  // binding 切替時は cachedDb を破棄するが、進行中のクエリは旧インスタンス参照を
  // 保つため影響を受けない。
  if (client === injectedClient && cachedDb) return
  injectedClient = client
  cachedDb = undefined
}

/** 注入済みクライアントの解決。未注入なら fail-fast。 */
function resolveInjectedClient(): D1Client {
  if (injectedClient) return injectedClient
  throw new Error(
    '[database] D1 binding (DB) is not configured. ' +
      'Call `configureDatabase(client)` before using `db`.',
  )
}

/** 共有 drizzle インスタンスの遅延生成・単一キャッシュ。 */
function getSharedDb(): AppDatabase {
  if (!cachedDb) {
    cachedDb = createDb(resolveInjectedClient())
  }
  return cachedDb
}

/**
 * 共有 DB インスタンス。
 *
 * `db` という export 形状は呼び出し側 (repositories/services/auth/seed) が
 * 参照しているため保つ。Proxy は初回利用時の遅延解決のためだけに使う
 * （バインディングは `configureDatabase()` で注入されるため、
 * モジュール評価時の即時生成はできない）。
 * 呼び出し側の D1 方言化は完了済みのため旧 postgres 互換層は持たない。
 * 生 SQL は参照系を `db.all`/`db.get`、書込系を `db.run` で実行し、
 * `db.run` の結果は `meta.changes` で更新件数を検証すること
 * （`db.all` での UPDATE/DELETE 実行は誤動作するため禁止）。
 */
export const db: AppDatabase = new Proxy({} as AppDatabase, {
  get(_target, prop) {
    const instance = getSharedDb()
    const value = Reflect.get(instance, prop) as unknown
    return typeof value === 'function' ? value.bind(instance) : value
  },
  // `get` のみだと `in` 演算子・`Object.keys`・分割代入等の存在確認が
  // 素の空オブジェクト側に落ちるため、共有インスタンスに委譲する。
  has(_target, prop) {
    return Reflect.has(getSharedDb(), prop)
  },
  getOwnPropertyDescriptor(_target, prop) {
    const descriptor = Reflect.getOwnPropertyDescriptor(getSharedDb(), prop)
    if (descriptor) {
      // Proxy ターゲットが extensible な空オブジェクトのため、不変条件を
      // 満たすよう configurable として報告する。
      descriptor.configurable = true
    }
    return descriptor
  },
  ownKeys(_target) {
    return Reflect.ownKeys(getSharedDb())
  },
})

export default db
