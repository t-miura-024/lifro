import AddIcon from '@mui/icons-material/Add'
import { Button } from '@mui/material'

type AddRowButtonProps = {
  label: string
  onClick: () => void
}

/** セット・種目などの行を追加する全幅ボタン。「＋」アイコンと文言は共通形式。 */
export function AddRowButton({ label, onClick }: AddRowButtonProps) {
  return (
    <Button
      startIcon={<AddIcon />}
      onClick={onClick}
      variant="text"
      size="small"
      fullWidth
      sx={{
        borderRadius: 0,
        my: 0,
        py: 0,
        minHeight: 'auto',
        '& .MuiButton-startIcon': { marginRight: 1 },
      }}
    >
      {label}
    </Button>
  )
}
