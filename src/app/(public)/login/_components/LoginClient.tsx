'use client'

import GoogleIcon from '@mui/icons-material/Google'
import { Box, Button, Container, Stack, Typography } from '@mui/material'
import { signIn } from 'next-auth/react'

export default function LoginClient() {
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
          <Button
            type="button"
            variant="contained"
            color="primary"
            startIcon={<GoogleIcon />}
            onClick={() => signIn('google', { callbackUrl: '/' })}
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
