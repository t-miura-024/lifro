# drizzle マイグレーション運用メモ

マイグレーション実体は `drizzle/` 直下（`0000_*.sql` + `meta/_journal.json`）。
履歴テーブルはデフォルトの `drizzle.__drizzle_migrations(id, hash, created_at)` を使う
（`drizzle.config.ts` で `migrations.table/schema` を指定していないため）。

## 新規DB（空のDB）に適用する

```sh
DATABASE_URL=postgres://... bun run db:migrate
```

`drizzle-kit migrate` が履歴テーブルを自動作成し、`0000` から順に適用する。

## 既存DB（Prisma 管理だった Neon DB）に適用する

本番 Neon DB には Prisma の 9 マイグレーション適用済みのテーブル群が存在する。
そのまま `bun run db:migrate` を実行すると、初期マイグレーション `0000` が
`CREATE TABLE` を再実行して失敗する（履歴テーブルが空のため未適用と判定される）。

drizzle の適用判定は「履歴テーブルの最新1行の `created_at` < journal の `when` なら適用」なので、
既存スキーマと等価な `0000` を「適用済み」としてマーキングする（ベースライン）。
`0000` は Prisma 最終状態から `db:pull` → `db:generate` した差分なしスナップショットのため、
中身の実行は不要でマーキングのみでよい。

前提: 既存DBのスキーマが `0000_fuzzy_typhoid_mary.sql` と等価なこと。
疑わしい場合は先にステージングDBで `db:migrate` → アプリ疎通を確認する。

```sh
# 1. hash と when を手元で取得（hash = マイグレーションSQL全文の sha256）
shasum -a 256 drizzle/0000_fuzzy_typhoid_mary.sql
# => 620901192dd1e431737ac6265a1d92a180ef7c13e14dc44042b014cabea04d92
```

```sql
-- 2. 既存DB上で履歴テーブルを用意し、0000 を適用済みとして記録する
CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash TEXT NOT NULL,
  created_at BIGINT
);
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('620901192dd1e431737ac6265a1d92a180ef7c13e14dc44042b014cabea04d92', 1788432944505);
```

`when`（`created_at` に入れる値）は `drizzle/meta/_journal.json` の該当 entry の `when` を使う。
SQL ファイルを再生成したら hash と when は変わるため、その都度読み替えること。

```sh
# 3. 以降は通常どおり。新規マイグレーション（0001〜）のみ適用される
DATABASE_URL=postgres://... bun run db:migrate
```

なお Prisma の `_prisma_migrations` テーブルは drizzle の動作に影響しないため残してよい。
9 migrations の内容は `0000` に折り込み済みのため、既存DBへの再適用は不要。
