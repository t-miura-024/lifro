import type { LogVolumeTotals } from '@/lib/log-volume'
import { BodyPartCategoryLabels, BodyPartCategoryOrder } from '@/server/domain/entities'
import { Box, Skeleton, Stack, Typography } from '@mui/material'

type LogVolumeSummaryProps = {
  totals: LogVolumeTotals
  isLoading: boolean
}

const formatVolume = (volume: number) => {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}t`
  }
  return `${volume.toLocaleString()}kg`
}

export function LogVolumeSummary({ totals, isLoading }: LogVolumeSummaryProps) {
  if (isLoading) {
    return (
      <Stack spacing={1} aria-busy="true">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            総ボリューム
          </Typography>
          <Skeleton variant="text" width={80} height={24} />
        </Box>
        <Box
          display="grid"
          gridTemplateColumns="repeat(3, minmax(0, 1fr))"
          columnGap={1.5}
          rowGap={0.5}
        >
          {BodyPartCategoryOrder.map((category) => (
            <Box key={category} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {BodyPartCategoryLabels[category]}
              </Typography>
              <Skeleton variant="text" width={40} height={18} />
            </Box>
          ))}
        </Box>
      </Stack>
    )
  }

  return (
    <Stack spacing={1}>
      <Box display="flex" justifyContent="space-between" alignItems="baseline">
        <Typography variant="body2" color="text.secondary">
          総ボリューム
        </Typography>
        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
          {formatVolume(totals.totalVolume)}
        </Typography>
      </Box>
      <Box
        display="grid"
        gridTemplateColumns="repeat(3, minmax(0, 1fr))"
        columnGap={1.5}
        rowGap={0.5}
      >
        {BodyPartCategoryOrder.map((category) => (
          <Box
            key={category}
            display="flex"
            justifyContent="space-between"
            alignItems="baseline"
            sx={{ minWidth: 0 }}
          >
            <Typography variant="body2" color="text.secondary" noWrap>
              {BodyPartCategoryLabels[category]}
            </Typography>
            <Typography variant="body2" fontWeight={600} noWrap sx={{ ml: 0.5 }}>
              {formatVolume(totals.categoryVolumes[category])}
            </Typography>
          </Box>
        ))}
      </Box>
      {totals.uncategorizedVolume > 0 && (
        <Box display="flex" justifyContent="space-between" alignItems="baseline">
          <Typography variant="body2" color="text.secondary">
            未分類
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {formatVolume(totals.uncategorizedVolume)}
          </Typography>
        </Box>
      )}
    </Stack>
  )
}
