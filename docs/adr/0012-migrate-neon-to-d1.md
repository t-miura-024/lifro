# NeonからD1へ移行する

Neon/PostgresからD1へ移行することを決定した。温存の代替案を退け、無料枠運用とCloudflare一本化を優先した。差分なし移行が不可能なら計画を中断する。

## Context

完了条件2はテーブル・index・列定義の差分なし、データ欠損なしを要求する。Postgres固有SQL（`ILIKE`・`::cast`・`NOW()`・`EXTRACT`等）はD1/SQLite方言で実行時失敗するため、互換確保の可否判断が必要である。

## Decision

D1へ移行する。型写像はPostgres→SQLite/D1方言への変換を前提とし、差分なしが確認できない場合は強行せず計画を中断する。

## 中断条件の判定基準

- テーブル・index・列定義の突合: `drizzle/`のDDLとD1適用結果（`sqlite_master`目視）を突合し、差分があれば中断する。
- 型写像表への参照: Postgres型→SQLite型の写像で表現できない定義（値域制約・固有関数依存等）が残る場合は中断する。
- データ突合: Neon側とD1側のテーブルごと行数・代表行を突合し、差分が解消できなければ中断する。

## 責任者・検証手順

- 責任者: Human gate（AIは独断で本番データを触らない。D1差分なし可否の最終判断はHuman）。
- 検証手順: `tmp/cloudflare-manual-deploy-guide.md`手順3（D1作成・マイグレーション適用・`sqlite_master`目視）および手順4（Neon→D1データ移行・行数突合・中断条項）に対応する。合否記録は`docs/migration-checklist.md`で行う。
