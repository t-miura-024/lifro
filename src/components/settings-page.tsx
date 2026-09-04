import { authClient, signOut } from '@/lib/auth-client'
import EmailIcon from '@mui/icons-material/Email'
import InfoIcon from '@mui/icons-material/Info'
import LogoutIcon from '@mui/icons-material/Logout'
import {
  Avatar,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useState } from 'react'

/**
 * TanStack Start 用 Settings ページ（正本は better-auth 経路）。
 * Next 版 `src/app/(protected)/settings/page.tsx`（`SettingsPage`）からの差分は
 * `next-auth/react` の `useSession`／`signOut` を `@/lib/auth-client` の
 * `authClient.useSession`／`signOut` facade に置換した点のみ。表示・文言・遷移先
 * （ログアウト後は `/login`）は Next 版と同等。
 * Start の Providers には `SessionProvider` が存在しないため、旧 `SettingsPage` を
 * そのまま使うとセッションは永久に null・ログアウトは 404 化する。
 * 旧ページ本体（`src/app` 配下）は編集しない。M5 一括切替で Next 版ごと削除する。
 */
export default function StartSettingsPage() {
  const { data: session } = authClient.useSession()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setLogoutError(null)
    try {
      // facade が成功後に既定（`/login`）へ遷移させる。遷移先の集約点は facade 側。
      await signOut()
    } catch (error) {
      console.error('[settings] signOut failed', error)
      setLogoutError('ログアウトに失敗しました。再試行してください。')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const userEmail = session?.user?.email || '不明'
  const userName = session?.user?.name || userEmail.split('@')[0]
  const userImage = session?.user?.image

  return (
    <Stack spacing={3}>
      {/* ユーザー情報 */}
      <Paper variant="outlined">
        <Box p={3}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar src={userImage || undefined} alt={userName} sx={{ width: 56, height: 56 }}>
              {userName[0]?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {userName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {userEmail}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Paper>

      {/* アカウント情報 */}
      <Paper variant="outlined">
        <List disablePadding>
          <ListItem>
            <ListItemIcon>
              <EmailIcon />
            </ListItemIcon>
            <ListItemText primary="メールアドレス" secondary={userEmail} />
          </ListItem>
          <Divider component="li" />
          <ListItem>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText primary="アプリバージョン" secondary="0.1.0" />
          </ListItem>
        </List>
      </Paper>

      {/* ログアウト */}
      {logoutError != null && (
        <Typography variant="body2" color="error" role="alert">
          {logoutError}
        </Typography>
      )}
      <Button
        variant="outlined"
        color="error"
        startIcon={<LogoutIcon />}
        onClick={handleLogout}
        disabled={isLoggingOut}
        sx={{ minHeight: 48 }}
      >
        {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
      </Button>
    </Stack>
  )
}
