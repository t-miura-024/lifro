# Cloudflare 手動デプロイガイド（Issue #20・初回〜切替の通し手順）

Issue #20「諸々をVercel系からCloudflare系に移行する」の手動作業を第三者が再現できる粒度で記した通し手順書。
完了条件 8（初回〜切替の手動作業が第三者再現可能）に対応する。

前提: 未公開・開発中・個人用のためダウンタイム・切戻し温存は考慮不要。旧資産は切替と同時に解約・削除する。
公開は `workers.dev` のみ。カスタムドメインなし。環境分離なし（本番のみ）。

関連: `docs/migration-checklist.md`（同等性確認）・`docs/migration-cutover.md`（切替・復旧手順）。
ADR: `docs/adr/0011-adopt-cloudflare-workers-for-hosting.md` /
`docs/adr/0012-migrate-neon-to-d1.md` / `docs/adr/0013-replace-upstash-with-workers-cache.md`。

## 0. 全体像と所要物

作業順序:

1. Cloudflare ログイン（手順 1）
2. 残存コード作業の適用（手順 2。Wave 1 申送り分）
3. D1 作成・マイグレーション適用（手順 3）
4. データ移行 Neon→D1（手順 4。Human gate）
5. secret 登録（手順 5）
6. ビルド・デプロイ（手順 6）
7. Google OAuth 更新（手順 7）
8. 動作確認（手順 8。合否は Human）
9. 旧資産解約（手順 9）
10. 無料枠ガード・運用開始（手順 10）

所要物: Cloudflare アカウント、Neon 接続情報（データ移行時のみ）、Google Cloud Console 編集権限。

用語 `<worker>` は以降すべて `wrangler.toml` の `name`（現行 `lifro`）で決まる
`https://lifro.<subdomain>.workers.dev` のホスト部分を指す。`lifro` を変えたら読み替える。

## 1. Cloudflare ログイン

```bash
bunx wrangler login
```

ブラウザで Cloudflare アカウントを許可する。CI ではなく手元実行のため OAuth ログインでよい。
確認:

```bash
bunx wrangler whoami
```

アカウント情報が出れば合格。`wrangler.toml` は `name = "lifro"`・本番のみ（dev/preview なし）。

## 2. 残存コード作業の適用（Wave 1 申送り分）

M4 スコープではコードに触れないため、以下は Human または後続タスクが適用する。
いずれも適用後に手順 6 のビルド・dry-run で検証する。

### 2-1. `wrangler.toml` の `database_id` プレースホルダを置換する（定義自体は適用済み）

`[[d1_databases]]` 定義自体は `wrangler.toml` 22-25行（`[[d1_databases]]`〜`database_id =`）に適用済みのため追記しない。
重複追加すると TOML の重複定義になりデプロイ検証を壊す。残作業は
`database_id` プレースホルダの置換のみである。
`src/server/infrastructure/database/drizzle/client.ts` は `env.DB` を要求するため、
手順 3 で発行される実 `database_id` への置換がないと本番の初回クエリで
`[database] D1 binding (DB) is not configured.` になる。
手順 3 で発行された IDを `wrangler.toml` 25行目の `database_id` の値に転記する:

```toml
[[d1_databases]]
binding = "DB"
database_name = "lifro"
database_id = "<手順3で発行されたID>"
```

`database_id`はプレースホルダであり、`bunx wrangler d1 create lifro`（要Cloudflareログイン＝Human作業）で発行された実IDへの置換が必要である。

### 2-2. `src/auth.ts` の adapter provider（適用済みのためスキップ）

`src/auth.ts` の `drizzleAdapter(db, { provider: 'sqlite', ... })`（キー `provider: 'sqlite'`）は適用済みのため作業不要・スキップする。
D1（SQLite 系）で better-auth のマイグレーション差異を出さないための1行であり、変更済みである。

### 2-3. Postgres 固有 SQL の D1 方言化（適用済み。手順 8 での再確認のみ）

