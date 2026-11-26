import { readFileSync, readdirSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { RoutineInput, TimerInput } from '@/server/domain/entities'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { type D1Client, configureDatabase, createDb } from '../../database/drizzle/client'
import * as schema from '../../database/drizzle/schema'
import { routineRepository } from './RoutineRepository'
import { timerRepository } from './TimerRepository'

/**
 * 隔離したローカル D1（Miniflare）に対して Repository を実 SQL で通す統合テスト。
 *
 * モックでは D1 の「複数行 VALUES の式が行ごとに評価される」挙動や db.batch の
 * ロールバックを再現できないため、wrangler の getPlatformProxy で実際の D1
 * バインディングを取得し、drizzle マイグレーションを適用して検証する。
 */

type PlatformProxy = {
  env: Record<string, unknown>
  dispose: () => Promise<void>
}

type MigrationClient = {
  prepare: (query: string) => { run: () => Promise<unknown> }
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'drizzle')

async function applyMigrations(client: MigrationClient): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
  for (const file of files) {
    const migration = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    for (const statement of migration.split('--> statement-breakpoint')) {
      // drizzle のマイグレーションは1 chunk 1文。D1 の exec は行単位で分割される
      // ため、複数行の DDL を壊さない prepare/run を使う。
      const sql = statement.trim()
      if (sql !== '') await client.prepare(sql).run()
    }
  }
}

let proxy: PlatformProxy
let persistDir: string
let db: ReturnType<typeof createDb>
let userId: number
let otherUserId: number
let exerciseIds: number[]

function makeRoutineInput(name: string, setCount: number): RoutineInput {
  return {
    name,
    sortIndex: 0,
    routineSets: Array.from({ length: setCount }, (_, index) => ({
      exerciseId: exerciseIds[index % exerciseIds.length],
      sortIndex: index,
      targetReps: index % 3 === 2 ? null : 10,
    })),
  }
}

function makeTimerInput(name: string, unitCount: number): TimerInput {
  return {
    name,
    sortIndex: 0,
    unitTimers: Array.from({ length: unitCount }, (_, index) => ({
      name: `unit-${index}`,
      sortIndex: index,
      duration: 30 + index,
      countSound: null,
      countSoundLast3Sec: null,
      endSound: null,
    })),
  }
}

async function selectRoutineSetRows(routineId: number) {
  return db.select().from(schema.routineSets).where(eq(schema.routineSets.routineId, routineId))
}

beforeAll(async () => {
  persistDir = await mkdtemp(path.join(tmpdir(), 'lifro-d1-'))
  proxy = (await getPlatformProxy({
    configPath: path.resolve(process.cwd(), 'wrangler.toml'),
    persist: { path: persistDir },
    remoteBindings: false,
  })) as PlatformProxy

  const d1 = proxy.env.DB as D1Client
  await applyMigrations(d1 as unknown as MigrationClient)
  configureDatabase(d1)
  db = createDb(d1)

  const now = new Date()
  const [user] = await db
    .insert(schema.users)
    .values({ email: 'routine-integration@example.com', updatedAt: now })
    .returning()
  const [otherUser] = await db
    .insert(schema.users)
    .values({ email: 'routine-integration-other@example.com', updatedAt: now })
    .returning()
  userId = user.id
  otherUserId = otherUser.id

  const exercises = await db
    .insert(schema.exercises)
    .values([
      { userId, name: 'ベンチプレス', updatedAt: now },
      { userId, name: 'スクワット', updatedAt: now },
      { userId, name: 'デッドリフト', updatedAt: now },
    ])
    .returning()
  exerciseIds = exercises.map((exercise) => exercise.id)
}, 60_000)

afterAll(async () => {
  await proxy?.dispose()
  if (persistDir) await rm(persistDir, { recursive: true, force: true })
})

beforeEach(async () => {
  // ルーティン・タイマーはユーザーに紐づくため、子行は FK の cascade で消える。
  await db.delete(schema.routines)
  await db.delete(schema.timers)
})

