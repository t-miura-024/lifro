# grill-map: Pageコンポーネントのroute側移行 + _componentsネスト廃止
# （別セッションが既定パスを使用中のため、本セッションの地図は本ファイルに記録）

## Why（なぜ）
- `src/components/` にPage本体が置かれ、`src/routes/` は薄いラッパになっている二重構造を解消したい
- `src/components/*/_components/` のネストをやめ、配置ルールを単純化したい
- 手本は `src/routes/login.tsx`（routeファイル内にUI実装を自己完結）

## 現状（事実・調査済み）
- route薄ラッパ6件: `_protected/exercises.tsx`, `logs.tsx`, `statistics.tsx`, `timers.tsx`, `settings.tsx`, `offline.tsx`
- Page本体: `ExercisesPage.tsx`(10行・委譲), `LogsPage.tsx`(288行), `StatisticsPage.tsx`(387行), `TimersPage.tsx`(10行・委譲), `settings-page.tsx`(105行), `OfflinePage.tsx`(44行)
- `_components` ネスト: `logs/`(2件), `statistics/`(10件), `timers/`(3件)。`exercises/` は同階層並置
- 共有・基盤層: `timer/`, `pwa/`, `protected-shell.tsx`, `providers.tsx`, `theme.ts` はPageではない
- `offline.tsx` のNext共有コメントの参照先 `src/app/` は存在せず死文化
- routes→pagesリネームは技術的には可能（`tanstackStart({ router: { routesDirectory } })` がschemaに存在）だが公式既定と乖離するため見送り

## 決定事項
- Q1=1: 6Pageすべて移行（exercises/logs/statistics/timers/settings/offline）
- Q2=1: route単体自己完結（login.tsx型）
- Q3=1: フラット並置（`_components/` 廃止・同一ファイルに統合）
- Q4=1: 基盤層は components 残留（Q5=1による自動確定）
- Q5=1: routes維持（pagesリネームなし）
- Q6=1: 肥大許容（400行級も単一ファイル、例外切り出しなし）
- Q7=1: offlineのNext共有コメント破棄・書き換え
- Q8=1: 一括移行＋検証＋掃除

## 実行結果（2026-09-05）
- 6 route単一ファイル化完了: exercises 935行・logs 1521行・statistics 1669行・timers 1021行・settings 110行・offline 43行
- 旧 `src/components/{exercises,logs,statistics,timers,offline}/`＋`settings-page.tsx` を `git rm` で削除。残留は protected-shell/providers/pwa/theme/timer のみ
- 検証: `tsc --noEmit` 通過、`biome lint/format` 通過（statisticsの`!`・`any` 4件は移行前から存在したため同ファイル内で型安全に修正）、`bun run build` 成功
- `@/components/{exercises,logs,statistics,timers,offline,settings-page}` 参照残存なし

## 注意（別作業との競合）
- 作業中に subagent が `git stash` を作成（`stash@{0}`）。別セッション由来と見られる `server/api/_api/*` 等の変更を含んでいたため、該当ファイルは working tree に復元済み。`stash@{0}` は未削除のまま残置（drop前に別作業の有無を確認すること）
- 本セッションの地図は既定パスが別セッション使用中のため本ファイルに記録。既定パスの `grill-map.md` には触れていない
