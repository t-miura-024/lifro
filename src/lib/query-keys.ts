import type { BodyPartGranularity, Preset, TimeGranularity } from '@/lib/orpc-client'
import type { QueryClient } from '@tanstack/react-query'

/**
 * クライアント state キャッシュのキー定義と無効化ヘルパー（ADR 0014）。
 *
 * - キーはドメイン接頭辞（logs / exercises / timers / statistics / bodyParts）で統一する
 * - 無効化はキー単位ではなくドメイン単位で粗く行う（依存漏れによる古い表示を防ぐ）
 * - 保存・更新の成功時に `refreshXxxCache` を呼ぶ。通常の画面遷移では再取得しない
 */
export const queryKeys = {
  logs: {
    all: ['logs'] as const,
    yearMonths: ['logs', 'yearMonths'] as const,
    month: (year: number, month: number) => ['logs', 'month', year, month] as const,
    byDate: (date: string) => ['logs', 'byDate', date] as const,
    memos: (date: string) => ['logs', 'memos', date] as const,
    latestSets: (exerciseId: number, excludeDate?: string) =>
      ['logs', 'latestSets', exerciseId, excludeDate ?? null] as const,
    latestSetsMultiple: (exerciseIds: number[], excludeDate?: string) =>
      ['logs', 'latestSetsMultiple', excludeDate ?? null, exerciseIds] as const,
  },
  exercises: {
    all: ['exercises'] as const,
    withBodyParts: ['exercises', 'withBodyParts'] as const,
  },
  timers: {
    all: ['timers'] as const,
    list: ['timers', 'list'] as const,
    sounds: ['timers', 'sounds'] as const,
  },
  bodyParts: {
    all: ['bodyParts'] as const,
    list: ['bodyParts', 'list'] as const,
  },
  statistics: {
    all: ['statistics'] as const,
    exerciseList: ['statistics', 'exerciseList'] as const,
    volumeTab: (
      granularity: TimeGranularity,
      preset: Preset | undefined,
      customStartDate: string | undefined,
      customEndDate: string | undefined,
      bodyPartGranularity: BodyPartGranularity,
    ) =>
      [
        'statistics',
        'volumeTab',
        granularity,
        preset,
        customStartDate ?? null,
        customEndDate ?? null,
        bodyPartGranularity,
      ] as const,
    weightTab: (
      exerciseId: number,
      granularity: TimeGranularity,
      preset: Preset | undefined,
      customStartDate: string | undefined,
      customEndDate: string | undefined,
    ) =>
      [
        'statistics',
        'weightTab',
        exerciseId,
        granularity,
        preset,
        customStartDate ?? null,
        customEndDate ?? null,
      ] as const,
    continuityTab: (
      granularity: TimeGranularity,
      preset: Preset | undefined,
      customStartDate: string | undefined,
      customEndDate: string | undefined,
      bodyPartGranularity: BodyPartGranularity,
    ) =>
      [
        'statistics',
        'continuityTab',
        granularity,
        preset,
        customStartDate ?? null,
        customEndDate ?? null,
        bodyPartGranularity,
      ] as const,
  },
} as const

/**
 * 指定ドメインのキャッシュを更新する。
 *
 * - 表示中（active）のキー: データを保持したまま裏で再取得する。データを消すと
 *   isPending に戻って画面が unmount され、開いているモーダルのローカル state が
 *   失われるため（保存直後にモーダルが空になる不具合の原因だった）
 * - 非表示（inactive）のキー: データを破棄し、次回表示時に取得する
 */
async function refreshDomains(
  client: QueryClient,
  domains: readonly (readonly unknown[])[],
): Promise<void> {
  for (const queryKey of domains) {
    client.removeQueries({ queryKey, type: 'inactive' })
  }
  await Promise.all(
    domains.map((queryKey) => client.invalidateQueries({ queryKey, refetchType: 'active' })),
  )
}

/** 記録・メモの保存/削除後: 記録系と統計系を更新する */
export function refreshLogsCache(client: QueryClient): Promise<void> {
  return refreshDomains(client, [queryKeys.logs.all, queryKeys.statistics.all])
}

/** 種目（部位含む）の変更後: 記録の表示に種目名・部位が埋め込まれるため logs と statistics も更新する */
export function refreshExercisesCache(client: QueryClient): Promise<void> {
  return refreshDomains(client, [
    queryKeys.exercises.all,
    queryKeys.logs.all,
    queryKeys.statistics.all,
  ])
}

/** タイマーの変更後 */
export function refreshTimersCache(client: QueryClient): Promise<void> {
  return refreshDomains(client, [queryKeys.timers.all])
}