describe('DrizzleRoutineRepository（実 D1）', () => {
  it.each([1, 2, 3, 6, 16, 18])(
    'セット %i 件（チャンク跨ぎ含む）を作成すると全子行が同じ親を参照する',
    async (setCount) => {
      const input = makeRoutineInput(`set-count-${setCount}`, setCount)

      const created = await routineRepository.create(userId, input)

      expect(created.routineSets).toHaveLength(setCount)
      expect(created.routineSets.map((set) => set.exerciseId)).toEqual(
        input.routineSets.map((set) => set.exerciseId),
      )
      expect(created.routineSets.map((set) => set.sortIndex)).toEqual(
        Array.from({ length: setCount }, (_, index) => index),
      )
      expect(new Set(created.routineSets.map((set) => set.routineId))).toEqual(
        new Set([created.id]),
      )

      const rows = await selectRoutineSetRows(created.id)
      expect(rows).toHaveLength(setCount)
      expect(rows.every((row) => row.routineId === created.id)).toBe(true)

      // 親を跨いだ誤った routine_id が1行も残っていないこと
      const allRows = await db.select().from(schema.routineSets)
      expect(allRows).toHaveLength(setCount)
    },
  )

  it('既存ルーティンと別ユーザーのルーティンがあっても新規作成の子行は自分の親を参照する', async () => {
    const first = await routineRepository.create(userId, makeRoutineInput('first', 2))
    const other = await routineRepository.create(otherUserId, makeRoutineInput('other', 2))
    const second = await routineRepository.create(userId, makeRoutineInput('second', 3))

    expect(second.id).toBeGreaterThan(first.id)
    expect(other.id).toBeGreaterThan(first.id)

    const firstRows = await selectRoutineSetRows(first.id)
    expect(firstRows).toHaveLength(2)
    expect(firstRows.every((row) => row.routineId === first.id)).toBe(true)

    const secondRows = await selectRoutineSetRows(second.id)
    expect(secondRows).toHaveLength(3)
    expect(secondRows.every((row) => row.routineId === second.id)).toBe(true)

    // 別ユーザーのルーティンに取り違えていないこと
    const otherRows = await selectRoutineSetRows(other.id)
    expect(otherRows).toHaveLength(2)
    expect(otherRows.every((row) => row.routineId === other.id)).toBe(true)
  })

  it('update はセット行を全置換し、旧行を残さない', async () => {
    const created = await routineRepository.create(userId, makeRoutineInput('before', 3))
    const untouched = await routineRepository.create(userId, makeRoutineInput('untouched', 2))

    const updated = await routineRepository.update(
      userId,
      created.id,
      makeRoutineInput('after', 18),
    )

    expect(updated.id).toBe(created.id)
    expect(updated.name).toBe('after')
    expect(updated.routineSets).toHaveLength(18)
    expect(updated.routineSets.every((set) => set.routineId === created.id)).toBe(true)
    expect(updated.routineSets.map((set) => set.exerciseId)).toEqual(
      makeRoutineInput('after', 18).routineSets.map((set) => set.exerciseId),
    )

    const rows = await selectRoutineSetRows(created.id)
    expect(rows).toHaveLength(18)
    expect(rows.map((row) => row.sortIndex).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 18 }, (_, index) => index),
    )

    // 他のルーティンの行は全置換の影響を受けない
    const untouchedRows = await selectRoutineSetRows(untouched.id)
    expect(untouchedRows).toHaveLength(2)
  })

  it('子行の挿入に失敗した作成は親行もロールバックし、孤児行を残さない', async () => {
    const input = makeRoutineInput('broken', 3)
    input.routineSets[2] = { ...input.routineSets[2], exerciseId: 999_999 }

    await expect(routineRepository.create(userId, input)).rejects.toThrow()

    expect(await db.select().from(schema.routines)).toHaveLength(0)
    expect(await db.select().from(schema.routineSets)).toHaveLength(0)
  })

  it('全置換の挿入に失敗した update は既存セットを保持する', async () => {
    const created = await routineRepository.create(userId, makeRoutineInput('keep', 3))
    const before = await selectRoutineSetRows(created.id)

    await expect(
      routineRepository.update(userId, created.id, {
        name: 'keep',
        sortIndex: 0,
        routineSets: [{ exerciseId: 999_999, sortIndex: 0, targetReps: 10 }],
      }),
    ).rejects.toThrow()

    const after = await selectRoutineSetRows(created.id)
    expect(after.map((row) => row.id).sort((a, b) => a - b)).toEqual(
      before.map((row) => row.id).sort((a, b) => a - b),
    )
  })

  it('同名作成は専用メッセージのエラーになり、既存データを壊さない', async () => {
    await routineRepository.create(userId, makeRoutineInput('duplicate', 2))

    await expect(
      routineRepository.create(userId, makeRoutineInput('duplicate', 3)),
    ).rejects.toThrow('同名のルーティンが既に存在します')

    expect(await db.select().from(schema.routines)).toHaveLength(1)
    expect(await db.select().from(schema.routineSets)).toHaveLength(2)
  })
})

describe('DrizzleTimerRepository（実 D1）', () => {
  it.each([1, 3, 6])(
    'ユニット %i 件のタイマーを作成すると全子行が同じ親を参照する',
    async (unitCount) => {
      const created = await timerRepository.create(
        userId,
        makeTimerInput(`units-${unitCount}`, unitCount),
      )

      expect(created.unitTimers).toHaveLength(unitCount)
      expect(new Set(created.unitTimers.map((unit) => unit.timerId))).toEqual(new Set([created.id]))
      expect(created.unitTimers.map((unit) => unit.sortIndex)).toEqual(
        Array.from({ length: unitCount }, (_, index) => index),
      )

      const rows = await db
        .select()
        .from(schema.unitTimers)
        .where(eq(schema.unitTimers.timerId, created.id))
      expect(rows).toHaveLength(unitCount)
      expect(await db.select().from(schema.unitTimers)).toHaveLength(unitCount)
    },
  )

  it('既存タイマーがあってもユニットは新しいタイマーに紐づく', async () => {
    const first = await timerRepository.create(userId, makeTimerInput('first', 2))
    const other = await timerRepository.create(otherUserId, makeTimerInput('other', 2))
    const second = await timerRepository.create(userId, makeTimerInput('second', 3))

    expect(second.id).toBeGreaterThan(first.id)
    expect(other.id).toBeGreaterThan(first.id)

    const secondRows = await db
      .select()
      .from(schema.unitTimers)
      .where(eq(schema.unitTimers.timerId, second.id))
    expect(secondRows).toHaveLength(3)
    expect(secondRows.every((row) => row.timerId === second.id)).toBe(true)

    const firstRows = await db
      .select()
      .from(schema.unitTimers)
      .where(eq(schema.unitTimers.timerId, first.id))
    expect(firstRows).toHaveLength(2)
  })

  it('update はユニットを全置換する', async () => {
    const created = await timerRepository.create(userId, makeTimerInput('before', 2))

    const updated = await timerRepository.update(userId, created.id, makeTimerInput('after', 5))

    expect(updated.name).toBe('after')
    expect(updated.unitTimers).toHaveLength(5)
    expect(updated.unitTimers.every((unit) => unit.timerId === created.id)).toBe(true)
    const rows = await db
      .select()
      .from(schema.unitTimers)
      .where(eq(schema.unitTimers.timerId, created.id))
    expect(rows).toHaveLength(5)
  })
})
