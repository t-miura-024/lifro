# 切替・切戻し・データ保護手順書

Issue 19 TanStack Start 移行の一括切替手順書（plan確定事項: 一括同等移行、旧新並存・段階リリースなし）。
切戻し発動の最終判断とチェックリストの合否判定は Human が行う。

## 1. 前提

- M1〜M4完了の上にM5（PWA・チェックリスト・本書）を適用する。
- DB・キャッシュ層（Drizzle/Neon/Upstash）は変更しない。M5での変更なし。
- oRPC本格導入なし（試験対象 `statistics/getSummary` は完了判断外。コード内にoRPC資産なしを確認済み）。
- `src/app/**`（現行Next）は切替完了まで削除しない。`next.config.ts` も切替完了まで残置する。

## 2. 事前条件（すべて満たしてから切替に入る）

1. `bunx tsc --noEmit` 合格。
2. `bun run build:start` 合格。`dist/client/sw.js` が生成され、precacheに `sw.js` 自己参照・`_next` URLが含まれないこと。
3. DB・Neon・Upstash への疎通があり、バックアップ取得手順が実行可能であること。
4. 本チェックリスト（`docs/migration-checklist.md`）が Human 承認済みであること。
5. 現行（旧）ビルドの再デプロイ手段（切戻し用）が手元にあること。

## 3. 切替手順（一括切替）

1. 稼働中DBのバックアップを取得する（手順5参照）。適用前に下記の事前検出クエリを実行し、1 行でも返れば独断で適用せず Human 判断を仰ぐ（M5/M6 の verified 包括・verified 必須の意図的設計に伴う適用前ゲート。コード側の厳格化: 移行SQLの `email_verified=true` 複写と `src/auth.ts` の verified 必須はセキュリティ優先で維持する）。
  ```sql
  -- 大文字混じり行の検出（移行SQLは lower 正規化＋最古優先で複写するため、
  -- 重複がなければ機械的に解決されるが、想定外混入の可能性を Human が確認する。
  -- 大文字小文字違いの重複がある場合は移行SQL内の適用前必須ゲートが abort する）
  SELECT id, email FROM users WHERE email <> lower(email);
  -- Google 外経路疑い行の検出（旧 users 行は Google プロバイダ経由でのみ作成される前提。
  -- Google 紐付けのない行は未検証アドレス由来の疑いがあり、移行後の verified 必須で
  -- ログイン不可となる。存在時は Human 判断で名寄せ・招待整理してから適用する）
  SELECT u.id, u.email FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM accounts a WHERE a.user_id = u.id AND a.provider = 'google');
  ```
  続けて適用直前に退避テーブルを作成する（書込を静止させた状態で実行すること。新規ログイン等の書込があると移行SQLの集合一致ガードが abort する）。
  ```sql
  DROP TABLE IF EXISTS sessions_backup;
  CREATE TABLE sessions_backup AS TABLE sessions;
  SELECT count(*) FROM sessions_backup; -- 控え。移行SQLのガードが集合一致を検証する
  ```
  手順2の移行SQLは本退避がない限り旧 `sessions` 削除の直前で abort する（機械的必須ゲート。退避なしの適用禁止）。内容不一致で abort した場合は退避を取り直して再適用する（ガード以前の文はすべて冪等）。
2. M4の移行SQL `drizzle/0001_better_auth.sql` を適用する。内容は新テーブル `user` / `session` / `account` / `verification` の作成と、`users`→`user` の初回複写（`ON CONFLICT DO NOTHING` で再適用時は既存行を温存し、切替後の正規値を旧値で上書きしない）および旧 `sessions` 行の削除である。旧 `sessions` 削除の根拠: 漏洩済み旧セッション cookie の残存利用を断つため（全員再ログイン方針と整合。再実行は 0 行で冪等）。削除時期は意図的に移行時（チェックリスト前）に置く。確定後に分離するとチェックリスト不合格→切戻しの筋書きで漏洩済み旧セッションが復活するため（logic-3 への回答。判断根拠の全文は同SQLの `DELETE FROM "sessions"` 直前コメント参照）。旧 `users` / `accounts` 行は切戻し用に温存する。既存セッションは引き継がれず全員再ログインとなる（grill Q1確定事項。利用告知が必要なら事前に行う）。
3. 環境変数を確認する。`BETTER_AUTH_SECRET`・`GOOGLE_CLIENT_ID`・`GOOGLE_CLIENT_SECRET` は必須（Start 正本は初回利用時に throw。`NEXTAUTH_SECRET` へのフォールバックなし）。旧 `NEXTAUTH_*`・`GOOGLE_*` は Next 温存期間の legacy 経路（`@/auth.legacy`）のみに使い、Start 正本には使わない。Next 温存ビルドは `BETTER_AUTH_*` なしで起動する（`@/auth` を評価しない）。
4. `bun run build:start` で Start 本番ビルドを生成する（音声マニフェスト生成→`vite build`→SW生成まで一括）。
5. 生成物を本番へデプロイし、旧ビルドと置き換える（旧新並存なし）。
6. `docs/migration-checklist.md` の全行を上から順に確認し、結果を記入する（DB要の行を含む）。
7. 全行合格なら移行完了。`src/app/**`・`next.config.ts` の除去は別途判断する（手順6参照）。

