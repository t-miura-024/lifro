import { defineConfig } from 'drizzle-kit'

// DATABASE_URL未設定時も generate/check が動作するよう、dbCredentialsは条件付きで付与する。
// migrate/studioなど接続が必要なコマンドはdrizzle-kit側でURL不足エラーになる。
const databaseUrl = process.env.DATABASE_URL

export default defineConfig({
  schema: './src/server/infrastructure/database/drizzle/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
})
