import { boolean, index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

/**
 * better-auth 既定スキーマ（ADR 0008）。
 *
 * 旧テーブル（`users` / `accounts` / `sessions`。`schema.ts` 参照）とは
 * 列構成が非互換のため、別テーブルとして追加する。
 *
 * better-auth v1.7 の既定モデルに準拠する。`account.issuer` は v1.7 で必須化された
 * OAuth アカウント識別子のため欠かせない。JS キーは camelCase、DB 列は
 * 既存テーブルと同様 snake_case とし、Drizzle アダプタの列名解決に任せる。
 */

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex('user_email_key').on(t.email)],
)

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { precision: 3 }).notNull(),
    token: text('token').notNull(),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [uniqueIndex('session_token_key').on(t.token), index('session_user_id_idx').on(t.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { precision: 3 }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { precision: 3 }),
    scope: text('scope'),
    password: text('password'),
    issuer: text('issuer').notNull(),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('account_user_id_idx').on(t.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { precision: 3 }).notNull(),
    createdAt: timestamp('created_at', { precision: 3 }).defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
)