## 4. 切戻し条件・手順（完了条件6）

### 発動条件（いずれか1つでも該当したら即時切戻し。最終判断はHuman）

- チェックリストに `不合格` が1行でも出た。
- DB差分（想定外のテーブル・列・index差分、データ欠損・破損の兆候）を検出した。
- 稼働停止・ログイン不能・データ記録不能など重大な利用阻害が発生した。

### 手順

1. デプロイを切戻し用の旧ビルド（本手順書手順2の適用前ビルド）に戻す。
2. DBは `0001` が旧テーブル（`users` / `accounts`）温存の非破壊移行であり旧テーブルが残るため、原則としてDBの戻しは不要。ただし `0001` は「追加のみ」ではない。旧 `sessions` 行の DELETE（手順3参照）は破壊的であり、切戻し後に旧セッションは復活しない。切戻し後は全員再ログイン必須となる（利用告知が必要なら事前に行う）。旧セッション行自体の復旧が必要な場合（DB差分検出時の復旧等）は `sessions_backup` 退避テーブルからの復旧を Human 判断で行う（`INSERT INTO sessions SELECT * FROM sessions_backup;`。漏洩済みセッションも復活するため、復旧後は速やかに再切替または全セッション失効の方針を Human が決める。独断で進めず Human 判断を仰ぐ）。手順4発動条件の「DB差分検出」時はバックアップからの復旧を検討し、独断で進めず Human 判断を仰ぐ。
3. 旧ビルドでログイン・主要導線が復旧したことを確認する。
4. 原因を特定するまで再切替しない。

## 5. データ保護

- DB・キャッシュ層のスキーマ・データ互換を壊す変更は本移行に含めない（M5無変更。M4の `0001` は旧テーブル温存だが「追加のみ」ではない。旧 `sessions` 行の DELETE は破壊的であり、切戻し後は旧セッションが復活しないため全員再ログイン必須）。
- 切替前のバックアップ取得を必須とする（事前条件3）。
- 切替後にDB差分検出のための目視・ツール確認を行い、差分があれば即時切戻し（手順4）。
- Upstash（キャッシュ）側のキー・TTL・運用は変更しない。
- 残余リスクの定期検出（email 大小文字重複）: DB 側の式強制（`UNIQUE(lower(email))`・CITEXT・`CHECK(email = lower(email))`）は better-auth 既定スキーマとの差分になるため見送り。代わりに下記クエリを定期的に実行し、1 行でも返れば Human 判断で名寄せする（移行SQLの適用前必須ゲートと同一条件）。
  ```sql
  SELECT lower(email), count(*) FROM users GROUP BY 1 HAVING count(*) > 1;
  SELECT lower(email), count(*) FROM "user" GROUP BY 1 HAVING count(*) > 1;
  ```

## 6. `next.config.ts` 除去判断（一括切替時）

- `next.config.ts`（`@serwist/next` 設定含む）は現行Nextを壊さないため切替完了まで残置する。
- 除去は切替完了（チェックリスト全行合格）確定後に行い、除去時に `src/app/sw.ts` 由来の設定が Start 側（`vite.config.mts` の Serwist 合成）に一本化されていることを確認する。
- 切戻し可能性が残る間は除去しない。除去判断自体も Human 承認とする。

## 8. Next/Start 境界の統合先（暫定 import の切替時タスク）

