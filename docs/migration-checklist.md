# 移行同等性チェックリスト Cloudflare 版（AI 草案・Human 承認待ち）

Issue #20 Cloudflare 移行の完了条件 1〜5・9 に対応する行列チェックリスト。
前回（Issue 19）の同等性粒度（8ルート＋API 5系統＋認証＋PWA）を基準に Cloudflare 版として再定義した。
方針: AI は草案作成まで。合否判定は Human のみが行う（完了条件 9 の手動スモーク合否は Human）。

## 判定ルール

- 結果欄は `合格` / `不合格` / `未実行` のいずれか。Human が記入する。
- 備考欄の `AI事前確認:` は executor がビルド・型・静的検証で確認した内容であり、合否判定ではない。
- `不合格` が1行でもあれば切替後の復旧手順に入る。手順は `docs/migration-cutover.md` を参照。
- DB 要の行は本番 D1・データ移行（`tmp/cloudflare-manual-deploy-guide.md` 手順 3・4）完了後に確認する。
- 既知の残存リスク: 実 `database_id` 未発行（プレースホルダのまま。ガイド手順 2-1・3）、
  OAuth コールバック手動登録（ガイド手順 7）、4 secret 手動登録（ガイド手順 5）。
  なお repositories・StatisticsService の Postgres 固有 SQL は D1 方言化済みであり
  （ガイド手順 2-3）、adapter provider は `src/auth.ts` の `drizzleAdapter(db, { provider: 'sqlite', ... })`（キー `provider: 'sqlite'`）で適用済み、
  `[[d1_databases]]` 定義は `wrangler.toml` 22-25行（`[[d1_databases]]`〜`database_id =`）に適用済み、
  `/.wrangler/` は `.gitignore` 46-47行に適用済みのため残存リスクから除外する。
  これら未適用の状態での DB 要行の失敗は環境不備であり、アプリの `不合格` と区別して備考に記録する。

## R: ルート（完了条件 1・8ルート）

| ID | ルート | 主要操作・確認内容 | 期待結果（現行同等） | 結果 | 備考（Human 記入） |
|----|--------|-------------------|---------------------|------|-------------------|
| R-1 | `/` | アクセス時の遷移 | `/logs` へリダイレクトされる | 未実行 | AI事前確認: `src/routes/_protected/index.tsx` の遷移設定。workers.dev での実遷移は Human 確認 |
| R-2 | `/login` | ログインページ表示、Google ログインボタン表示 | 未ログインで誘導される現行と同文言・同導線 | 未実行 | DB・OAuth 要（C-1 と一体確認） |
| R-3 | `/exercises` | 種目一覧表示、種目追加・編集・削除、部位編集、並び替え | 現行と同表示・同操作ができる | 未実行 | DB 要（D1 方言化済み。手順 8 での再確認のみ。ガイド手順 2-3） |
| R-4 | `/logs` | 月ナビゲーション・記録一覧表示、日別記録の入力（セット追加）・メモ保存・削除 | 現行と同表示・同操作ができる | 未実行 | DB 要（D1 方言化済み。再確認のみ） |
| R-5 | `/timers` | タイマー一覧表示、タイマー追加・編集・削除、並び替え、音声再生 | 現行と同表示・同操作・同音声ができる | 未実行 | DB 要（D1 方言化済み。再確認のみ。音声は P-6 と一体確認可） |
| R-6 | `/settings` | 設定表示、ログアウト | ログアウト後に `/login` へ遷移する | 未実行 | DB 要（セッション） |
| R-7 | `/statistics` | サマリー・ボリューム・重量・継続タブの表示、グラフ描画 | 現行と同表示・同数値になる | 未実行 | DB 要（D1 方言化済み。再確認のみ） |
| R-8 | `/offline` | オフライン時フォールバック表示、「再読み込み」ボタン | 接続なしでオフライン画面が出る | 未実行 | AI事前確認: `src/routes/offline.tsx` 存在・ビルド合格。ブラウザでのオフライン再現は Human 確認 |
| R-9 | `/manifest.webmanifest` | マニフェスト取得 | `public/manifest.webmanifest` と同内容の JSON が返る | 未実行 | AI事前確認: name/short_name/description/start_url/display/colors/orientation/icons/screenshots 存在。HTTP 応答は Human 確認 |

## A: API 5系統（完了条件 1・oRPC 4系統＋health）

oRPC 集約 router（`src/server/orpc/router.ts`）の 4系統＋公開 health の実応答確認行。
旧 Hono 命名の `trainings` は現行 oRPC 命名の `logs` に読み替える。

| ID | 系統 | 確認内容 | 期待結果 | 結果 | 備考（Human 記入） |
|----|------|---------|---------|------|-------------------|
| A-1 | exercises | 一覧・検索・作成・更新・削除・部位・並び替え | 現行と同応答 | 未実行 | DB 要（D1 方言化済み。再確認のみ） |
| A-2 | logs | 一覧・日別取得・upsert・削除・メモ取得/保存・履歴系 | 現行と同応答 | 未実行 | DB 要（D1 方言化済み。再確認のみ） |
| A-3 | statistics | getSummary 含む集計系の応答 | 現行と同応答・同数値 | 未実行 | DB 要（D1 方言化済み。再確認のみ） |
| A-4 | timers | 一覧・取得・作成・更新・削除・並び替え・音声マニフェスト | 現行と同応答 | 未実行 | DB 要（D1 方言化済み。再確認のみ） |
| A-5 | health | `GET /api/health` | `{ status: 'ok' }` が返る | 未実行 | DB・秘密不要のため最初に実施可能（ガイド手順 6） |

