import { ensureDatabase } from '@/routes/api/-db'
import { createFileRoute } from '@tanstack/react-router'

/**
 * Start 側 better-auth ハンドラ（ADR 0008）。
 * better-auth 既定の basePath `/api/auth` をそのまま使う。
 * Next 側 `src/app/api/auth/[...nextauth]/route.ts` は M5 一括切替まで温存し、
 * 本 file route とは排他（Next ビルド／Start ビルドで別々に束ねられる）。
 * better-auth のクライアント→サーバ通信は GET（セッション参照系）と
 * POST（サインイン／サインアウト等の状態変更系）のみを使うため、
 * 本 route の動詞は GET/POST に限定する。他動詞の `/api/auth/*` に対応する
 * oRPC route はなく、到達しても 404 になる同一契約。
 *
 * 遅延束ね: `@/auth` の静的 import は top-level requireEnv を評価し、
 * routeTree の一括 import 経由で `/api/health` まで巻き添えにするため、
 * 本モジュールの top-level では束ねず、リクエスト到達時に動的 import する。
 * 秘密欠落時は本 handler の catch で JSON 500 に正規化する（従前通り）。
 */
async function handleAuth(request: Request): Promise<Response> {
  // 同一の異常系契約: 例外は握り潰さず log＋JSON 500 に正規化する。
  // DB断・validate throw・secret 不備時の観測可能性を経路依存にしない。
  try {
    await ensureDatabase()
    const { auth } = await import('@/auth')
    return await auth.handler(request)
  } catch (error) {
    console.error('[start-auth] handleAuth failed', error)
    // `src/auth.ts` の before 側 throw（未招待・未検証の USER_NOT_ALLOWED）は
    // validate 側の制御応答（errorCallbackURL リダイレクト）と異常系契約が乖離し、
    // 素通しでは JSON 500 に正規化される（logic-1）。招待拒否を 500 と区別できる
    // よう 403 に正規化する。DB断・secret 不備等の未知例外は 500 のまま。
    if (error instanceof Error && error.message.includes('USER_NOT_ALLOWED')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => handleAuth(request),
      POST: ({ request }) => handleAuth(request),
    },
  },
})
