import HistoryIcon from '@mui/icons-material/History'
import { IconButton, ListItemText, Menu, MenuItem } from '@mui/material'
import { useState } from 'react'

/** 前回値メニューの項目。文言と適用処理は呼び出し側が決める。 */
export type FillFromPreviousMenuItem = {
  key: string
  label: string
  /** 選択すると既存の入力が上書きされる場合に警告を表示する。 */
  overwritesInput: boolean
  onSelect: () => void
}

type FillFromPreviousMenuProps = {
  items: FillFromPreviousMenuItem[]
  disabled?: boolean
}

/** 履歴アイコンから前回値の入力項目を選ぶメニュー。 */
export function FillFromPreviousMenu({ items, disabled = false }: FillFromPreviousMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)

  return (
    <>
      <IconButton
        size="small"
        disabled={disabled}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-label="前回の記録で入力"
        aria-haspopup="menu"
        aria-expanded={anchorEl !== null}
        sx={{ flexShrink: 0 }}
      >
        <HistoryIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={anchorEl !== null}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.key}
            onClick={() => {
              setAnchorEl(null)
              item.onSelect()
            }}
          >
            <ListItemText
              primary={item.label}
              secondary={item.overwritesInput ? '既存の入力は上書きされます' : undefined}
              slotProps={{ secondary: { color: 'warning.main' } }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
