'use client'

import { client, type InferResponseType } from '@/app/_lib/hono/client'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useCallback, useEffect, useState, useTransition } from 'react'

const bodyPartsEndpoint = client.api.exercises['body-parts'].$get
type BodyPart = InferResponseType<typeof bodyPartsEndpoint>[number]

type ExerciseBodyPartInput = {
  bodyPartId: number
  loadRatio: number
}

type Props = {
  open: boolean
  onClose: () => void
  exerciseId: number | null
  exerciseName: string
  initialBodyParts: ExerciseBodyPartInput[]
  onSave: () => void
}

/** 部位カテゴリの表示名 */
const categoryLabels: Record<string, string> = {
  CHEST: '胸',
  BACK: '背中',
  SHOULDER: '肩',
  ARM: '腕',
  ABS: '腹筋',
  LEG: '脚',
}

export default function BodyPartEditDialog({
  open,
  onClose,
  exerciseId,
  exerciseName,
  initialBodyParts,
  onSave,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [allBodyParts, setAllBodyParts] = useState<BodyPart[]>([])
  const [selectedBodyParts, setSelectedBodyParts] = useState<ExerciseBodyPartInput[]>([])
  const [error, setError] = useState<string | null>(null)

  // 部位マスタを取得
  useEffect(() => {
    if (open) {
      startTransition(async () => {
        const res = await client.api.exercises['body-parts'].$get()
        const data = await res.json()
        setAllBodyParts(data)
      })
      setSelectedBodyParts(initialBodyParts)
      setError(null)
    }
  }, [open, initialBodyParts])

  // 負荷割合の合計を計算
  const totalRatio = selectedBodyParts.reduce((sum, bp) => sum + bp.loadRatio, 0)
  const isValid = selectedBodyParts.length === 0 || totalRatio === 100

  // 部位を追加
  const handleAddBodyPart = () => {
    // まだ選択されていない部位を探す
    const usedIds = new Set(selectedBodyParts.map((bp) => bp.bodyPartId))
    const availableBodyPart = allBodyParts.find((bp) => !usedIds.has(bp.id))
    if (availableBodyPart) {
      setSelectedBodyParts([...selectedBodyParts, { bodyPartId: availableBodyPart.id, loadRatio: 0 }])
    }
  }

  // 部位を削除
  const handleRemoveBodyPart = (index: number) => {
    setSelectedBodyParts(selectedBodyParts.filter((_, i) => i !== index))
  }

  // 部位を変更
  const handleBodyPartChange = (index: number, bodyPartId: number) => {
    const newBodyParts = [...selectedBodyParts]
    newBodyParts[index] = { ...newBodyParts[index], bodyPartId }
    setSelectedBodyParts(newBodyParts)
  }

  // 負荷割合を変更
  const handleRatioChange = (index: number, ratio: number) => {
    const newBodyParts = [...selectedBodyParts]
    newBodyParts[index] = { ...newBodyParts[index], loadRatio: ratio }
    setSelectedBodyParts(newBodyParts)
  }

  // 保存
  const handleSave = useCallback(() => {
    if (!exerciseId) return
    if (!isValid) {
      setError('負荷割合の合計は100%にしてください')
      return
    }

    startTransition(async () => {
      await client.api.exercises[':exerciseId']['body-parts'].$put({
        param: { exerciseId: String(exerciseId) },
        json: { bodyParts: selectedBodyParts },
      })
      onSave()
      onClose()
    })
  }, [exerciseId, isValid, selectedBodyParts, onSave, onClose])

  // 部位をカテゴリでグループ化
  const bodyPartsByCategory = allBodyParts.reduce(
    (acc, bp) => {
      if (!acc[bp.category]) {
        acc[bp.category] = []
      }
      acc[bp.category].push(bp)
      return acc
    },
    {} as Record<string, BodyPart[]>,
  )

  // 選択済みの部位IDを取得
  const selectedIds = new Set(selectedBodyParts.map((bp) => bp.bodyPartId))

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>部位を設定 - {exerciseName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {selectedBodyParts.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              部位が設定されていません
            </Typography>
          ) : (
            selectedBodyParts.map((bp, index) => {
              const bodyPart = allBodyParts.find((p) => p.id === bp.bodyPartId)
              return (
                <Stack key={bp.bodyPartId} direction="row" spacing={1} alignItems="center">
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>部位</InputLabel>
                    <Select
                      value={bp.bodyPartId}
                      label="部位"
                      onChange={(e) => handleBodyPartChange(index, e.target.value as number)}
                    >
                      {Object.entries(bodyPartsByCategory).map(([category, parts]) => [
                        <MenuItem key={`header-${category}`} disabled sx={{ fontWeight: 'bold' }}>
                          {categoryLabels[category] || category}
                        </MenuItem>,
                        ...parts.map((part) => (
                          <MenuItem
                            key={part.id}
                            value={part.id}
                            disabled={selectedIds.has(part.id) && part.id !== bp.bodyPartId}
                            sx={{ pl: 3 }}
                          >
                            {part.name}
                          </MenuItem>
                        )),
                      ])}
                    </Select>
                  </FormControl>
                  <TextField
                    size="small"
                    type="number"
                    label="負荷%"
                    value={bp.loadRatio}
                    onChange={(e) => handleRatioChange(index, Number(e.target.value))}
                    inputProps={{ min: 0, max: 100, step: 5 }}
                    sx={{ width: 100 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveBodyPart(index)}
                    aria-label="削除"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              )
            })
          )}

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddBodyPart}
              disabled={selectedBodyParts.length >= allBodyParts.length}
            >
              部位を追加
            </Button>
          </Box>

          {selectedBodyParts.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Typography variant="body2">合計:</Typography>
              <Chip
                label={`${totalRatio}%`}
                color={isValid ? 'success' : 'error'}
                size="small"
              />
            </Box>
          )}

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isPending}>
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isPending || !isValid}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  )
}
