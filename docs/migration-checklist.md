# 移行同等性チェックリスト（AI草案・Human承認待ち）

Issue 19 TanStack Start 移行の完了条件 1〜5 に対応する行列チェックリスト。
方針（plan確定事項）: AIは草案作成まで。合否判定は Human のみが行う。
DB接続不可の環境ではDB要の行を「未実行」で明示的に残す。

## 判定ルール

- 結果欄は `合格` / `不合格` / `未実行` のいずれか。Human が記入する。
- 備考欄の `AI事前確認:` は executor がビルド・型・静的検証で確認した内容であり、合否判定ではない。
- `不合格` が1行でもあれば切戻し条件（完了条件6）に該当する。手順は `docs/migration-cutover.md` を参照。

## R: ルート（完了条件1）

| ID | ルート | 主要操作・確認内容 | 期待結果（現行同等） | 結果 | 備考 |
|----|--------|-------------------|---------------------|------|------|
| R-1 | `/` | アクセス時の遷移 | `/logs` へリダイレクトされる | 未実行 | AI事前確認: `src/routes/index.tsx` が `beforeLoad` で `/logs` へ redirect（ルータネイティブ遷移）。型・ビルド合格 |
| R-2 | `/login` | ログインページ表示、Googleログインボタン表示 | 未ログインで誘導される現行と同文言・同導線 | 未実行 | DB要（認証フローC-1と一体確認） |
| R-3 | `/exercises` | 種目一覧表示、種目追加・編集・削除、部位編集、並び替え | 現行と同表示・同操作ができる | 未実行 | DB要のため未実行 |
| R-4 | `/logs` | 月ナビゲーション・記録一覧表示、日別記録の入力（セット追加）・メモ保存・削除 | 現行と同表示・同操作ができる | 未実行 | DB要のため未実行 |
| R-5 | `/timers` | タイマー一覧表示、タイマー追加・編集・削除、並び替え、音声再生 | 現行と同表示・同操作・同音声ができる | 未実行 | DB要のため未実行（音声はP-6と一体確認可） |
| R-6 | `/settings` | 設定表示、ログアウト | ログアウト後に `/login` へ遷移する | 未実行 | DB要（セッション）のため未実行 |
| R-7 | `/statistics` | サマリー・ボリューム・重量・継続タブの表示、グラフ描画 | 現行と同表示・同数値になる | 未実行 | DB要のため未実行 |
| R-8 | `/offline` | オフライン時フォールバック表示、「再読み込み」ボタン | 接続なしでオフライン画面が出る | 未実行 | AI事前確認: `src/routes/offline.tsx` 存在・ビルド合格。ブラウザでのオフライン再現はHuman確認 |
| R-9 | `/manifest.webmanifest` | マニフェスト取得 | 現行 `src/app/manifest.ts` と同内容のJSONが返る | 未実行 | AI事前確認: `public/manifest.webmanifest` を作成し name/short_name/description/start_url/display/colors/orientation/icons/screenshots が一致することを目視確認済み。HTTP応答はHuman確認 |

## A: API 5系統（完了条件2）

Start側 `src/routes/api.$.tsx` と Next側 `src/app/api/[...route]/route.ts` は同一 Hono `app`（`src/server/api/hono-app.ts`）を共有するため、応答一致は構造的に担保される。以下は実応答の同等確認行。

| ID | 系統 | 確認内容 | 期待結果 | 結果 | 備考 |
|----|------|---------|---------|------|------|
| A-1 | exercises | 一覧・検索・作成・更新・削除・部位・並び替え | 現行と同応答 | 未実行 | DB要のため未実行 |
| A-2 | trainings | 一覧・日別取得・upsert・削除・メモ取得/保存・履歴系 | 現行と同応答 | 未実行 | DB要のため未実行 |
| A-3 | statistics | getSummary含む集計系の応答 | 現行と同応答 | 未実行 | DB要のため未実行。oRPC試験導入は本計画の完了判断外（コード内にoRPC資産なしを確認済み） |
| A-4 | timers | 一覧・取得・作成・更新・削除・並び替え・音声マニフェスト | 現行と同応答 | 未実行 | DB要のため未実行 |
| A-5 | health | `GET /api/health` | `{ status: 'ok' }` が返る | 未実行 | DB不要のためHumanが起動確認時に実施可能 |

## C: 認証フロー（完了条件3・M4）

