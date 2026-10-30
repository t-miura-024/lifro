import type { BodyPartCategory } from '@/server/domain/entities'

type VolumeGroup = {
  exerciseId: number | null
  sets: { weight: string; reps: string }[]
}

type VolumeExercise = {
  id: number
  bodyParts: {
    loadRatio: number
    bodyPart?: { category: BodyPartCategory }
  }[]
}

export type LogVolumeTotals = {
  totalVolume: number
  categoryVolumes: Record<BodyPartCategory, number>
  uncategorizedVolume: number
}

const emptyCategoryVolumes = (): Record<BodyPartCategory, number> => ({
  CHEST: 0,
  BACK: 0,
  SHOULDER: 0,
  ARM: 0,
  ABS: 0,
  LEG: 0,
})

/**
 * ログ入力フォームの状態から総ボリュームと部位カテゴリ別ボリュームを計算する。
 *
 * - 総ボリュームは種目が選択されているグループのセットのみを対象にする
 * - 部位別は種目の負荷割合で按分する
 * - 部位未設定の種目、および按分の残りは未分類に計上する
 */
export const calculateLogVolumes = (
  groups: VolumeGroup[],
  exercises: VolumeExercise[],
): LogVolumeTotals => {
  const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const categoryVolumes = emptyCategoryVolumes()
  let totalVolume = 0
  let uncategorizedVolume = 0

  for (const group of groups) {
    if (group.exerciseId === null) continue

    const exercise = exerciseMap.get(group.exerciseId)

    for (const set of group.sets) {
      const weight = Number.parseFloat(set.weight) || 0
      const reps = Number.parseInt(set.reps, 10) || 0
      const volume = weight * reps
      if (volume === 0) continue

      totalVolume += volume

      if (!exercise || exercise.bodyParts.length === 0) {
        uncategorizedVolume += volume
        continue
      }

      let apportionedVolume = 0
      for (const bodyPart of exercise.bodyParts) {
        const category = bodyPart.bodyPart?.category
        if (!category) continue

        const partVolume = (volume * bodyPart.loadRatio) / 100
        categoryVolumes[category] += partVolume
        apportionedVolume += partVolume
      }

      // 負荷割合の合計が100%未満の既存データや部位情報の欠損分は未分類に寄せる
      const remainder = volume - apportionedVolume
      if (remainder > 0.000001) {
        uncategorizedVolume += remainder
      }
    }
  }

  return { totalVolume, categoryVolumes, uncategorizedVolume }
}
