# drizzle マイグレーション運用メモ（D1。ADR 0012）

マイグレーション実体は `drizzle/` 直下（`0000_*.sql` + `meta/_journal.json`）。
`drizzle.config.ts` は `dialect: 'sqlite'`。Postgres 時代の `0000`/`0001`
（Neon 用 DDL・DML）は D1 に適用できないため、同一の論理スキーマ
（14テーブル・23index・12FK・列名）を SQLite ベースライン `0000` として
再生成した。旧ファイルは git 履歴に残る。方言差の写像
（serial→INTEGER PK AUTOINCREMENT、timestamp→INTEGER(ms)、date→TEXT、
double precision→REAL、boolean→INTEGER、enum→TEXT）は本文・M2完了報告参照。

## D1（新規・空）に適用する

```sh
bunx wrangler d1 migrations apply lifro-db --remote
```

前提: `wrangler.toml` の `[[d1_databases]]`（M1申送り）で `lifro-db` が定義済みなこと。

## スキーマ変更時

```sh
bun run db:generate   # drizzle/ に新規マイグレーションを生成
bun run db:check      # スキーマとスナップショットの整合性確認
```

`db:migrate` / `db:pull` / `db:studio`（`package.json` 参照）は Neon 前提の
残骸のため D1 では使わない。リモート適用は上記 wrangler 経由が正手順。

## 既存データ（Neon）の引継ぎ

Neon 側の実データ移行はファイルベースのマイグレーションでは行わない。
手順（退避・投入・検証）は M4 のデプロイガイドに申送り。旧 `0001` に含まれた
データ移行 DML（`users`→`user` 複写・旧 `sessions` 削除）は Postgres 固有
（`lower()`/`split_part()`/`::text` 等）のため、そのまま D1 に流用しないこと。
