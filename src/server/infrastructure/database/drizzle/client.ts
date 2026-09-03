import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const globalForDrizzle = globalThis as {
  drizzleClient?: ReturnType<typeof postgres>
  db?: ReturnType<typeof createDb>
}

function createDb(client: ReturnType<typeof postgres>) {
  return drizzle(client, { schema })
}

/**
 * DATABASE_URL解決ヘルパー。
 * 意図: next build時（NEXT_PHASE=phase-production-build）はモジュール評価のみで
 * クエリを発行しないためダミーURLでの生成を許容する。一方ランタイム・開発時は
 * 未設定なら即座に失敗させる（接続先の取り違え防止）。現状維持のため遅延化などの
 * 大改修はしない。
 */
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (url) return url
  // next build (NEXT_PHASE=phase-production-build) はモジュール評価のみでクエリを発行しないため、
  // ダミーURLでの生成を許容する。postgres-js は遅延接続のため接続は発生しない。
  // ランタイム・開発時は未設定なら即座に失敗させる（接続先の取り違え防止）。
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return 'postgres://localhost:5432/postgres'
  }
  throw new Error('DATABASE_URL is not set')
}

function getClient(): ReturnType<typeof postgres> {
  if (!globalForDrizzle.drizzleClient) {
    // DATABASE_URLはNeonプーラー経由（README「Neon 利用時のポイント」参照）。
    // プーラー配下ではプロセス側のコネクションを絞るのが定石のため max:1 を維持する。
    // findByMonth等のPromise.all並列クエリはキューイングで直列化されるが、結果の等価性は保たれる。
    globalForDrizzle.drizzleClient = postgres(getDatabaseUrl(), { max: 1 })
  }
  return globalForDrizzle.drizzleClient
}

export const db = globalForDrizzle.db ?? createDb(getClient())

/** seed等のスクリプト終了時に接続を明示的に閉じる */
export async function closeDb(): Promise<void> {
  await globalForDrizzle.drizzleClient?.end()
}

if (process.env.NODE_ENV !== 'production') {
  globalForDrizzle.db = db
}

export default db
