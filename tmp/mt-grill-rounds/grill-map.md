# grill-map: TanStack Start ファイルベースルーティング対応

## 1. 背景・Why（確定）
- 開発体験の維持：置き場所で URL が決まる分かりやすさを TanStack でも保ちたい（Round 1 Q2=1）

## 2. 現状事実（調査済み）
- `src/routes/` が存在し `__root.tsx`, `index.tsx`, `exercises.tsx`, `login.tsx`, `logs.tsx`, `offline.tsx`, `settings.tsx`, `statistics.tsx`, `timers.tsx`, `api.$.tsx`, `api.health.tsx`, `api.auth.$.tsx` を配置済み
- `src/routeTree.gen.ts` は TanStack Router プラグインによる自動生成物（`src/router.tsx` のコメントに `src/routes/**` から自動生成と明記）
- `vite.config.mts` で `tanstackStart()` プラグイン使用中
- すなわち TanStack 標準の意味では **すでにファイルベースルーティング**である（当初の「ではなくなった」は Next App Router 形式 `page.tsx`/`layout.tsx` の喪失を指すことを確認）
- 一方 `src/app/` も残存（`(protected)/`, `(public)/login`, `api/[...route]`, `api/auth/[...nextauth]`, `offline/`, `providers/`, `layout.tsx`, `manifest.ts`, `theme.ts`）。`package.json` は `next dev`/`next build` と `vite build` の二重構成
- 各 Start ルートは `@/components/**/XxxPage` という framework 非依存 UI 層への薄いラッパ
- `docs/migration-cutover.md` 手順8に Next 直接 import 解消の切替時タスクが残存：`api.$.tsx:35` の `@/app/_lib/hono/middleware/auth` 動的 import、`providers.tsx` の `@/app/theme`、`protected-shell.tsx` の TimerOverlay/TimerContext 系、`hono-app.ts` の約40 `_api` の `@/app` 直接 import、`src/app/providers/TimerContext.tsx` は薄い再 export 済み
- `(protected)/layout.tsx` 由来の ProtectedShell は現状 layout route ではなく各 route 内のラッパコンポーネントとして再現されている

## 3. What（確定）
- TanStack 標準で十分（`src/routes` を整理・活用する）。Next 形式 `page.tsx` の再現はしない（Round 1 Q1=1）
- Next.js 共存をやめ Start に一本化し `src/app` を削除する（Round 1 Q3=1）。`docs/migration-cutover.md` 手順7「完了後、`src/app/**` 削除と `next.config.ts` 除去を別タスクとして判断」は本対応に前倒しで取り込む形になる

## 4. How（確定）
- Q4=1: 残タスク解消と同時に一括削除する（`api.$.tsx:35` の auth ミドルウェア、`providers.tsx` の theme、`protected-shell` の TimerOverlay 系、`hono-app.ts` の約40 `_api`、`next.config.ts` 除去を含む）
- Q5=2: layout route に集約する（pathless layout で URL 不変。公式 routing/file-based-routing 確認済み）
- Q6=1: 型＋ビルド＋主要導線の手動スモーク
- Q7=1: 保護5（exercises・logs・statistics・timers・settings）＋`/` を配下にし login・offline・api 系は外す
- Q8=2: beforeLoad/loader によるサーバ検証に格上げする（ai-4 を今回実施）
- Q9=1: ディレクトリ方式 `src/routes/_protected/route.tsx`＋配下6ファイル
- Q10=1: E2 維持（未認証→`/login`、障害→エラー表示＋リトライ）

## 5. 決定事項
- Round 1: Q1=1（TanStack 標準）、Q2=1（DX 維持）、Q3=1（Start 一本化・`src/app` 削除）
- Round 2: Q4=1（一括削除）、Q5=2（layout 集約）、Q6=1（型＋ビルド＋手動スモーク）
- Round 3: Q7=1（保護5＋`/` を配下）、Q8=2（サーバ検証に格上げ）
- Round 4: Q9=1（`_protected/` ディレクトリ方式）、Q10=1（E2 維持）

## 6. 未決定・保留事項
- なし（フロンティア空・実行完了）
- 検証: `tsc` 合格、`vite build` 合格（client＋ssr、sw.js 生成・`_next` 混入なし）、dev 目視（`/api/health` 200・`/login` 200・保護 route は E2 エラー画面を確認。DB 環境変数なしのためセッション検証自体は未達）
- 残課題（本対応の範囲外）: 本番サーブ方法の確定（現 `start` は `vite preview` の仮置き。nitro/node 等のアダプタ選定は別途）、DB 接続あり環境での手動スモーク（ログイン→各導線）
- `routeTree.gen.ts` は自動生成維持（手動編集しない）を前提とし、変更が必要なら別途申告
