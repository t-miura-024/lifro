import { createFileRoute } from '@tanstack/react-router'
import { healthResponse } from '@/server/api/health'
import type { AppType } from '@/server/api/hono-app'

/**
 * Hono 資産を温存した Start API file route。
 * 画面は `src/routes/**` の file routes、API は既存 Hono 合成 (`@/server/api/hono-app`
 * の共有ルート定義に Start 正本ミドルウェア＝better-auth 単経路を組み合わせた実体)
 * をそのまま `fetch` 直結でマウントする（ADR 0006 準拠）。
 * 本 route は legacy（`@/auth.legacy`・next-auth）を参照しないため、
 * Start ビルドに旧ランタイムは混入しない。
 * Hono は WinterCG fetch 互換のため `hono/vercel` のようなアダプタは不要。
 * これが Start/Vite 対応への交換にあたる。
 * Next 側 `src/app/api/[...route]/route.ts` は M5 一括切替まで温存し、同一ルート定義
 * に Next 温存ミドルウェアを組み合わせた別実体を使うため両経路の応答は一致する。
 * `/api/auth/*` は `src/routes/api.auth.$.tsx` が単独で担当し、本 route では扱わない。
 * `/api/health` は `src/routes/api.health.tsx` が単独で担当する（下記の遅延束ねと
 * 合わせ、秘密欠落時も死活監視は到達する。file route の precedence で静的
 * `/api/health` が splat `/api/$` より優先される）。
 *
 * 遅延束ね（logic-3/req-2）: `buildApp`＋`authMiddleware` の静的 import は
 * `@/auth` の top-level requireEnv（および drizzle client の DATABASE_URL 解決）を
 * モジュール評価時に引き起こし、routeTree の一括 import 経由で `/api/health`
 * 専用 route まで巻き添えにする。そのため本モジュールの top-level では束ねず、
 * リクエスト到達時に動的 import で組み立てる（初回のみ構築し使い回す）。
 * 応答契約・ミドルウェア構成は同一のため振る舞いは不変。
 */
let appPromise: Promise<AppType> | null = null
function getApp(): Promise<AppType> {
  if (appPromise === null) {
    appPromise = (async () => {
      try {
        const [{ buildApp }, { authMiddleware }] = await Promise.all([
          import('@/server/api/hono-app'),
          import('@/app/_lib/hono/middleware/auth'),
        ])
        return buildApp(authMiddleware)
      } catch (error) {
        // 拒否された promise をキャッシュしたままにしない。初回構築失敗
        // （動的 import・buildApp の一時的失敗）を残すと次回以降の全要求が
        // 同じ拒否を再利用して即 500 になり、要因解消後も回復しない。
        // キャッシュを破棄し次回再構築させる（logic-1）。
        appPromise = null
        throw error
      }
    })()
  }
  return appPromise
}
async function handleRequest(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url)
  // `/api/health` は専用 route `api.health.tsx` が担当する。splat 側への到達は
  // 配線異常の合図として warn のみ残し、重い Hono スタックには委譲せず軽量固定応答を
  // 即 return する。契約の正本は `@/server/api/health` の `HEALTH_PAYLOAD` であり、
  // 本早期 return も専用 route・Hono `/health` と同一ペイロードになる（ai-2）。
  // 秘密欠落時も死活監視は到達する（file route の precedence 崩壊時の保険）。
  if (pathname === '/api/health') {
    console.warn('[start-api] unexpected /api/health request; api.health.tsx should handle it')
    // Hono 正本（GET のみ）と一致させる。非 GET は 404 に落とす（req-2）。
    if (request.method !== 'GET') {
      return Response.json({ error: 'Not Found' }, { status: 404 })
    }
    return healthResponse()
  }
  // `/api/auth/*` は `src/routes/api.auth.$.tsx` が単独で担当する。到達は配線異常の
  // 合図として warn のみ残し、Hono 側に該当 route はないため 404 固定を即 return
  // する（`app.fetch` への委譲も 404 になるが、重いスタック起動を避ける）。
  if (pathname === '/api/auth' || pathname.startsWith('/api/auth/')) {
    console.warn('[start-api] unexpected /api/auth/* request; api.auth.$.tsx should handle it')
    return Response.json({ error: 'Not Found' }, { status: 404 })
  }
  try {
    const app = await getApp()
    return await app.fetch(request)
  } catch (error) {
    console.error('[start-api] handleRequest failed', error)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      // NOTE（F4）: GET/POST/PUT/PATCH/DELETE の5動詞は新規公開ではない。
      // 現行 Next 版 `src/app/api/[...route]/route.ts:11-15` が同一の5動詞 export
      // （GET/POST/PUT/DELETE/PATCH）であり parity。Hono 側の `_api` 群が扱う
      // 動詞範囲と一致させるための再現。動詞の追加・削除は Human 判断とする。
      GET: ({ request }) => handleRequest(request),
      POST: ({ request }) => handleRequest(request),
      PUT: ({ request }) => handleRequest(request),
      PATCH: ({ request }) => handleRequest(request),
      DELETE: ({ request }) => handleRequest(request),
    },
  },
})
