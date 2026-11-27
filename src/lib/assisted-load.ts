/** アシスト種目の負荷計算モード。画面上の入力値は常にプラスで扱う。 */
export type LoadMode = 'assist' | 'weighted'

/** 前回使った体重を保持する localStorage キー。 */
export const BODY_WEIGHT_STORAGE_KEY = 'lifro:bodyWeight'

/** 数値入力欄の文字列を数値へ変換する。空欄・不正値は null。 */
export function parseNumericInput(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * アシスト種目の負荷を計算する。
 *
 * 内部的には「負荷 = 体重 - 入力値」の1式で統一し、加重モードでは
 * 入力値をマイナスとして扱う。表示・保存時の浮動小数点誤差を避けるため
 * 小数第3位で丸める。
 */
export function calculateAssistLoad(bodyWeight: number, mode: LoadMode, input: number): number {
  const signedInput = mode === 'assist' ? input : -input
  return Math.round((bodyWeight - signedInput) * 1000) / 1000
}

/** アシスト量／加重値が入力済みの行だけ、体重とモードから重量を再計算する。 */
export function recalculateSetWeight(
  currentWeight: string,
  assistValue: string,
  bodyWeightValue: string,
  mode: LoadMode,
): string {
  const input = parseNumericInput(assistValue)
  const bodyWeight = parseNumericInput(bodyWeightValue)
  if (input === null || bodyWeight === null || bodyWeight <= 0) {
    return currentWeight
  }
  return String(calculateAssistLoad(bodyWeight, mode, input))
}

/** 現在のモードと体重から、負荷の計算式を表示用に整形する。体重未入力なら「体重」とだけ表す。 */
export function formatLoadFormula(mode: LoadMode, bodyWeightValue: string): string {
  const bodyWeight = parseNumericInput(bodyWeightValue)
  const bodyWeightTerm = bodyWeight === null ? '体重' : `体重 ${bodyWeight}`
  return mode === 'assist'
    ? `負荷 = ${bodyWeightTerm} − アシスト`
    : `負荷 = ${bodyWeightTerm} ＋ 加重`
}

export type AssistedLoadValidation = {
  valid: boolean
  message: string | null
}

type AssistedValidationGroup = {
  exerciseId: number | null
  supportsAssist: boolean
  loadMode: LoadMode
  sets: { assistValue: string }[]
}

/**
 * アシスト種目の入力が保存可能かを検証する。
 *
 * - 負荷が0以下になるアシスト入力はエラー
 * - アシスト入力をした行があるのに体重が未入力ならエラー
 * - アシスト量／加重値が未入力の行は、既存種目と同じく重量0として保存できる
 */
export function validateAssistedLoad(
  groups: AssistedValidationGroup[],
  bodyWeightValue: string,
): AssistedLoadValidation {
  const bodyWeight = parseNumericInput(bodyWeightValue)

  for (const group of groups) {
    if (!group.supportsAssist || group.exerciseId === null) continue

    const enteredSets = group.sets.filter((set) => set.assistValue.trim() !== '')
    if (enteredSets.length === 0) continue

    if (bodyWeight === null || bodyWeight <= 0) {
      return { valid: false, message: '体重を入力してください' }
    }

    for (const set of enteredSets) {
      const input = parseNumericInput(set.assistValue)
      if (input === null) {
        return { valid: false, message: 'アシスト量／加重値には数値を入力してください' }
      }
      if (input < 0) {
        return { valid: false, message: 'アシスト量／加重値は0以上で入力してください' }
      }
      if (group.loadMode === 'assist' && calculateAssistLoad(bodyWeight, 'assist', input) <= 0) {
        return {
          valid: false,
          message: `アシスト量が体重（${bodyWeight}kg）以上です。負荷が0以下になるため保存できません`,
        }
      }
    }
  }

  return { valid: true, message: null }
}

/** localStorage に保持した前回の体重を返す。未保持・不正値は空文字。 */
export function loadStoredBodyWeight(): string {
  if (typeof window === 'undefined') return ''
  try {
    const stored = localStorage.getItem(BODY_WEIGHT_STORAGE_KEY)
    if (stored === null) return ''
    const parsed = parseNumericInput(stored)
    return parsed !== null && parsed > 0 ? stored : ''
  } catch {
    return ''
  }
}

/** 入力された体重を次回の初期値として localStorage に保存する。 */
export function saveStoredBodyWeight(value: string): void {
  if (typeof window === 'undefined') return
  const parsed = parseNumericInput(value)
  if (parsed === null || parsed <= 0) return
  try {
    localStorage.setItem(BODY_WEIGHT_STORAGE_KEY, String(parsed))
  } catch {
    // localStorageにアクセスできない場合は無視
  }
}