`src/server/infrastructure/repositories/drizzle/*` と `StatisticsService` の
Postgres 固有 SQL は D1 方言化済みである（`ILIKE`→`LIKE`・`::cast`→`CAST`・
`NOW()`→D1 時刻・`EXTRACT`→`strftime`・`UPDATE..FROM(VALUES)`→CASE 式・
`db.execute`→参照系 `db.all`/`db.get`・書込系 `db.run`）。
`grep` で `ILIKE`・`to_char`・`EXTRACT`・`NOW()`・`::cast` の残存なしを確認済み
（`.returning()`・`.defaultNow()` は drizzle 抽象であり D1 対応）。
手順 8 のチェックリスト（特に A-1〜A-4・R-3〜R-5・R-7）では再確認のみ行い、
失敗時はまず環境不備（手順 2-1・手順 3 の `database_id` 未置換等）を疑うこと。

### 2-4. `.gitignore` の `/.wrangler/`（適用済みのためスキップ）

`.gitignore` 46-47行に `/.wrangler/` を追加済みのため作業不要・スキップする。
追記すると重複・表記揺れを招く。

### 2-5. `package.json` の `postgres` 依存と README の旧記述（承知事項）

- `postgres` 直接依存は除去済み（`grep '"postgres"' package.json` で一致なしを確認。
  ランタイム import はゼロでコメント言及のみ）。`bun.lock`・`node_modules` には
  `drizzle-orm` の optional peer 由来で `postgres` が残る場合があるが、直接依存ではない。
- `README.md`・`.env.example` の Upstash・Neon・Vercel 記述は未更新。切替完了後に別途更新する。
- 旧 `drizzle/0001` の DML は Postgres 固有で D1 に流用不可。新規 D1 用マイグレーションは手順 3 で作る。

## 3. D1 作成・マイグレーション適用

```bash
# D1 データベース作成
bunx wrangler d1 create lifro
```

出力の `database_id` を手順 2-1 の `wrangler.toml` に転記する。

マイグレーション適用は wrangler 経由を正手順とする
（`drizzle.config.ts` のコメント参照。`drizzle-kit` の d1-http 直適用は使わない）。
現行 `drizzle/0000_goofy_nick_fury.sql` は sqlite 方言の DDL であり D1 適用可能。
ローカル確認:

```bash
# ローカル D1 で適用確認
bunx wrangler d1 migrations apply lifro --local
# または drizzle-kit generate/check（接続不要）
bunx drizzle-kit check
```

リモート適用:

```bash
bunx wrangler d1 migrations apply lifro --remote
```

適用後にテーブル・index・列定義が `drizzle/` と一致することを目視する:

```bash
bunx wrangler d1 execute lifro --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

## 4. データ移行 Neon→D1（Human gate）

完了条件 2（差分なし移行。互換確保が不可能な場合は計画を中断し強行しない）の実証は Human gate。
AI が独断で本番データを触らないこと。

推奨手順（Human 実行）:

1. Neon 側の行数を控える（テーブルごと `SELECT count(*)`）。
2. Neon からエクスポートする（`pg_dump --data-only --inserts` 等。Postgres 固有 DML は使わない）。
3. SQLite/D1 方言に直して D1 へ投入する（`bunx wrangler d1 execute lifro --remote --file <file>.sql` を分割実行。
   大きいファイルは `--batch` または分割投入）。
4. D1 側の行数・代表行を Neon 側と突合し、差分なしを Human が宣言する。
5. 差分が解消できない場合は切替を中断する（強行しない）。

注意: 旧 `drizzle/0001`（削除済み）の DML は Postgres 固有で流用不可（手順 2-5 参照）。

## 5. secret 登録

本番の実体は wrangler secret 前提（`src/auth.ts` の `requireEnv`／`resolveAuthURL` コメント参照）。
4 件すべて手動登録する:

```bash
bunx wrangler secret put BETTER_AUTH_SECRET
bunx wrangler secret put GOOGLE_CLIENT_ID
bunx wrangler secret put GOOGLE_CLIENT_SECRET
bunx wrangler secret put BETTER_AUTH_URL
```

- `BETTER_AUTH_URL` の値は `https://<worker>.workers.dev`（末尾スラッシュなし）。
  未設定だと OAuth コールバックが workers.dev 由来に固定されず、ローカル互換動作になる。
