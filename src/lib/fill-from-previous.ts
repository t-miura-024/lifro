import { type LoadMode, calculateAssistLoad, parseNumericInput } from '@/lib/assisted-load'

/** 前回セット1行分の実績値。 */
export type PreviousSetValues = {
  weight: number
  reps: number
}

/** 前回値で埋める対象の列。重量と回数は別々に扱う。 */
export type FillField = 'weight' | 'reps'

/** 前回値フィルの対象となるセット行の最小形状。 */
export type FillableSet = {
  weight: string
  reps: string
  assistValue: string
}

/** 前回値フィルを見送った理由。 */
export type FillSkipReason = 'mixed-load-modes' | 'missing-body-weight'

export type FillFromPreviousResult<T extends FillableSet> =
  | { applied: true; sets: T[]; loadMode: LoadMode }
  | { applied: false; reason: FillSkipReason }

type FillFromPreviousParams<T extends FillableSet> = {
  field: FillField
  sets: T[]
  previousSets: PreviousSetValues[] | null
  /** アシスト対応種目か。true のとき重量フィルはアシスト量／加重値の逆算になる。 */
  supportsAssist: boolean
  /** 現在のカード単位の負荷モード。 */
  loadMode: LoadMode
  bodyWeight: string
}

/** 小数第3位で丸める（assisted-load の計算結果と桁を揃える）。 */
function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

/**
 * 今ある行にだけ前回値を入れる。行の追加・削除はしない。
 *
 * - 回数フィルは通常種目・アシスト種目とも同じ。
 * - 通常種目の重量フィルは前回の重量をそのまま入れる。
 * - アシスト種目の重量フィルは、前回負荷と現在の体重からアシスト／加重を逆算する。
 *   前回負荷が体重未満ならアシスト、体重超なら加重、体重と同じならアシスト0。
 *
 * アシスト種目は負荷モードがカード単位のため、前回負荷から求まるモードが
 * 行ごとに割れる場合は適用しない（mixed-load-modes）。体重が未入力で
 * 逆算できない場合も適用しない（missing-body-weight）。
 */
export function fillFromPrevious<T extends FillableSet>({
  field,
  sets,
  previousSets,
  supportsAssist,
  loadMode,
  bodyWeight,
}: FillFromPreviousParams<T>): FillFromPreviousResult<T> {
  if (!previousSets || previousSets.length === 0) {
    return { applied: true, sets, loadMode }
  }

  if (field === 'reps') {
    return {
      applied: true,
      loadMode,
      sets: sets.map((set, index) => {
        const previous = previousSets[index]
        return previous ? { ...set, reps: String(previous.reps) } : set
      }),
    }
  }

  if (!supportsAssist) {
    return {
      applied: true,
      loadMode,
      sets: sets.map((set, index) => {
        const previous = previousSets[index]
        return previous ? { ...set, weight: String(previous.weight) } : set
      }),
    }
  }

  const bodyWeightValue = parseNumericInput(bodyWeight)
  if (bodyWeightValue === null || bodyWeightValue <= 0) {
    return { applied: false, reason: 'missing-body-weight' }
  }

  const filled = sets.map((set, index) => {
    const previous = previousSets[index]
    if (!previous) return { set, mode: null }

    // 体重と同じならアシスト0として扱う（アシストモード優先）。
    const mode: LoadMode = previous.weight > bodyWeightValue ? 'weighted' : 'assist'
    const assistValue = round(Math.abs(bodyWeightValue - previous.weight))
    return {
      set: {
        ...set,
        assistValue: String(assistValue),
        weight: String(calculateAssistLoad(bodyWeightValue, mode, assistValue)),
      },
      mode,
    }
  })

  const modes = new Set(filled.flatMap((row) => (row.mode === null ? [] : [row.mode])))
  if (modes.size > 1) {
    return { applied: false, reason: 'mixed-load-modes' }
  }

  return {
    applied: true,
    loadMode: modes.values().next().value ?? loadMode,
    sets: filled.map((row) => row.set),
  }
}
