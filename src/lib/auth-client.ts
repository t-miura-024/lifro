import { createAuthClient } from 'better-auth/react'

/**
 * TanStack Start 側の better-auth クライアント正本。
 * 同一オリジンの `/api/auth`（`src/routes/api.auth.$.tsx`）を叩く。
 * Next 側は `next-auth/react` のまま温存し、M5 一括切替で統一する。
 * 利用点は本モジュール経由に統一する（`authClient.useSession` はそのまま、
 * ログイン／ログアウトは下記 facade を使う。コールバック方針変更時の
 * shotgun 編集を防ぐため callbackURL 類は本モジュールに集約する）。
 */
export const authClient = createAuthClient()

/** Google ログイン成功後の遷移先。 */
export const AUTH_CALLBACK_URL = '/'

/** 未招待アドレス拒否時の着地先（自前の日本語エラー画面）。 */
export const AUTH_ERROR_CALLBACK_URL = '/login?error=access_denied'

/** ログイン画面パス。 */
export const LOGIN_PATH = '/login'

/**
 * Google ログイン facade。callbackURL 類の集約点。
 * 招待拒否は Google 往復後のサーバ側コールバックで発生し、
 * `errorCallbackURL` へのリダイレクト（`?error=...` 付き）として表面化する。
 */
export function signInWithGoogle() {
  return authClient.signIn.social({
    provider: 'google',
    callbackURL: AUTH_CALLBACK_URL,
    // 未招待アドレスの拒否時は自前の日本語画面（`/login`）に着地させる。
    errorCallbackURL: AUTH_ERROR_CALLBACK_URL,
    newUserCallbackURL: AUTH_ERROR_CALLBACK_URL,
  })
}

/**
 * ログアウト facade。成功後はログイン画面へ遷移する。
 * 失敗は握り潰さず throw し、呼び出し元の catch（エラー表示・リトライ）に届ける。
 */
export function signOut(options?: { callbackUrl?: string }) {
  return authClient
    .signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = options?.callbackUrl ?? LOGIN_PATH
        },
        onError: (ctx) => {
          console.error(
            `[auth-client] signOut failed: ${String(ctx.error?.message ?? ctx.error ?? 'unknown error')}`,
          )
        },
      },
    })
    .then((result) => {
      // throw しない失敗形式（`{ error }` 解決）は throw に変換する。
      // onSuccess 不発＋非 throw 解決の沈黙（spinner 解除のみ）を防ぐ。
      const failure = (result as { error?: unknown } | null | undefined)?.error
      if (failure != null) {
        throw new Error(`[auth-client] signOut failed: ${JSON.stringify(failure)}`)
      }
      return result
    })
}
