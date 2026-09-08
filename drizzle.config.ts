import { defineConfig } from 'drizzle-kit'

// D1/SQLite（ADR 0012）。`generate`/`check` は接続不要のため dbCredentials は付けない。
// リモート D1 への適用は wrangler 経由（M4 ガイド・M1 の [[d1_databases]] 申送り参照）。
// drizzle-kit の d1-http 経由を使う場合は別途 accountId/databaseId/token が必要だが、
// 本リポジトリの正手順は wrangler のため config には持たせない。
export default defineConfig({
  schema: './src/server/infrastructure/database/drizzle/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
})