- Start routes の Next 直接 import 解消（arch-1。M5 切替時タスク）。`src/routes/exercises.tsx` を起点に、`logs`・`timers`・`statistics`・`offline` の4ルートも同一パターンで移設済み: ページ本体を framework 非依存の純粋UI層（`src/components/<route>/`。Hono クライアントは型のみ `@/server/api/hono-app` の `AppType` を参照する `@/lib/hono-client` 経由）に移設し、Next 側 page と Start 側 route の双方が純粋層を参照する。TimerContext 正本も `src/components/timer/TimerContext.tsx` に移設済み（Next 側 `src/app/providers/TimerContext.tsx` は薄い再 export）。残りの `src/app` 依存（`providers.tsx` の theme、`protected-shell.tsx` の TimerOverlay 等）は下記個別項目で断つ。
- Start `/settings` は better-auth 対応の専用ページ（`src/components/settings-page.tsx` の `StartSettingsPage`）に切替済み。`next-auth/react` の `useSession`/`signOut` 参照を `@/lib/auth-client` の `authClient`／facade 経由に繋ぎ替えた。旧ページ本体（`src/app` 配下）は未編集のまま温存し、M5 一括切替で Next 版ごと削除する。
- navItems 共有化（E4）: `src/components/protected-shell.tsx` と Next 版 `src/app/(protected)/_components/ProtectedShell.tsx` の navItems＋レイアウト本体の逐語複写を、framework 非依存の共有コンポーネントに切り出す。M5 切替時に実施し、暫定コメント（`protected-shell.tsx` 先頭 NOTE）を除去する。
- Hono `_api` 移設先（G2）: `src/server/api/hono-app.ts` が middleware と約40の `_api` を `src/app/**` から直接 import している暫定依存を断つ。移設先は `src/server/api/_api/` 配下（ドメイン系統ごとに `exercises/`・`trainings/`・`statistics/`・`timers/` を移設し、`@/app/...` import を `@/server/api/_api/...` に付け替え）に集約し、`hono-app.ts` 先頭の暫定コメントを除去する。`src/app` 除去と同時に実施する。
- TimerProvider/theme 移設先: `src/components/providers.tsx` が `src/app` 配下から静的 import している暫定依存のうち、TimerProvider 正本は `src/components/timer/TimerContext.tsx` への移設済み（`src/app/providers/TimerContext.tsx` は薄い再 export のため Next 温存期間の既存 import は動作する）。残る `providers.tsx` の `@/app/theme`→`src/components/theme.ts` 付け替えと暫定コメント除去は、`src/app` 除去と同時に実施する。
- TimerOverlay 移設先: `src/components/protected-shell.tsx` が `src/app` 配下から静的 import している暫定依存（`@/(protected)/_components/TimerOverlay`、`@/app/providers/TimerContext` の useTimerStatus）を断つ。移設先は `src/components/timer/TimerOverlay.tsx`（TimerContext と同居。内部の `@/app/providers/TimerContext` import も `@/components/timer/TimerContext` に付け替え）に集約し、`protected-shell.tsx` 先頭の暫定コメントを除去する。`src/app` 除去と同時に実施する。
- `/health` 分離（G3）: `/health` を約40モジュールの eager import と同一バンドルから切り離し、軽量な専用 file route（例: `src/routes/api.health.tsx`）に分離するか `_api` 群を lazy 化する。上記 `_api` 移設と同時に実施し、配線の二重化を避ける。
- サーバ検証への格上げ（ai-4）: `src/components/protected-shell.tsx` の暫定クライアントゲート（better-auth セッション検証＋未認証時 `/login` リダイレクト＋未確定間の描画抑止）を、file route の beforeLoad/loader によるサーバ検証に格上げする。同コメントの約束の追跡先は本項目とする。格上げまでは現行クライアントゲートを暫定仕様とし、恒久化しない。

## 9. ビルド関連の根拠記録

- `vite.config.mts` の自前 Serwist buildPlugin は `@serwist/vite` 9.5.0 既定（`node_modules/@serwist/vite/dist/index.js` の `buildPlugin`、条件 `!ctx.viteConfig.build.ssr && !ctx.options.disable`、`enforce: 'post'`）を起点とし、Start の2回 closeBundle に対する重複抑止のみを `generated` フラグ一本に集約している。除去条件・スキップ時警告ログは同ファイルのコメント参照。

## 7. 完了宣言条件

- チェックリスト全行 `合格` かつDB差分なしをもって移行完了とする（完了条件5・6）。
- 完了後、`src/app/**` 削除と `next.config.ts` 除去を別タスクとして判断する（本移行の範囲外）。
