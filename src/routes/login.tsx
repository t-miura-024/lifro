import { signInWithGoogle } from '@/lib/auth-client'
import GoogleIcon from '@mui/icons-material/Google'
import { Alert, Box, Button, Container, Stack, Typography } from '@mui/material'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

/**
 * `/login`。認証は better-auth（`src/routes/api.auth.$.tsx`）経由の Google ログインを使う。
 */
export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { error?: string } => ({
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  component: StartLogin,
})

function StartLogin() {
  const { error: searchError } = Route.useSearch()
  const [failed, setFailed] = useState(false)
  const [pending, setPending] = useState(false)
  // 招待拒否は Google 往復後のサーバ側コールバックで発生し、errorCallbackURL への
  // リダイレクト（?error=... 付き）として表面化する。同期的戻り値だけでは検出
  // できないため、クエリのエラーコードでも Alert を表示する。
  // 招待拒否コード（`@/lib/auth-client` の AUTH_ERROR_CALLBACK_URL 由来）のみ
  // 招待文言にし、空・未知コードは汎用文言に分岐する（logic-1）。全コード一括の
  // 招待文言では OAuth キャンセル・サーバ500等の真因が隠れるため。
  const isInviteDenied = searchError === 'access_denied'
  const showInviteError = isInviteDenied
  const showGenericError = failed || (searchError != null && !isInviteDenied)

  const handleLogin = async () => {
    setFailed(false)
    setPending(true)
    try {
      // コールバック方針は `@/lib/auth-client` の facade に集約している。
      const res = await signInWithGoogle()
      if (res?.error) setFailed(true)
    } catch (error) {
      console.error('[login] signInWithGoogle failed', error)
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box
        minHeight="100dvh"
        display="grid"
        sx={{
          placeItems: 'center',
          paddingBottom: 16, // iOS下部安全領域 + 親指リーチ
          paddingTop: 8,
        }}
      >
        <Stack spacing={3} alignItems="center" sx={{ width: '100%' }}>
          <Typography variant="h5" fontWeight={700} align="center">
            ようこそ
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Google アカウントでログインして、筋トレを簡単に記録しましょう。
          </Typography>
          {showInviteError && (
            <Alert severity="error" sx={{ width: '100%' }}>
              ログインできませんでした。招待済みアカウントか確認してください。
            </Alert>
          )}
          {showGenericError && (
            <Alert severity="error" sx={{ width: '100%' }}>
              ログイン中にエラーが発生しました。再試行してください。
            </Alert>
          )}
          <Button
            type="button"
            variant="contained"
            color="primary"
            startIcon={<GoogleIcon />}
            onClick={handleLogin}
            disabled={pending}
            sx={{ textTransform: 'none', fontWeight: 700, width: '100%' }}
            size="large"
          >
            Google でログイン
          </Button>
        </Stack>
      </Box>
    </Container>
  )
}