| ID | 確認内容 | 期待結果 | 結果 | 備考 |
|----|---------|---------|------|------|
| C-1 | Googleログイン | DBセッションでログインできる（初回は再ログイン移行） | 未実行 | DB・OAuth要のため未実行。M4のbetter-auth載せ替え前提 |
| C-2 | 未ログインアクセス | `/login` へ誘導される | 未実行 | DB・OAuth要のため未実行 |
| C-3 | 招待制振る舞い（小文字・大小文字混じりの両アドレスで新旧一致を確認） | 既存emailのみ許可される。大小文字混じりの旧行（例: `Foo@Ex.com` の既存ユーザ）は小文字アドレスでのログインが新旧ともに許可となり、lower正規化後の一致として振る舞いが等しい | 未実行 | DB要のため未実行。小文字アドレスのみの確認では合格にしないこと。未検証旧行（`email_verified=false` 相当）の扱いの差分あり: 現行 `signIn` は存在＋provider のみで verified を見ないが、新 `validateUserInfo`・`before` は未検証を一律拒否する。本差分はコード厳格化として維持し、Human 承認を得ること |
| C-4 | ログアウト | セッション破棄後に `/login` へ遷移する | 未実行 | DB要のため未実行 |

## P: PWA（完了条件4・M5）

| ID | 観点 | 確認内容 | 期待結果（現行同等） | 結果 | 備考 |
|----|------|---------|---------------------|------|------|
| P-1 | インストール | `beforeinstallprompt` による追加プロンプト表示・追加・7日間非表示 | 現行 `InstallPrompt` と同挙動 | 未実行 | AI事前確認: `src/components/pwa/InstallPrompt.tsx`・`src/hooks/usePwaInstall.ts` はフレームワーク非依存の共有資産であり Start側 `src/components/providers.tsx` に配線済み。`'use client'` 指示子はVite下で無害な文字列のため除去不要。型・ビルド合格。実機のプロンプト発火はHuman確認 |
| P-2 | マニフェスト | インストール要件（icons・start_url・display等）を満たす | Lighthouse PWA等の判定が現行同等 | 未実行 | AI事前確認: R-9と同一ファイル。HTTP応答・判定はHuman確認 |
| P-3 | SW登録 | 本番ビルドで `/sw.js` が登録される | DevTools ApplicationにSWが登録される | 未実行 | AI事前確認: Start専用 `src/components/pwa/SwRegister.tsx` を `src/components/providers.tsx` に配線。本番のみ登録、開発時は `vite.config.mts` の `disable` と二重ガード。型・ビルド合格。ブラウザ確認はHuman |
| P-4 | オフライン表示 | オフラインで文書ナビゲーション時に `/offline` フォールバックが出る | 現行と同画面が出る | 未実行 | AI事前確認: `src/sw.ts` の fallbacks 設定はNext版から逐語継承、`/offline` ルート存在。ブラウザ再現はHuman確認 |
| P-5 | precache | アプリシェル・静的資産が precache される | 現行と同範囲が precache される | 未実行 | AI事前確認: `bun run build:start` で49エントリ生成（`_next` URLなし、manifest.webmanifest・sounds・icons・screenshots含む、sw.js自己参照なし）。ブラウザでのキャッシュ中身はHuman確認 |
| P-6 | キャッシュ戦略 | navigate=SWR、ログ詳細・メモGET=NetworkOnly、その他API GET=SWR、静的=CacheFirst、Google Fonts=CacheFirst | 現行 `src/app/sw.ts` と同一戦略 | 未実行 | AI事前確認: `src/sw.ts` はNext版からの移動のみで中身不変。生成SW内に pages-cache/api-cache/static-assets-cache/google-fonts-cache と trainings 日別matcherを確認済み。実通信での挙動はHuman確認 |

## 完了条件対応表

| 完了条件 | 対応行 | 状態 |
|----------|--------|------|
| 1（8ルート同等） | R-1〜R-9 | 未実行（R-1・R-8・R-9はAI事前確認済み） |
| 2（API 5系統同等） | A-1〜A-5 | 未実行 |
| 3（Googleログイン同等） | C-1〜C-4 | 未実行（M4範囲） |
| 4（PWA同等） | P-1〜P-6 | 未実行（全行AI事前確認済み） |
| 5（全行合格・結果確認） | 本書全体 | Human承認・合否待ち |
| 6（無停止・データ互換） | `docs/migration-cutover.md` | 手順書作成済み、発動判断はHuman |
| 7（対象外の不実施） | A-3備考（oRPC対象外確認済み） | AI確認済み（oRPC資産なし・DB/キャッシュ層はM5無変更） |
