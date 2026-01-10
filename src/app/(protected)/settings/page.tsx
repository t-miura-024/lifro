'use client'

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
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await signOut({ callbackUrl: '/login' })
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
