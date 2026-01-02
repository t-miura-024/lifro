'use client'
import { Button } from '@mui/material'
import { signOut } from 'next-auth/react'

export default function LogoutButton() {
  return (
    <Button
      variant="outlined"
      color="inherit"
      size="small"
      onClick={() => signOut({ callbackUrl: '/login' })}
      sx={{ textTransform: 'none' }}
    >
      ログアウト
    </Button>
  )
}
