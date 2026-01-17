'use client'

import { Box, Button, IconButton, Paper, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import GetAppIcon from '@mui/icons-material/GetApp'
import { usePwaInstall } from '@/hooks/usePwaInstall'

export function InstallPrompt() {
  const { canShowPrompt, install, dismiss } = usePwaInstall()

  if (!canShowPrompt) {
    return null
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 1300,
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderRadius: 3,
        maxWidth: 400,
        mx: 'auto',
      }}
    >
      <GetAppIcon color="primary" sx={{ fontSize: 32 }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2" fontWeight="bold">
          アプリをインストール
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ホーム画面に追加してすぐにアクセス
        </Typography>
      </Box>
      <Button
        variant="contained"
        size="small"
        onClick={install}
        sx={{ minWidth: 'auto', px: 2 }}
      >
        追加
      </Button>
      <IconButton size="small" onClick={dismiss} aria-label="閉じる">
        <CloseIcon fontSize="small" />
      </IconButton>
    </Paper>
  )
}
