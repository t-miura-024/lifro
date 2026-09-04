'use client'

import type { ExerciseVolumeTotal } from '@/server/application/services/StatisticsService'
import { Box, List, ListItem, ListItemText, Paper, Typography } from '@mui/material'

type Props = {
  data: ExerciseVolumeTotal[]
}

export default function ExerciseVolumeList({ data }: Props) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          種目別ボリューム
        </Typography>
        <Box
          sx={{
            py: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography color="text.secondary" variant="body2">
            データがありません
          </Typography>
        </Box>
      </Paper>
    )
  }

  const maxVolume = Math.max(...data.map((d) => d.volume))

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        種目別ボリューム
      </Typography>
      <List dense disablePadding>
        {data.map((item, index) => {
          const percentage = (item.volume / maxVolume) * 100
          return (
            <ListItem
              key={item.exerciseId}
              sx={{
                px: 1,
                py: 0.75,
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {index + 1}. {item.exerciseName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.volume >= 1000
                      ? `${(item.volume / 1000).toFixed(1)}t`
                      : `${item.volume.toLocaleString()}kg`}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 4,
                    bgcolor: 'grey.200',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${percentage}%`,
                      bgcolor: 'primary.main',
                      borderRadius: 2,
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {item.setCount}セット
                </Typography>
              </Box>
            </ListItem>
          )
        })}
      </List>
    </Paper>
  )
}
