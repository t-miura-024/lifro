# 切替・復旧手順書 Cloudflare 版（Issue #20）

Issue #20 Cloudflare 移行の一括切替手順書（方針: 一括同等移行・純粋移行・差分なし。旧新並存・段階リリースなし）。
前提: 未公開・開発中・個人用のためダウンタイム・切戻し温存は考慮不要。旧資産は切替と同時に解約・削除する。
チェックリストの合否・D1 差分なし可否・無料枠超過時の停止判断・旧資産の解約実行は Human が行う。

## 1. 前提

- Wave 1（M1 Hosting・M2 DB・M3 Cache/Auth/Env）完了の上に本書を適用する。
- workers.dev 公開・本番のみ（dev/preview なし）・カスタムドメインなし。
- 旧資産（Vercel/Neon/Upstash）は切替と同時に解約・削除してよい（完了条件 6）。
- 完全無料枠内を最優先し、上限を超える設計は採用しない。超過時は停止・縮退＋手動復旧（完了条件 7）。

## 2. R/A/C/P 行列の Cloudflare 版再定義（前回粒度の継承）

前回（Issue 19）の同等性粒度（8ルート＋API 5系統＋認証＋PWA）を Cloudflare 版として再定義した。
確認結果の記録先は `docs/migration-checklist.md`（結果欄は Human 記入）。

| 行列 | 前回（Issue 19） | Cloudflare 版（Issue #20）の再定義 | 確認結果 |
|------|-----------------|-----------------------------------|---------|
| R（8ルート） | `/`・`/login`・`/exercises`・`/logs`・`/timers`・`/settings`・`/statistics`・`/offline`＋manifest | 同一8ルートを `workers.dev` で確認。`/manifest.webmanifest` 行（R-9）を維持 | チェックリスト R-1〜R-9 参照 |
| A（API 5系統） | exercises・trainings・statistics・timers・health（Hono 共有のため構造担保） | oRPC 4系統 exercises・logs・statistics・timers＋health。旧 `trainings` は `logs` に読替。D1 上での実応答確認が本体 | チェックリスト A-1〜A-5 参照 |
| C（認証） | Google ログイン・未ログイン誘導・招待制・ログアウト | 同一4行を workers.dev コールバック（`/api/auth/callback/google`）で確認。全員再ログイン方針 | チェックリスト C-1〜C-4 参照 |
| P（PWA） | インストール・マニフェスト・SW登録・オフライン・precache・戦略 | 同一6行を Static Assets 配信＋`dist/client/sw.js` で確認。静的資産は無料枠内（M1 dry-run 5.3MB） | チェックリスト P-1〜P-6 参照 |

## 3. 事前条件（すべて満たしてから切替に入る）

1. ガイド（`tmp/cloudflare-manual-deploy-guide.md`）手順 2-1 の `database_id` 置換が済んでいること
  （`[[d1_databases]]` 定義自体は `wrangler.toml` 21-24行に適用済み、adapter provider は
  `src/auth.ts` 138行で `'sqlite'` 適用済み、`/.wrangler/` は `.gitignore` 46-47行に適用済み）。
2. `bun run build` 合格・`bunx wrangler deploy --dry-run` 合格。
3. D1 作成・マイグレーション適用・データ移行の行数突合が Human 承認済みであること（ガイド手順 3・4）。
4. 4 secret の登録が済んでいること（ガイド手順 5）。
5. Google Cloud Console に workers.dev コールバックが追加されていること（ガイド手順 7）。
6. Neon 側の最終エクスポートを保管していること（旧資産解約前の保険）。

## 4. 切替手順（一括切替）

1. `bunx wrangler deploy` で本番デプロイする（旧新並存なし）。
2. `GET https://<worker>.workers.dev/api/health` が `{ status: 'ok' }` を返すことを確認する。
3. 招待済みアドレスで Google ログインし、未ログイン誘導・ログアウトを確認する（C-1・C-2・C-4）。
4. `docs/migration-checklist.md` の全行を上から順に確認し、結果を記入する（R→A→C→P）。
5. 全行合格なら移行完了。ガイド手順 9（旧資産解約）に進む。
6. `不合格` が1行でも出たら手順 5（復旧）に入り、原因特定まで再切替・解約を進めない。

## 5. 復旧手順

切戻し温存は不要（未公開・個人用のため）のため、復旧は「直す・戻す・止める」の3択を Human が選ぶ。

### 5-1. アプリ不具合（チェックリスト不合格・D1 実行時失敗等）

- 露見点の切り分け: `database_id` 未置換等の環境不備か、
  Postgres 固有 SQL の残存かをガイド手順 11 で切り分ける
  （`[[d1_databases]]` 定義・adapter provider・gitignore はいずれもコードに適用済みのため
  「未定義・未変更」は環境不備の候補から除外する）。
- 環境不備なら修正して再デプロイする（`bunx wrangler deploy` は冪等）。
- D1 互換の不足なら強行せず計画中断を検討する（完了条件 2 の中断条項）。
- 直前のデプロイに戻す場合は `bunx wrangler rollback`（またはダッシュボードの Deployments から
  対象バージョンの Rollback）を使う。

### 5-2. データ不整合（行数差分・欠損の兆候）

- 独断で進めず Human 判断を仰ぐ。Neon 削除前であれば Neon 側エクスポートと突合し、
  D1 へ再投入する（ガイド手順 4）。
- Neon 削除後に発覚した場合は保管済みの最終エクスポートから復旧する。
- 差分が解消できない場合は切替を中断する（強行しない）。

### 5-3. 無料枠超過（検知→停止・縮退→手動復旧。完了条件 7）

1. 検知: ダッシュボード Metrics の使用量急増、または 5xx・応答劣化・D1 エラー。
2. 停止・縮退: **Paid 化しない**（課金回避が最優先）。必要なら Worker を無効化して停止する。
3. 手動復旧: 日次リセット後に Metrics の回復を確認し、
   `/api/health` → ログイン → 主要導線の順に再確認する。
   再発するようなら上限見直し・利用形態の見直しを Human が判断する。

## 6. 旧資産解約（切替と同時・Human 実行）

チェックリスト全行合格後に実行する（詳細はガイド手順 9）:

1. Vercel プロジェクト削除。
2. Neon プロジェクト削除（最終エクスポート保管が前提）。
3. Upstash Redis 削除。
4. Google Cloud Console の旧リダイレクト URI 削除。

## 7. 完了宣言条件

- チェックリスト全行 `合格` かつ D1 差分なし（Human 承認）をもって移行完了とする。
- `package.json` の `postgres` 直接依存は除去済み（`grep '"postgres"' package.json` で一致なしを確認。
  `bun.lock` に残る `postgres` は `drizzle-orm` の optional peer 由来のみ）。
  README の旧記述更新は完了後に別途判断する（ガイド手順 2-5。本移行の範囲外）。
