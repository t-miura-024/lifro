import { createFileRoute } from '@tanstack/react-router'
import CloudOffIcon from '@mui/icons-material/CloudOff'
import { Box, Button, Container, Typography } from '@mui/material'

/** TanStack Start の `/offline` route。接続なしの状態を知らせ再読み込みを促す。 */
function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 3,
        }}
      >
        <CloudOffIcon sx={{ fontSize: 80, color: 'text.secondary' }} />
        <Typography variant="h5" component="h1" fontWeight="bold">
          オフラインです
        </Typography>
        <Typography variant="body1" color="text.secondary">
          インターネット接続がありません。
          <br />
          接続を確認してもう一度お試しください。
        </Typography>
        <Button variant="contained" onClick={handleRetry} size="large">
          再読み込み
        </Button>
      </Box>
    </Container>
  )
}

export const Route = createFileRoute('/offline')({
  component: OfflinePage,
})
