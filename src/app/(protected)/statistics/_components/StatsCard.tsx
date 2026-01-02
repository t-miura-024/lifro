'use client'

import { Box, Paper, Typography } from '@mui/material'
import type { ReactNode } from 'react'

type Props = {
  title: string
  value: string | number
  icon?: ReactNode
  color?: string
}

export default function StatsCard({ title, value, icon, color = 'primary.main' }: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {icon && (
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          {icon}
        </Box>
      )}
      <Box>
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
      </Box>
    </Paper>
  )
}