- Cache API（Upstash 置換先）は認証情報を要さず secret 不要。
- 登録確認: `bunx wrangler secret list` で4件の名前が出ること（値は表示されない）。

## 6. ビルド・デプロイ

```bash
# 本番ビルド（M1 実績: 合格。dry-run で 63ファイル/5.3MB）
bun run build

# 実 workers.dev への初回デプロイ前の最終確認（M1 実績: dry-run 合格）
bunx wrangler deploy --dry-run

# デプロイ（要 Cloudflare ログイン。M1 時点では未実行）
bunx wrangler deploy
```

出力の `https://<worker>.workers.dev` を控え、以降の手順で使う。
初回デプロイ直後は `/api/health` で疎通する:

```bash
curl -s https://<worker>.workers.dev/api/health
# 期待値: {"status":"ok"}
```

`{ status: 'ok' }` 以外・到達不能なら手順 8 に進まず原因切り分けする
（secret 欠落時は `/api/health` 自体は到達する設計のため、失敗は Hosting 層の問題）。

## 7. Google OAuth 更新（手動・Human gate）

1. Google Cloud Console → 対象 OAuth クライアント →「承認済みのリダイレクト URI」に追加する:
   `https://<worker>.workers.dev/api/auth/callback/google`
2. 既存の旧コールバック URI は切替完了まで残す（切戻し不要方針だが、切替検証中の旧経路確認用）。
3. workers.dev で招待済みアドレスの Google ログインができることを確認する
   （既存セッションは引き継がれない。全員再ログイン方針）。
4. 未招待アドレスが拒否されることを確認する（チェックリスト C-3 参照）。

## 8. 動作確認（合否は Human）

`docs/migration-checklist.md` の全行（R/A/C/P）を上から順に確認し、結果欄に記入する。
完了条件 9 の手動スモーク合否は Human が行う（AI の事前確認は合否ではない）。

最低限の導線（全行実施が原則だが、時間がない場合の順序）:

1. A-5（health）→ Hosting 疎通
2. C-1・C-2（ログイン・未ログイン誘導）→ 認証基盤
3. R-1〜R-8（8ルート巡回）
4. A-1〜A-4（API 4系統。D1 方言化済みのため手順 2-3 の観点で再確認のみ）
5. P-1〜P-6（PWA。DevTools Application パネルで SW・manifest・precache を見る）

`不合格` が1行でもあれば `docs/migration-cutover.md` の復旧手順に入り、再切替しない。

## 9. 旧資産解約（切替と同時・Human 実行）

方針: 未公開・個人用のため旧資産は切替と同時に解約・削除してよい（完了条件 6）。
全行合格後に以下を実行する:

1. Vercel プロジェクトの削除（Hosting 旧資産）。
2. Neon プロジェクトの削除（手順 4 の突合完了が前提。削除前に最終エクスポートを保管する）。
3. Upstash Redis の削除（Cache 旧資産。Cache API に認証情報・残務なし）。
4. Google Cloud Console の旧リダイレクト URI 削除（手順 7 で残した旧 URI）。
5. `public/vercel.svg`・`package.json` の `postgres` 直接依存は除去済み（手順 2-5 参照）。
   README の旧記述更新は別途判断。

## 10. 無料枠ガード・運用手順（完了条件 7）

### 10-1. 課金が発生しない根拠

- 本移行の課金要素は Workers＋D1＋Cache API のみ（KV・R2・有料アドオン不使用）。
  Cache API に追加課金なし。Upstash・Neon の従量課金は手順 9 で消滅する。
