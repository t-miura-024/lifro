import { Button, DialogActions } from '@mui/material'

type FormDialogActionsProps = {
  onClose: () => void
  onSave: () => void
  closeDisabled?: boolean
  saveDisabled?: boolean
  isSaving?: boolean
}

/** フォームモーダルのフッター。閉じる側の文言と保存中の表示を共通化する。 */
export function FormDialogActions({
  onClose,
  onSave,
  closeDisabled = false,
  saveDisabled = false,
  isSaving = false,
}: FormDialogActionsProps) {
  return (
    <DialogActions sx={{ px: 3, pt: 0.5, pb: 'calc(16px + env(safe-area-inset-bottom))' }}>
      <Button onClick={onClose} disabled={closeDisabled}>
        閉じる
      </Button>
      <Button variant="contained" onClick={onSave} disabled={saveDisabled}>
        {isSaving ? '保存中...' : '保存'}
      </Button>
    </DialogActions>
  )
}
