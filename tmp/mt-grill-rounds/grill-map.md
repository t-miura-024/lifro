# grill-map: Hono API の src/routes ファイルベース化

## Why（なぜ）
- 確定: 主目的は見通し改善。手段としてHono→oRPC一括置換＋全routesディレクトリ統一を含む

## What（何を決めるか）
- 確定: 粒度はエンドポイント別50+、`src/routes/api/`ディレクトリ配下、全体統一（画面含む）
- 確定: `api.health`・`api.auth`分離は維持（`api/health.tsx`・`api/auth/$.tsx`想定）
- 確定: ファイル命名規則はpath素直写し（R5-Q16=1）。例: `api/exercises/$id.tsx`・`api/logs/$date/memos.tsx`・`api/timers/sounds.tsx`
- 確定: 実行する（R5-Q18=1）。`tado-run`にてmt-plan-createで計画作成へ進む

## How（どう実現するか）
- 確定: Q7=3一括置換（Hono・`hono-app.ts`・`hono-client.ts`・`route-handlers.ts`・`_api`削除、oRPC全面化）
- 確定: Q11=1 routes同居（`api/<domain>/<name>.tsx`にprocedure＋server handler、集約routerが再export）
- 確定: Q12=1 4画面一括書換（互換レイヤーなし）
- 確定: Q13=1 oRPC middleware一本化（auth＋zod共通化、`HEALTH_PAYLOAD`正本維持）
- 確定: Q14=2 ビッグバン（単一変更で切替、splat保険なし）
- 確定: Q15=1 ADR更新を含む（0006撤回・0007全面化改訂）
- 確定: 動詞・互換はoRPC規約寄せ（R5-Q17=1）。query/mutation再分類、5動詞厳密互換は保たない、client同時書換

## 決定事項
- R1: Q1=1 / Q2=2 / Q3=1 / Q4=oRPC希望
- R2: Q5=2 / Q6=2（Q7に吸収廃止）
- R3: Q7=3 / Q9=2 / Q10廃止
- R4: Q11=1 / Q12=1 / Q13=1 / Q14=2 / Q15=1
- R5: Q16=1 / Q17=1 / Q18=1（実行確定）

## 未決定事項
- なし（フロンティア空。共通認識成立を確認済み）

## 保留事項
- なし
