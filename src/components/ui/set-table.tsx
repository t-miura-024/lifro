import DeleteIcon from '@mui/icons-material/Delete'
import {
  IconButton,
  Stack,
  Table,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'

/** セット表のデータ列。単位は「ラベル (単位)」の書式で共通側が整形する。 */
export type SetTableColumn = {
  key: string
  label: string
  unit?: string
  width?: number | string
}

type SetTableProps = {
  columns: SetTableColumn[]
  children: ReactNode
  /** 列の多い表を狭い画面でも1行に収めるための詰め表示。 */
  compact?: boolean
}

/**
 * 詰め表示のスタイル。見出しは折り返さず、セル余白と文字サイズを小さくして
 * モバイル幅でも「アシスト (kg)」「負荷 (kg)」「回数」「ボリューム」が並ぶようにする。
 */
const compactTableSx = {
  tableLayout: 'fixed',
  '& .MuiTableCell-root': { px: 0.25, py: 0.5 },
  '& .MuiTableCell-head': {
    px: 0.25,
    fontSize: { xs: '0.65rem', sm: '0.75rem' },
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    whiteSpace: 'nowrap',
  },
} as const

/** セット表の枠組み。列見出しと操作列を描画し、本体は children に委ねる。 */
export function SetTable({ columns, children, compact = false }: SetTableProps) {
  return (
    <TableContainer>
      <Table size="small" sx={compact ? compactTableSx : undefined}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                align="right"
                width={column.width}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {column.unit ? `${column.label} (${column.unit})` : column.label}
              </TableCell>
            ))}
            <TableCell width={compact ? 28 : 60} />
          </TableRow>
        </TableHead>
        {children}
      </Table>
    </TableContainer>
  )
}

const numberInputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 0 },
  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
  '& .MuiInputBase-input': {
    textAlign: 'right',
    padding: 0,
    '&::-webkit-outer-spin-button': {
      WebkitAppearance: 'none',
      margin: 0,
    },
    '&::-webkit-inner-spin-button': {
      WebkitAppearance: 'none',
      margin: 0,
    },
    '&[type=number]': { MozAppearance: 'textfield' },
  },
} as const

type SetNumberInputCellProps = {
  value: string
  onChange: (value: string) => void
  min: number
  step: number
  placeholder?: string
  note?: ReactNode
}

/** 数値入力用のセットセル。罫線なし・右寄せの入力欄に補足表示を添えられる。 */
export function SetNumberInputCell({
  value,
  onChange,
  min,
  step,
  placeholder,
  note,
}: SetNumberInputCellProps) {
  return (
    <TableCell sx={{ p: 0 }}>
      <Stack spacing={0.5}>
        <TextField
          type="number"
          size="small"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputProps={{ min, step, placeholder }}
          sx={numberInputSx}
          fullWidth
        />
        {note}
      </Stack>
    </TableCell>
  )
}

type SetValueCellProps = {
  value: ReactNode
  note?: ReactNode
}

/** 読み取り専用のセットセル。右寄せの値に補足表示を添えられる。 */
export function SetValueCell({ value, note }: SetValueCellProps) {
  return (
    <TableCell align="right">
      <Stack spacing={0.5} alignItems="flex-end">
        <Typography>{value}</Typography>
        {note}
      </Stack>
    </TableCell>
  )
}

type SetCellNoteProps = {
  color?: string
  children: ReactNode
}

/** セットセル下段の補足表示（前回比など）。色はドメイン側が決める。 */
export function SetCellNote({ color, children }: SetCellNoteProps) {
  return (
    <Typography variant="caption" sx={{ color, fontSize: '0.7rem', textAlign: 'right' }}>
      {children}
    </Typography>
  )
}

type SetRemoveCellProps = {
  canRemove: boolean
  onRemove: () => void
}

/** セット行の削除セル。canRemove が false のときはボタンを描画しない。 */
export function SetRemoveCell({ canRemove, onRemove }: SetRemoveCellProps) {
  return (
    <TableCell>
      {canRemove && (
        <IconButton size="small" onClick={onRemove} aria-label="セットを削除">
          <DeleteIcon fontSize="small" />
        </IconButton>
      )}
    </TableCell>
  )
}

type SetTotalRowProps = {
  value: ReactNode
  note?: ReactNode
  labelColSpan?: number
}

/** セット表の合計行。データ列の先頭をまとめた見出しと合計値を描画する。 */
export function SetTotalRow({ value, note, labelColSpan = 2 }: SetTotalRowProps) {
  return (
    <TableRow>
      <TableCell colSpan={labelColSpan} align="right">
        <Typography variant="subtitle2">合計</Typography>
      </TableCell>
      <TableCell align="right">
        <Stack spacing={0.5} alignItems="flex-end">
          <Typography variant="subtitle2">{value}</Typography>
          {note}
        </Stack>
      </TableCell>
      <TableCell />
    </TableRow>
  )
}
