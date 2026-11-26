import { FormControl, InputLabel, ListSubheader, MenuItem, Select } from '@mui/material'

export type ExerciseSelectGroup = {
  label: string
  options: { id: number; name: string }[]
}

type ExerciseSelectProps = {
  labelId: string
  label: string
  emptyLabel: string
  value: number | null
  groups: ExerciseSelectGroup[]
  onChange: (exerciseId: number | null) => void
}

/** グループ化された種目の選択欄。グループ名と選択肢はドメイン側が組み立てる。 */
export function ExerciseSelect({
  labelId,
  label,
  emptyLabel,
  value,
  groups,
  onChange,
}: ExerciseSelectProps) {
  const isEmpty = groups.length === 0
  const renderedLabel = isEmpty ? emptyLabel : label

  return (
    <FormControl fullWidth size="small" disabled={isEmpty}>
      <InputLabel id={labelId}>{renderedLabel}</InputLabel>
      <Select
        labelId={labelId}
        value={value?.toString() ?? ''}
        label={renderedLabel}
        onChange={(e) => {
          const next = e.target.value
          onChange(next ? Number.parseInt(next, 10) : null)
        }}
        sx={{ '& .MuiOutlinedInput-notchedOutline': { borderRadius: 0 } }}
      >
        {groups.flatMap((group) => [
          <ListSubheader key={`header-${group.label}`} sx={{ lineHeight: '32px' }}>
            {group.label}
          </ListSubheader>,
          ...group.options.map((option) => (
            <MenuItem key={option.id} value={option.id.toString()} sx={{ pl: 3 }}>
              {option.name}
            </MenuItem>
          )),
        ])}
      </Select>
    </FormControl>
  )
}
