'use client'

import type { BodyPartTrainingDays } from '@/server/application/services/StatisticsService'
import { Box, List, ListItem, Paper, Typography } from '@mui/material'
import PillToggle from './PillToggle'

/** 部位カテゴリの表示名 */
const categoryLabels: Record<string, string> = {
  CHEST: '胸',
  BACK: '背中',
  SHOULDER: '肩',
  ARM: '腕',
  ABS: '腹筋',
  LEG: '脚',
}

type Props = {
  data: BodyPartTrainingDays[]
  granularity: 'category' | 'bodyPart'
  onGranularityChange: (granularity: 'category' | 'bodyPart') => void
}

export default function BodyPartTrainingDaysList({
  data,
  granularity,
  onGranularityChange,
}: Props) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2">部位別トレーニング日数</Typography>
          <PillToggle
            value={granularity}
            options={[
              { value: 'category', label: 'カテゴリ' },
              { value: 'bodyPart', label: '部位' },
            ]}
            onChange={onGranularityChange}
          />
        </Box>
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

  const maxDays = Math.max(...data.map((d) => d.days))

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">部位別トレーニング日数</Typography>
        <PillToggle
          value={granularity}
          options={[
            { value: 'category', label: 'カテゴリ' },
            { value: 'bodyPart', label: '部位' },
          ]}
          onChange={onGranularityChange}
        />
      </Box>
      <List dense disablePadding>
        {data.map((item, index) => {
          const percentage = (item.days / maxDays) * 100
          const displayName =
            granularity === 'category'
              ? categoryLabels[item.category] || item.category
              : `${categoryLabels[item.category] || item.category} - ${item.bodyPartName}`

          return (
            <ListItem
              key={granularity === 'category' ? item.category : item.bodyPartId}
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
                    {index + 1}. {displayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.days}日
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
                      bgcolor: 'success.main',
                      borderRadius: 2,
                    }}
                  />
                </Box>
              </Box>
            </ListItem>
          )
        })}
      </List>
    </Paper>
  )
}
