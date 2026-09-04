import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pgTable, timestamp, text, index, uniqueIndex, boolean, integer, serial, foreignKey, pgEnum, date, doublePrecision } from "drizzle-orm/pg-core";
const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3 }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date())
  },
  (t) => [uniqueIndex("user_email_key").on(t.email)]
);
const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { precision: 3 }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3 }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })
  },
  (t) => [uniqueIndex("session_token_key").on(t.token), index("session_user_id_idx").on(t.userId)]
);
const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { precision: 3 }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { precision: 3 }),
    scope: text("scope"),
    password: text("password"),
    issuer: text("issuer").notNull(),
    createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3 }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date())
  },
  (t) => [index("account_user_id_idx").on(t.userId)]
);
const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { precision: 3 }).notNull(),
    createdAt: timestamp("created_at", { precision: 3 }).defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3 }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date())
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)]
);
const bodyPartCategoryEnum = pgEnum("BodyPartCategory", [
  "CHEST",
  "BACK",
  "SHOULDER",
  "ARM",
  "ABS",
  "LEG"
]);
const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3 }).notNull()
  },
  (t) => [uniqueIndex("users_email_key").on(t.email)]
);
const exercises = pgTable(
  "exercises",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3 }).notNull()
  },
  (t) => [
    index("exercises_user_id_idx").on(t.userId),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id], name: "exercises_user_id_fkey" }).onDelete("cascade").onUpdate("cascade")
  ]
);
const sets = pgTable(
  "sets",
  {
    id: serial("id").primaryKey(),
    exerciseId: integer("exercise_id").notNull(),
    userId: integer("user_id").notNull(),
    weight: doublePrecision("weight").notNull(),
    reps: integer("reps").notNull(),
    date: date("date").notNull(),
    sortIndex: integer("sort_index").notNull(),
    createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3 }).notNull()
  },
  (t) => [
    index("sets_user_id_idx").on(t.userId),
    index("sets_exercise_id_idx").on(t.exerciseId),
    index("sets_user_id_date_idx").on(t.userId, t.date),
    index("sets_user_id_exercise_id_date_idx").on(t.userId, t.exerciseId, t.date),
    foreignKey({ columns: [t.exerciseId], foreignColumns: [exercises.id], name: "sets_exercise_id_fkey" }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id], name: "sets_user_id_fkey" }).onDelete("cascade").onUpdate("cascade")
  ]
);
const trainingMemos = pgTable(
  "training_memos",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    date: date("date").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3 }).notNull()
  },
  (t) => [
    index("training_memos_user_id_date_idx").on(t.userId, t.date),
    foreignKey({
      columns: [t.userId],
      foreignColumns: [users.id],
      name: "training_memos_user_id_fkey"
    }).onDelete("cascade").onUpdate("cascade")
  ]
);
const accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state")
  },
  (t) => [
    index("accounts_user_id_idx").on(t.userId),
    uniqueIndex("accounts_provider_provider_account_id_key").on(t.provider, t.providerAccountId),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id], name: "accounts_user_id_fkey" }).onDelete("cascade").onUpdate("cascade")
  ]
);
const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    sessionToken: text("session_token").notNull(),
    userId: integer("user_id").notNull(),
    expires: timestamp("expires", { precision: 3 }).notNull()
  },
  (t) => [
    uniqueIndex("sessions_session_token_key").on(t.sessionToken),
    index("sessions_user_id_idx").on(t.userId),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id], name: "sessions_user_id_fkey" }).onDelete("cascade").onUpdate("cascade")
  ]
);
const timers = pgTable(
  "timers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3 }).notNull()
  },
  (t) => [
    index("timers_user_id_idx").on(t.userId),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id], name: "timers_user_id_fkey" }).onDelete("cascade").onUpdate("cascade")
  ]
);
const unitTimers = pgTable(
  "unit_timers",
  {
    id: serial("id").primaryKey(),
    timerId: integer("timer_id").notNull(),
    name: text("name"),
    sortIndex: integer("sort_index").notNull().default(0),
    duration: integer("duration").notNull(),
    countSound: text("count_sound"),
    countSoundLast3Sec: text("count_sound_last_3_sec"),
    endSound: text("end_sound"),
    createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3 }).notNull()
  },
  (t) => [
    index("unit_timers_timer_id_idx").on(t.timerId),
    foreignKey({
      columns: [t.timerId],
      foreignColumns: [timers.id],
      name: "unit_timers_timer_id_fkey"
    }).onDelete("cascade").onUpdate("cascade")
  ]
);
const bodyParts = pgTable(
  "body_parts",
  {
    id: serial("id").primaryKey(),
    category: bodyPartCategoryEnum("category").notNull(),
    name: text("name").notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3 }).notNull()
  },
  (t) => [
    index("body_parts_category_idx").on(t.category),
    uniqueIndex("body_parts_category_name_key").on(t.category, t.name)
  ]
);
const exerciseBodyParts = pgTable(
  "exercise_body_parts",
  {
    id: serial("id").primaryKey(),
    exerciseId: integer("exercise_id").notNull(),
    bodyPartId: integer("body_part_id").notNull(),
    loadRatio: integer("load_ratio").notNull(),
    createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3 }).notNull()
  },
  (t) => [
    index("exercise_body_parts_exercise_id_idx").on(t.exerciseId),
    index("exercise_body_parts_body_part_id_idx").on(t.bodyPartId),
    uniqueIndex("exercise_body_parts_exercise_id_body_part_id_key").on(
      t.exerciseId,
      t.bodyPartId
    ),
    foreignKey({
      columns: [t.exerciseId],
      foreignColumns: [exercises.id],
      name: "exercise_body_parts_exercise_id_fkey"
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      columns: [t.bodyPartId],
      foreignColumns: [bodyParts.id],
      name: "exercise_body_parts_body_part_id_fkey"
    }).onDelete("cascade").onUpdate("cascade")
  ]
);
const schema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  account,
  accounts,
  bodyPartCategoryEnum,
  bodyParts,
  exerciseBodyParts,
  exercises,
  session,
  sessions,
  sets,
  timers,
  trainingMemos,
  unitTimers,
  user,
  users,
  verification
}, Symbol.toStringTag, { value: "Module" }));
const globalForDrizzle = globalThis;
function createDb(client) {
  return drizzle(client, { schema });
}
function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "postgres://localhost:5432/postgres";
  }
  throw new Error("DATABASE_URL is not set");
}
function getClient() {
  if (!globalForDrizzle.drizzleClient) {
    globalForDrizzle.drizzleClient = postgres(getDatabaseUrl(), { max: 1 });
  }
  return globalForDrizzle.drizzleClient;
}
const db = globalForDrizzle.db ?? createDb(getClient());
export {
  account as a,
  users as b,
  sets as c,
  db as d,
  exercises as e,
  timers as f,
  unitTimers as g,
  bodyParts as h,
  exerciseBodyParts as i,
  session as s,
  trainingMemos as t,
  user as u,
  verification as v
};
