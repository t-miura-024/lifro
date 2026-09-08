import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

/**
 * Drizzle スキーマ定義（D1/SQLite。ADR 0012）。
 *
 * Neon/Postgres からの純粋移行のため、テーブル名・カラム名・index名・unique名・
 * FK名・値域は既存定義から温存している。方言差で不可避の型写像のみ行い、
 * スキーマ再設計はしない（Postgres→SQLite写像: serial→INTEGER PK AUTOINCREMENT、
 * timestamp(3)→INTEGER(ms)、date→TEXT、double precision→REAL、enum→TEXT+CHECK）。
 * TSレベルの型（number/string/Date/カテゴリunion）は Postgres 版と等価のため、
 * 呼び出し側（repositories/services）の型互換は維持される。
 *
 * M4（ADR 0008）で追加した better-auth 既定テーブル（`user` / `session` /
 * `account` / `verification`）は `./auth-schema` で定義し、drizzle-kit の
 * 検出対象にするためここから再 export する。
 */
export { account, session, user, verification } from './auth-schema'

export const bodyPartCategoryValues = ['CHEST', 'BACK', 'SHOULDER', 'ARM', 'ABS', 'LEG'] as const

/**
 * SQL TEXT リテラルへのエスケープ (`'` → `''`)。
 *
 * CHECK 制約は DDL のため束縛変数 (`?`) を使えず、マイグレーション SQL に
 * リテラルとして埋め込む必要がある。将来値にクォートが混ざっても壊れないよう
 * 手組みクォートではなく本ヘルパー経由で組み立てること。
 */
function toSqlTextLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * `body_parts.category` CHECK 式の単一生成点。
 *
 * 値域の真実の源は `bodyPartCategoryValues` のみとし、raw 文字列との二重化を
 * 避けるため本関数経由で組み立てる。
 */
function bodyPartCategoryCheckSql() {
  return sql.raw(`"category" IN (${bodyPartCategoryValues.map(toSqlTextLiteral).join(', ')})`)
}

export const users = sqliteTable(
  'users',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('users_email_key').on(t.email)],
)

export const exercises = sqliteTable(
  'exercises',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    userId: integer('user_id', { mode: 'number' }).notNull(),
    name: text('name').notNull(),
    sortIndex: integer('sort_index', { mode: 'number' }).notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    index('exercises_user_id_idx').on(t.userId),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id], name: 'exercises_user_id_fkey' })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)

export const sets = sqliteTable(
  'sets',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    exerciseId: integer('exercise_id', { mode: 'number' }).notNull(),
    userId: integer('user_id', { mode: 'number' }).notNull(),
    weight: real('weight').notNull(),
    reps: integer('reps', { mode: 'number' }).notNull(),
    date: text('date').notNull(),
    sortIndex: integer('sort_index', { mode: 'number' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    index('sets_user_id_idx').on(t.userId),
    index('sets_exercise_id_idx').on(t.exerciseId),
    index('sets_user_id_date_idx').on(t.userId, t.date),
    index('sets_user_id_exercise_id_date_idx').on(t.userId, t.exerciseId, t.date),
    foreignKey({ columns: [t.exerciseId], foreignColumns: [exercises.id], name: 'sets_exercise_id_fkey' })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id], name: 'sets_user_id_fkey' })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)

export const trainingMemos = sqliteTable(
  'training_memos',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    userId: integer('user_id', { mode: 'number' }).notNull(),
    date: text('date').notNull(),
    content: text('content').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    index('training_memos_user_id_date_idx').on(t.userId, t.date),
    foreignKey({
      columns: [t.userId],
      foreignColumns: [users.id],
      name: 'training_memos_user_id_fkey',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)

/// NextAuth — OAuth アカウント
export const accounts = sqliteTable(
  'accounts',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    userId: integer('user_id', { mode: 'number' }).notNull(),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at', { mode: 'number' }),
    tokenType: text('token_type'),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
  },
  (t) => [
    index('accounts_user_id_idx').on(t.userId),
    uniqueIndex('accounts_provider_provider_account_id_key').on(t.provider, t.providerAccountId),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id], name: 'accounts_user_id_fkey' })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)

/// NextAuth — セッション（データベースセッション戦略）
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    sessionToken: text('session_token').notNull(),
    userId: integer('user_id', { mode: 'number' }).notNull(),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    uniqueIndex('sessions_session_token_key').on(t.sessionToken),
    index('sessions_user_id_idx').on(t.userId),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id], name: 'sessions_user_id_fkey' })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)

export const timers = sqliteTable(
  'timers',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    userId: integer('user_id', { mode: 'number' }).notNull(),
    name: text('name').notNull(),
    sortIndex: integer('sort_index', { mode: 'number' }).notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    index('timers_user_id_idx').on(t.userId),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id], name: 'timers_user_id_fkey' })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)

export const unitTimers = sqliteTable(
  'unit_timers',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    timerId: integer('timer_id', { mode: 'number' }).notNull(),
    name: text('name'),
    sortIndex: integer('sort_index', { mode: 'number' }).notNull().default(0),
    duration: integer('duration', { mode: 'number' }).notNull(),
    countSound: text('count_sound'),
    countSoundLast3Sec: text('count_sound_last_3_sec'),
    endSound: text('end_sound'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    index('unit_timers_timer_id_idx').on(t.timerId),
    foreignKey({
      columns: [t.timerId],
      foreignColumns: [timers.id],
      name: 'unit_timers_timer_id_fkey',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)

/// 部位マスタ
export const bodyParts = sqliteTable(
  'body_parts',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    category: text('category', { enum: bodyPartCategoryValues }).notNull(),
    name: text('name').notNull(),
    sortIndex: integer('sort_index', { mode: 'number' }).notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    index('body_parts_category_idx').on(t.category),
    uniqueIndex('body_parts_category_name_key').on(t.category, t.name),
    // drizzle の sqlite text+enum は TS 型のみで CHECK を発行しないため、
    // Postgres enum の値域温存としてテーブル CHECK を明示する。
    check(
      'body_parts_category_check',
      bodyPartCategoryCheckSql(),
    ),
  ],
)

/// 種目-部位中間テーブル
export const exerciseBodyParts = sqliteTable(
  'exercise_body_parts',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    exerciseId: integer('exercise_id', { mode: 'number' }).notNull(),
    bodyPartId: integer('body_part_id', { mode: 'number' }).notNull(),
    loadRatio: integer('load_ratio', { mode: 'number' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    index('exercise_body_parts_exercise_id_idx').on(t.exerciseId),
    index('exercise_body_parts_body_part_id_idx').on(t.bodyPartId),
    uniqueIndex('exercise_body_parts_exercise_id_body_part_id_key').on(
      t.exerciseId,
      t.bodyPartId,
    ),
    foreignKey({
      columns: [t.exerciseId],
      foreignColumns: [exercises.id],
      name: 'exercise_body_parts_exercise_id_fkey',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      columns: [t.bodyPartId],
      foreignColumns: [bodyParts.id],
      name: 'exercise_body_parts_body_part_id_fkey',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)