- 課金を発生させない方法: **Cloudflare アカウントを Free プランに留め、
  支払い方法を登録しない（Paid プランへ上げない）**。
  Free プランのまま上限を超えた場合、請求ではなくリクエストのエラー・スロットルになる。
- ダッシュボード（Workers & Pages → 対象 Worker → Metrics、D1 → 対象 DB → Metrics）で
  使用量を目視できることを初回に確認する。以降の数値の正本はダッシュボードとする
  （本書の数値は目安であり、上限改定時はダッシュボード表示を優先する）。

### 10-2. 上限見通し（目安・個人用）

| 対象 | 無料枠の目安 | 本アプリの見通し | 余裕 |
|------|-------------|-----------------|------|
| Workers リクエスト | 10万/日 | 個人用のため数百/日以下 | 十分 |
| Workers CPU | 10ms/リクエスト | 通常の DB 参照・描画のみ | 十分 |
| D1 読取行数 | 500万行/日 | 個人の記録参照のみ | 十分 |
| D1 書込行数 | 10万行/日 | 個人の記録入力のみ | 十分 |
| D1 ストレージ | GB 級 | 個人の記録データのみ | 十分 |
| Static Assets | 数MB（icons 約0.6MB・screenshots 約4MB・sounds 約0.4MB） | M1 dry-run 5.3MB | 枠内 |
| Cache API | 追加課金なし | TTL 失効で自然消滅 | 枠内 |

### 10-3. 超過時の検知→停止・縮退→手動復旧

超過時は停止・縮退を許容し、課金を発生させない（方針確定事項）。

1. 検知: ダッシュボード Metrics の使用量急増、または `workers.dev` の 5xx・応答劣化・
   D1 エラーで検知する。障害かなと思ったらまず Metrics を見る。
2. 停止・縮退: 課金回避のため **Paid 化しない**。縮退の選択肢は以下（Human 判断）:
   - 一時的にアクセスを止める（利用者＝自分のため告知不要。必要なら Worker を無効化）。
   - Cache TTL を短くして D1 読取を減らす方向ではなく、負荷源の特定操作を控える。
   - PWA の precache・静的資産は従量対象が小さいため通常は触らない。
3. 手動復旧: 使用量が日次リセット後に回復したことを Metrics で確認し、
   `/api/health` → ログイン → 主要導線の順に再確認する（チェックリストの A-5→C→R 順）。
   原因が不明なまま再発するようなら上限見直し・利用形態の見直しを Human が判断する。

## 11. トラブルシューティング

| 症状 | 原因候補 | 対処 |
|------|---------|------|
| `[database] D1 binding (DB) is not configured.` | `database_id` 未置換（定義自体は `wrangler.toml` 22-25行の `[[d1_databases]]`〜`database_id =` に適用済み） | 手順 2-1 |
| ログイン後に 500・`USER_NOT_ALLOWED` の誤判定 | セッション旧残存等（provider は `src/auth.ts` の `provider: 'sqlite'` で適用済み） | 全員再ログイン |
| OAuth リダイレクト不一致 | Console 未追加・`BETTER_AUTH_URL` 未設定 | 手順 7・手順 5 |
| 一覧・統計が 500（D1 実行時失敗） | `database_id` 未置換・データ移行不備（Postgres 固有 SQL は D1 方言化済み。手順 2-3） | 手順 2-1・手順 3・手順 4 の順に切り分け（強行しない） |
| キャッシュが効かない・消えない | 非 Workers 環境 / 他 isolate 書込分 | 仕様（best-effort。TTL 失効で消える） |
| `/api/health` 不到達 | Hosting 層・デプロイ失敗 | 手順 6 の dry-run・ログ確認 |
| `.wrangler/` が差分に混ざる | （`.gitignore` 46-47行に適用済みのため通常発生しない） | 手順 2-4 |
