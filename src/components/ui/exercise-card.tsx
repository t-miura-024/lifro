import { Paper, Stack } from '@mui/material'
import type { ReactNode } from 'react'

type ExerciseCardProps = {
  children: ReactNode
}

/** 種目カードの枠組み。見出し行とセット表を縦に並べる。 */
export function ExerciseCard({ children }: ExerciseCardProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>{children}</Stack>
    </Paper>
  )
}

type ExerciseCardHeaderProps = {
  children: ReactNode
}

/** 種目カード上段の横並び領域。中身はドメイン側が決める。 */
export function ExerciseCardHeader({ children }: ExerciseCardHeaderProps) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      {children}
    </Stack>
  )
}
