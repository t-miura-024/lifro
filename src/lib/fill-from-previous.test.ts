import { describe, expect, it } from 'vitest'
import { type FillableSet, fillFromPrevious } from './fill-from-previous'

type TestSet = FillableSet & { key: string }

const set = (overrides: Partial<TestSet> = {}): TestSet => ({
  key: 'set',
  weight: '',
  reps: '',
  assistValue: '',
  ...overrides,
})

const params = (overrides: {
  field: 'weight' | 'reps'
  sets: TestSet[]
  previousSets: { weight: number; reps: number }[] | null
  supportsAssist?: boolean
  loadMode?: 'assist' | 'weighted'
  bodyWeight?: string
}) => ({
  supportsAssist: false,
  loadMode: 'assist' as const,
  bodyWeight: '',
  ...overrides,
})

describe('fillFromPrevious: 通常種目', () => {
  it('重量フィルは今ある行に前回の重量を入れる', () => {
    const result = fillFromPrevious(
      params({
        field: 'weight',
        sets: [set(), set(), set()],
        previousSets: [
          { weight: 60, reps: 10 },
          { weight: 55.5, reps: 8 },
        ],
      }),
    )

    expect(result).toEqual({
      applied: true,
      loadMode: 'assist',
      sets: [set({ weight: '60' }), set({ weight: '55.5' }), set()],
    })
  })

  it('回数フィルは今ある行に前回の回数を入れる', () => {
    const result = fillFromPrevious(
      params({
        field: 'reps',
        sets: [set(), set(), set({ reps: '12' })],
        previousSets: [
          { weight: 60, reps: 10 },
          { weight: 55.5, reps: 8 },
        ],
      }),
    )

    expect(result).toEqual({
      applied: true,
      loadMode: 'assist',
      sets: [set({ reps: '10' }), set({ reps: '8' }), set({ reps: '12' })],
    })
  })

  it('重量フィルは回数欄を変えない', () => {
    const result = fillFromPrevious(
      params({
        field: 'weight',
        sets: [set({ reps: '5' })],
        previousSets: [{ weight: 60, reps: 10 }],
      }),
    )

    expect(result.applied && result.sets[0]).toMatchObject({ weight: '60', reps: '5' })
  })

  it('前回セットより行数が多い場合、余った行はそのまま残す', () => {
    const result = fillFromPrevious(
      params({
        field: 'reps',
        sets: [set(), set({ reps: '3', weight: '100' })],
        previousSets: [{ weight: 60, reps: 10 }],
      }),
    )

    expect(result).toEqual({
      applied: true,
      loadMode: 'assist',
      sets: [set({ reps: '10' }), set({ reps: '3', weight: '100' })],
    })
  })

  it('前回セットより行数が少ない場合、ある行だけ埋める', () => {
    const result = fillFromPrevious(
      params({
        field: 'weight',
        sets: [set()],
        previousSets: [
          { weight: 60, reps: 10 },
          { weight: 55.5, reps: 8 },
        ],
      }),
    )

    expect(result).toEqual({
      applied: true,
      loadMode: 'assist',
      sets: [set({ weight: '60' })],
    })
  })

  it('前回記録が無ければ何もしない', () => {
    const sets = [set({ weight: '40' })]
    expect(fillFromPrevious(params({ field: 'weight', sets, previousSets: null }))).toEqual({
      applied: true,
      loadMode: 'assist',
      sets,
    })
  })
})

describe('fillFromPrevious: アシスト種目の逆算', () => {
  const assistParams = (overrides: {
    field?: 'weight' | 'reps'
    sets: TestSet[]
    previousSets: { weight: number; reps: number }[] | null
    loadMode?: 'assist' | 'weighted'
    bodyWeight?: string
  }) =>
    params({
      field: 'weight',
      supportsAssist: true,
      ...overrides,
    })

  it('前回負荷が体重未満ならアシストモードで差分を入れる', () => {
    const result = fillFromPrevious(
      assistParams({
        sets: [set()],
        previousSets: [{ weight: 55.5, reps: 10 }],
        bodyWeight: '78',
      }),
    )

    expect(result).toEqual({
      applied: true,
      loadMode: 'assist',
      sets: [set({ assistValue: '22.5', weight: '55.5' })],
    })
  })

  it('前回負荷が体重超なら加重モードに切り替えて差分を入れる', () => {
    const result = fillFromPrevious(
      assistParams({
        sets: [set()],
        previousSets: [{ weight: 88, reps: 10 }],
        loadMode: 'assist',
        bodyWeight: '78',
      }),
    )

    expect(result).toEqual({
      applied: true,
      loadMode: 'weighted',
      sets: [set({ assistValue: '10', weight: '88' })],
    })
  })

  it('前回負荷が体重と同じならアシスト0を入れる', () => {
    const result = fillFromPrevious(
      assistParams({
        sets: [set()],
        previousSets: [{ weight: 78, reps: 10 }],
        loadMode: 'weighted',
        bodyWeight: '78',
      }),
    )

    expect(result).toEqual({
      applied: true,
      loadMode: 'assist',
      sets: [set({ assistValue: '0', weight: '78' })],
    })
  })

  it('全行が同じモードに収まる場合はまとめて埋める', () => {
    const result = fillFromPrevious(
      assistParams({
        sets: [set(), set()],
        previousSets: [
          { weight: 55.5, reps: 10 },
          { weight: 45.5, reps: 8 },
        ],
        bodyWeight: '78',
      }),
    )

    expect(result).toEqual({
      applied: true,
      loadMode: 'assist',
      sets: [
        set({ assistValue: '22.5', weight: '55.5' }),
        set({ assistValue: '32.5', weight: '45.5' }),
      ],
    })
  })

  it('前回セットより行数が多い場合、余った行はそのまま残す', () => {
    const result = fillFromPrevious(
      assistParams({
        sets: [set(), set({ assistValue: '30', weight: '48' })],
        previousSets: [{ weight: 55.5, reps: 10 }],
        bodyWeight: '78',
      }),
    )

    expect(result).toEqual({
      applied: true,
      loadMode: 'assist',
      sets: [
        set({ assistValue: '22.5', weight: '55.5' }),
        set({ assistValue: '30', weight: '48' }),
      ],
    })
  })

  it('回数フィルは通常種目と同じく前回の回数を入れる', () => {
    const result = fillFromPrevious(
      assistParams({
        field: 'reps',
        sets: [set()],
        previousSets: [{ weight: 55.5, reps: 10 }],
        bodyWeight: '78',
      }),
    )

    expect(result).toEqual({
      applied: true,
      loadMode: 'assist',
      sets: [set({ reps: '10' })],
    })
  })

  it('行ごとにモードが割れる場合は適用しない', () => {
    const result = fillFromPrevious(
      assistParams({
        sets: [set(), set()],
        previousSets: [
          { weight: 55.5, reps: 10 },
          { weight: 88, reps: 8 },
        ],
        bodyWeight: '78',
      }),
    )

    expect(result).toEqual({ applied: false, reason: 'mixed-load-modes' })
  })

  it('体重が未入力なら逆算できないため適用しない', () => {
    const result = fillFromPrevious(
      assistParams({
        sets: [set()],
        previousSets: [{ weight: 55.5, reps: 10 }],
        bodyWeight: '',
      }),
    )

    expect(result).toEqual({ applied: false, reason: 'missing-body-weight' })
  })
})
