import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  calculateAssistLoad,
  formatLoadFormula,
  loadStoredBodyWeight,
  recalculateSetWeight,
  saveStoredBodyWeight,
  validateAssistedLoad,
} from './assisted-load'

type Group = Parameters<typeof validateAssistedLoad>[0][number]

const group = (
  overrides: Partial<Group> & { assistValues: string[]; loadMode?: Group['loadMode'] },
): Group => ({
  exerciseId: 47,
  supportsAssist: true,
  loadMode: overrides.loadMode ?? 'assist',
  sets: overrides.assistValues.map((assistValue) => ({ assistValue })),
  ...overrides,
})

describe('calculateAssistLoad', () => {
  it('アシストモードは体重から入力値を引く', () => {
    expect(calculateAssistLoad(78, 'assist', 22.5)).toBe(55.5)
  })

  it('加重モードは体重に入力値を足す', () => {
    expect(calculateAssistLoad(78, 'weighted', 10)).toBe(88)
  })

  it('アシスト0は体重そのものになる', () => {
    expect(calculateAssistLoad(78, 'assist', 0)).toBe(78)
  })

  it('ドロップセットの行ごとの入力値を個別に計算する', () => {
    expect([22.5, 32.5, 42.5].map((input) => calculateAssistLoad(78, 'assist', input))).toEqual([
      55.5, 45.5, 35.5,
    ])
  })

  it('浮動小数点誤差を表示・保存しやすい値に丸める', () => {
    expect(calculateAssistLoad(78.1, 'assist', 22.3)).toBe(55.8)
  })
})

describe('recalculateSetWeight', () => {
  it('アシスト入力済みの行は体重変更に追従する', () => {
    expect(recalculateSetWeight('55.5', '22.5', '80', 'assist')).toBe('57.5')
  })

  it('アシスト未入力の行は保存済みの重量を変えない', () => {
    expect(recalculateSetWeight('55.5', '', '80', 'assist')).toBe('55.5')
  })

  it('アシストに明示的に0を入力した行は負荷が体重そのものになる', () => {
    expect(recalculateSetWeight('', '0', '78', 'assist')).toBe('78')
  })

  it('加重に明示的に0を入力した行も負荷が体重そのものになる', () => {
    expect(recalculateSetWeight('', '0', '78', 'weighted')).toBe('78')
  })

  it('体重未入力では再計算しない', () => {
    expect(recalculateSetWeight('55.5', '22.5', '', 'assist')).toBe('55.5')
  })

  it('モード切り替えは入力値の絶対値を保ったまま負荷を再計算する', () => {
    expect(recalculateSetWeight('55.5', '10', '78', 'weighted')).toBe('88')
  })

  it('計算した負荷をそのまま sets.weight 用の数値へ変換できる', () => {
    const weight = recalculateSetWeight('', '22.5', '78', 'assist')
    expect(Number.parseFloat(weight)).toBe(55.5)
  })
})

describe('formatLoadFormula', () => {
  it('アシストモードは体重とアシストの引き算を表示する', () => {
    expect(formatLoadFormula('assist', '78')).toBe('負荷 = 体重 78 − アシスト')
  })

  it('加重モードは体重と加重の足し算を表示する', () => {
    expect(formatLoadFormula('weighted', '78')).toBe('負荷 = 体重 78 ＋ 加重')
  })

  it('体重未入力なら体重の数値を省略する', () => {
    expect(formatLoadFormula('assist', '')).toBe('負荷 = 体重 − アシスト')
  })
})

describe('validateAssistedLoad', () => {
  it('負荷が0より大きければ保存できる', () => {
    expect(validateAssistedLoad([group({ assistValues: ['22.5'] })], '78')).toEqual({
      valid: true,
      message: null,
    })
  })

  it('アシスト量が体重と等しく負荷0になる場合はエラー', () => {
    expect(validateAssistedLoad([group({ assistValues: ['78'] })], '78').valid).toBe(false)
  })

  it('アシスト量が体重を超えて負荷が負になる場合はエラー', () => {
    expect(validateAssistedLoad([group({ assistValues: ['78.5'] })], '78').valid).toBe(false)
  })

  it('加重モードでは同じ入力値でも負荷が体重を超えるためエラーにならない', () => {
    expect(
      validateAssistedLoad([group({ assistValues: ['78'], loadMode: 'weighted' })], '78'),
    ).toEqual({ valid: true, message: null })
  })

  it('アシスト未入力の行は体重未入力でもエラーにせず重量0で保存できる', () => {
    expect(validateAssistedLoad([group({ assistValues: ['', ''] })], '')).toEqual({
      valid: true,
      message: null,
    })
  })

  it('アシスト入力済みなのに体重が未入力ならエラー', () => {
    const result = validateAssistedLoad([group({ assistValues: ['22.5'] })], '')
    expect(result.valid).toBe(false)
    expect(result.message).toContain('体重')
  })

  it('アシスト対応でない種目は検証対象外', () => {
    expect(
      validateAssistedLoad([group({ assistValues: ['999'], supportsAssist: false })], ''),
    ).toEqual({ valid: true, message: null })
  })
})

describe('体重のlocalStorage保持', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('最後に使った体重を次回の初期値として読み込む', () => {
    saveStoredBodyWeight('80')
    expect(loadStoredBodyWeight()).toBe('80')
  })

  it('未保持の初回は空欄で開始する', () => {
    expect(loadStoredBodyWeight()).toBe('')
  })

  it('不正値・0以下は保存しない', () => {
    saveStoredBodyWeight('abc')
    saveStoredBodyWeight('0')
    expect(loadStoredBodyWeight()).toBe('')
  })
})
