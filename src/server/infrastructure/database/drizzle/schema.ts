import {
  date,
  doublePrecision,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

/**
 * Drizzle スキーマ定義
 *
 * 既存DB（9 migrations適用済み）に対して差分を出さない純粋移行のため、
 * テーブル名・カラム名・型・index名・unique名・FK名・enum名を既存定義から温存している。
 *
 * M4（ADR 0008）で追加した better-auth 既定テーブル（`user` / `session` /
 * `account` / `verification`）は `./auth-schema` で定義し、drizzle-kit の
 * 検出対象にするためここから再 export する。
 */
export { account, session, user, verification } from './auth-schema'

export const bodyPartCategoryEnum = pgEnum('BodyPartCategory', [
  'CHEST',
  'BACK',
  'SHOULDER',
  'ARM',
  'ABS',
  'LEG',
])

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 }).notNull(),
  },
  (t) => [uniqueIndex('users_email_key').on(t.email)],
)

export const exercises = pgTable(
  'exercises',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    name: text('name').notNull(),
    sortIndex: integer('sort_index').notNull().default(0),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 }).notNull(),
  },
  (t) => [
    index('exercises_user_id_idx').on(t.userId),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id], name: 'exercises_user_id_fkey' })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)

export const sets = pgTable(
  'sets',
  {
    id: serial('id').primaryKey(),
    exerciseId: integer('exercise_id').notNull(),
    userId: integer('user_id').notNull(),
    weight: doublePrecision('weight').notNull(),
    reps: integer('reps').notNull(),
    date: date('date').notNull(),
    sortIndex: integer('sort_index').notNull(),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 }).notNull(),
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

export const trainingMemos = pgTable(
  'training_memos',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    date: date('date').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 }).notNull(),
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
export const accounts = pgTable(
  'accounts',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'),
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
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    sessionToken: text('session_token').notNull(),
    userId: integer('user_id').notNull(),
    expires: timestamp('expires', { precision: 3 }).notNull(),
  },
  (t) => [
    uniqueIndex('sessions_session_token_key').on(t.sessionToken),
    index('sessions_user_id_idx').on(t.userId),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id], name: 'sessions_user_id_fkey' })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)

export const timers = pgTable(
  'timers',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    name: text('name').notNull(),
    sortIndex: integer('sort_index').notNull().default(0),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 }).notNull(),
  },
  (t) => [
    index('timers_user_id_idx').on(t.userId),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id], name: 'timers_user_id_fkey' })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)

export const unitTimers = pgTable(
  'unit_timers',
  {
    id: serial('id').primaryKey(),
    timerId: integer('timer_id').notNull(),
    name: text('name'),
    sortIndex: integer('sort_index').notNull().default(0),
    duration: integer('duration').notNull(),
    countSound: text('count_sound'),
    countSoundLast3Sec: text('count_sound_last_3_sec'),
    endSound: text('end_sound'),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 }).notNull(),
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
export const bodyParts = pgTable(
  'body_parts',
  {
    id: serial('id').primaryKey(),
    category: bodyPartCategoryEnum('category').notNull(),
    name: text('name').notNull(),
    sortIndex: integer('sort_index').notNull().default(0),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 }).notNull(),
  },
  (t) => [
    index('body_parts_category_idx').on(t.category),
    uniqueIndex('body_parts_category_name_key').on(t.category, t.name),
  ],
)

/// 種目-部位中間テーブル
export const exerciseBodyParts = pgTable(
  'exercise_body_parts',
  {
    id: serial('id').primaryKey(),
    exerciseId: integer('exercise_id').notNull(),
    bodyPartId: integer('body_part_id').notNull(),
    loadRatio: integer('load_ratio').notNull(),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 }).notNull(),
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
