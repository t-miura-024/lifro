import {
  configureDatabase,
  type D1Client,
} from '@/server/infrastructure/database/drizzle/client'

/**
 * D1 バインディング配線の共有ヘルパー (M1 スコープ・Issue #20)。
 *
 * 背景: `configureDatabase` がどこからも呼ばれず、repositories/services が参照する
 * 共有 `db` Proxy が初回利用時に throw へ直行していた (ai-2 must)。
 * 各 API ルート (`src/routes/api/**.tsx`) はリクエスト到達後に本ヘルパーを呼び、
 * `configureDatabase(env.DB)` で注入する。
 *
 * env 取得の作法: TanStack Start + @cloudflare/vite-plugin の公式手順
 * (developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start の
 * Bindings 節) 通り、`cloudflare:workers` の `env` から `DB` バインディングを読む
 * (wrangler.toml の [[d1_databases]] binding="DB" に対応)。
 * `cloudflare:workers` は workerd 専用モジュールのためトップレベルでは静的 import
 * せず、リクエスト到達時に動的 import する (`src/routes/api/auth/$.tsx` の
 * `@/auth` 遅延束ねと同型。routeTree の一括 import 経由で client バンドルへ
 * 巻き添えにしないため)。
 *
 * ファイル名の `-` prefix は TanStack Router の file-based routing 除外規約
 * (先頭 `-` はルート生成対象外) に従い、本モジュールがルート誤認されないためのもの。
 *
 * 展開手順 (新規 API ルート追加時):
 * 1. `import { ensureDatabase } from '@/routes/api/-db'` を追加する。
 * 2. 各 server handler の `try {` 直後に `await ensureDatabase()` を呼ぶ。
 *    (失敗時は throw → 既存 catch の JSON エラー正規化に乗る)
 * 例外: `/api/health` は DB 不使用の公開 health check であり、D1 欠落時も応答
 * できる独立性を保つため配線しない。
 *
 * 呼び忘れの検出 (自動テスト基盤がないための暫定手順):
 * - `db` 利用前に本ヘルパーを呼ばないと、初回クエリ時に database 層の
 *   fail-fast (`[database] D1 binding (DB) is not configured ...`) で落ちる。
 *   その場合は当該 handler 先頭の `await ensureDatabase()` 漏れを疑うこと。
 * - 目視検査の代替として、以下で `await ensureDatabase()` を持たないルートを
 *   列挙できる (`/api/health` のみ意図的に除外。コメント言及は除外のため
 *   `await` 付きで照合すること):
 *   `grep -rL 'await ensureDatabase()' src/routes/api --include='*.tsx'`
 *   自動テスト/lint による保証はテスト基盤整備後に行う。
 *
 * 全ルート一括の request middleware 化 (`__root.tsx` の `server.middleware` で
 * 親から継承) は、継承の実行時挙動が未検証のため採用しない。各ハンドラ先頭での
 * 明示呼び出しに寄せる。
 *
 * 集約方針 (意図的選択の記録・Issue #20):
 * - 本ヘルパーを `src/server/infrastructure/database/` 側へ移す案は採用しない。
 *   移すだけでは呼び出し側 (40弱のルート) の定型呼び出しは残り、配線知識の
 *   散在は解消しない。実質的な集約は上記 middleware 化しかない。
 * - middleware 化の条件: (1) `server.middleware` の継承挙動の実行時検証が済むこと、
 *   (2) `/api/health` (DB 不使用の公開 health check) の除外を middleware 側で
 *   表現できること。いずれも未検証のため、条件が満たされるまで現状の明示呼び出しを
 *   意図的選択とする。将来 middleware 化する場合は本ヘルパー呼び出しを
 *   middleware 内に移し、各ルートの呼び出しを削除すること。
 */
export async function ensureDatabase(): Promise<void> {
  let binding: D1Client | undefined
  try {
    // @ts-expect-error: 'cloudflare:workers' は workerd 専用モジュールであり、
    // bun/node 直下の tsc では型解決できない。実行時 (vite dev/preview・本番の
    // ssr 環境) は @cloudflare/vite-plugin が解決する。
    const { env } = await import('cloudflare:workers')
    binding = (env as { DB?: D1Client } | undefined)?.DB
  } catch (error) {
    throw new Error(
      '[database] `cloudflare:workers` の解決に失敗した。' +
        'workerd 外 (bun/node 直実行・workerd なし vitest) で API ルートが呼ばれた可能性がある。' +
        'vite dev/preview・本番の ssr 環境で実行すること。',
      { cause: error },
    )
  }
  // truthiness だけでなく D1 バインディングの最小形状（`prepare`/`batch` 関数）も
  // 確認する。誤配線で DB 以外の値が入っても ensure 通過後の初回クエリで破綻するため、
  // ここで誘導付き throw に倒す。
  if (!binding || typeof binding.prepare !== 'function' || typeof binding.batch !== 'function') {
    throw new Error(
      '[database] D1 binding (DB) is missing. ' +
        'wrangler.toml の [[d1_databases]] と tmp/cloudflare-manual-deploy-guide.md 手順2-1・手順3 を確認すること。' +
        "新規 API ルートでは `import { ensureDatabase } from '@/routes/api/-db'` を追加し、" +
        '各 server handler の先頭で `await ensureDatabase()` を呼ぶこと' +
        '(例外: DB 不使用の `/api/health` は呼ばない)。',
    )
  }
  configureDatabase(binding)
}