## C: 認証フロー（完了条件 4・workers.dev コールバック）

コールバック URL 正本: `https://<worker>.workers.dev/api/auth/callback/google`
（Google Cloud Console への手動追加・4 secret の手動登録が前提。ガイド手順 5・7）。
既存セッションは引き継がれず全員再ログイン方針。

| ID | 確認内容 | 期待結果 | 結果 | 備考（Human 記入） |
|----|---------|---------|------|-------------------|
| C-1 | Google ログイン | DB セッションでログインできる（初回は再ログイン移行） | 未実行 | DB・OAuth 要 |
| C-2 | 未ログインアクセス | `/login` へ誘導される | 未実行 | DB・OAuth 要 |
| C-3 | 招待制振る舞い（小文字・大小文字混じりの両アドレスで新旧一致を確認） | 既存 email のみ許可される。大小文字混じりの旧行は lower 正規化後の一致として振る舞いが等しい | 未実行 | DB 要。小文字のみの確認では合格にしないこと |
| C-4 | ログアウト | セッション破棄後に `/login` へ遷移する | 未実行 | DB 要 |

## P: PWA（完了条件 5・無料枠内）

| ID | 観点 | 確認内容 | 期待結果（現行同等） | 結果 | 備考（Human 記入） |
|----|------|---------|---------------------|------|-------------------|
| P-1 | インストール | `beforeinstallprompt` による追加プロンプト表示・追加 | 現行と同挙動 | 未実行 | 実機のプロンプト発火は Human 確認 |
| P-2 | マニフェスト | インストール要件（icons・start_url・display 等）を満たす | Lighthouse PWA 等の判定が現行同等 | 未実行 | R-9 と同一ファイル。HTTP 応答・判定は Human 確認 |
| P-3 | SW 登録 | 本番ビルドで `/sw.js` が登録される | DevTools Application に SW が登録される | 未実行 | AI事前確認: `dist/client/sw.js` 生成済み・本番のみ登録。ブラウザ確認は Human |
| P-4 | オフライン表示 | オフラインで文書ナビゲーション時に `/offline` フォールバックが出る | 現行と同画面が出る | 未実行 | AI事前確認: `src/sw.ts` の fallbacks 設定・`/offline` ルート存在。ブラウザ再現は Human 確認 |
| P-5 | precache | アプリシェル・静的資産が precache される | 現行と同範囲が precache される | 未実行 | AI事前確認: icons・screenshots・sounds・manifest が `dist/client` に存在。ブラウザでの中身は Human 確認 |
| P-6 | キャッシュ戦略 | navigate=SWR、ログ詳細・メモ GET=NetworkOnly、その他 API GET=SWR、静的=CacheFirst、Google Fonts=CacheFirst | 現行 `src/sw.ts` と同一戦略 | 未実行 | AI事前確認: `src/sw.ts` の runtimeCaching 不変。実通信での挙動は Human 確認 |

## 完了条件対応表（Issue #20）

| 完了条件 | 対応行 | 状態 |
|----------|--------|------|
| 1（workers.dev で 8ルート・API・PWA が現行同等） | R-1〜R-9・A-1〜A-5・P-1〜P-6 | 未実行 |
| 2（D1 差分なし移行） | A-1〜A-4・R-3〜R-5・R-7（DB 要行の応答・数値一致）＋ガイド手順 4 の行数突合 | 未実行（Human gate） |
| 3（Workers Cache 置換・TTL 互換） | A-1〜A-4 の再読込応答（キャッシュ経由でも同値） | 未実行。注: scan・deleteByPrefix は best-effort（他 isolate 書込分は TTL 失効で消える） |
| 4（Google OAuth が workers.dev コールバックで動作） | C-1〜C-4 | 未実行 |
| 5（PWA 現行同等・静的資産が無料枠内） | P-1〜P-6 | 未実行（M1 dry-run 5.3MB は枠内） |
| 6（Vercel/Neon/Upstash 依存ゼロ・旧資産解約） | ガイド手順 9。`public/vercel.svg` 除去済み・ランタイム参照ゼロを確認済み | 未実行（切替後 Human 実行） |
| 7（無料枠ガード・課金なし） | ガイド手順 10（上限見通し・検知→停止・縮退→手動復旧） | 手順書作成済み、発動判断は Human |
| 8（手動作業が第三者再現可能） | `tmp/cloudflare-manual-deploy-guide.md` | 本書と対で作成済み |
| 9（型・ビルド合格＋手動スモーク） | 型・ビルドは Wave 1 実績（dry-run 合格）。手動スモーク合否は本書全体 | Human 承認・合否待ち |
