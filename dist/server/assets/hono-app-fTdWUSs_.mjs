import { Hono } from "hono";
import { H as HEALTH_PAYLOAD } from "./router-Bm5ENF0-.mjs";
import { Redis } from "@upstash/redis";
import superjson from "superjson";
import { d as db, e as exercises, c as sets, t as trainingMemos, f as timers, g as unitTimers, h as bodyParts, i as exerciseBodyParts } from "./client-XWGVBEAR.mjs";
import { eq, and, gte, lte, desc, asc, ne, inArray, sql, max } from "drizzle-orm";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@mui/material";
import "@mui/icons-material/Close";
import "@mui/icons-material/GetApp";
import "react";
import "@mui/material/styles";
import "../server.mjs";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "drizzle-orm/postgres-js";
import "postgres";
import "drizzle-orm/pg-core";
const DEFAULT_TTL_SECONDS = 300;
class CacheService {
  constructor() {
    this.redis = null;
    this.prefix = "lifro";
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      });
    }
  }
  /**
   * キャッシュが有効かどうか
   */
  isEnabled() {
    return this.redis !== null;
  }
  /**
   * キャッシュキーを生成
   * 形式: lifro:{userId}:{domain}:{method}:{params}
   */
  buildKey(userId, domain, method, params) {
    const parts = [this.prefix, userId, domain, method];
    if (params) {
      parts.push(params);
    }
    return parts.join(":");
  }
  /**
   * キャッシュからデータを取得
   */
  async get(key) {
    if (!this.redis) {
      return null;
    }
    try {
      const data = await this.redis.get(key);
      if (data === null) {
        return null;
      }
      return superjson.deserialize(data);
    } catch (error) {
      console.error("[CacheService] get error:", error);
      return null;
    }
  }
  /**
   * キャッシュにデータを保存
   */
  async set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
    if (!this.redis) {
      return;
    }
    try {
      const serialized = superjson.serialize(value);
      await this.redis.set(key, serialized, { ex: ttlSeconds });
    } catch (error) {
      console.error("[CacheService] set error:", error);
    }
  }
  /**
   * キャッシュを削除
   */
  async delete(key) {
    if (!this.redis) {
      return;
    }
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error("[CacheService] delete error:", error);
    }
  }
  /**
   * プレフィックスに一致するキャッシュを一括削除
   * ワイルドカードパターンをサポート
   */
  async deleteByPrefix(prefix) {
    if (!this.redis) {
      return;
    }
    try {
      let cursor = "0";
      const pattern = `${prefix}*`;
      do {
        const result = await this.redis.scan(cursor, {
          match: pattern,
          count: 100
        });
        cursor = String(result[0]);
        const keys = result[1];
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== "0");
    } catch (error) {
      console.error("[CacheService] deleteByPrefix error:", error);
    }
  }
  /**
   * ユーザーの特定ドメインのキャッシュを全て削除
   */
  async invalidateUserDomain(userId, domain) {
    const prefix = `${this.prefix}:${userId}:${domain}:`;
    await this.deleteByPrefix(prefix);
  }
  /**
   * ユーザーの複数ドメインのキャッシュを一括削除
   */
  async invalidateUserDomains(userId, domains) {
    await Promise.all(domains.map((domain) => this.invalidateUserDomain(userId, domain)));
  }
  /**
   * キャッシュスルーパターン
   * キャッシュがあれば返し、なければ fetcher を実行してキャッシュに保存
   */
  async through(key, fetcher, ttlSeconds = DEFAULT_TTL_SECONDS) {
    if (!this.redis) {
      return fetcher();
    }
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }
    const data = await fetcher();
    await this.set(key, data, ttlSeconds);
    return data;
  }
}
const cacheService = new CacheService();
const toDateString = (date) => typeof date === "string" ? date.slice(0, 10) : date.toISOString().split("T")[0];
const toISOString = (date) => typeof date === "string" ? date : date.toISOString();
const toLocalDateString = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};
class DrizzleTrainingRepository {
  async findByMonth(userId, year, month) {
    const startStr = toLocalDateString(new Date(year, month - 1, 1));
    const endStr = toLocalDateString(new Date(year, month, 0));
    const [setRows, memoRows] = await Promise.all([
      db.select({ set: sets, exercise: exercises }).from(sets).innerJoin(exercises, eq(sets.exerciseId, exercises.id)).where(
        and(
          eq(sets.userId, userId),
          gte(sets.date, startStr),
          lte(sets.date, endStr)
        )
      ).orderBy(desc(sets.date), asc(sets.sortIndex)),
      db.select().from(trainingMemos).where(
        and(
          eq(trainingMemos.userId, userId),
          gte(trainingMemos.date, startStr),
          lte(trainingMemos.date, endStr)
        )
      ).orderBy(asc(trainingMemos.createdAt))
    ]);
    const memosByDate = /* @__PURE__ */ new Map();
    for (const memo of memoRows) {
      const dateKey = toDateString(memo.date);
      if (!memosByDate.has(dateKey)) {
        memosByDate.set(dateKey, []);
      }
      memosByDate.get(dateKey)?.push({
        id: memo.id,
        userId: memo.userId,
        date: toDateString(memo.date),
        content: memo.content,
        createdAt: toISOString(memo.createdAt),
        updatedAt: toISOString(memo.updatedAt)
      });
    }
    const grouped = /* @__PURE__ */ new Map();
    for (const row of setRows) {
      const dateKey = toDateString(row.set.date);
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)?.push(row);
    }
    const summaries = [];
    for (const [dateKey, dateSets] of grouped) {
      const exerciseNames = [...new Set(dateSets.map((s) => s.exercise.name))];
      const totalVolume = dateSets.reduce((sum, s) => sum + s.set.weight * s.set.reps, 0);
      const exerciseVolumeMap = /* @__PURE__ */ new Map();
      for (const row of dateSets) {
        const current = exerciseVolumeMap.get(row.set.exerciseId);
        if (current) {
          current.volume += row.set.weight * row.set.reps;
        } else {
          exerciseVolumeMap.set(row.set.exerciseId, {
            exerciseId: row.set.exerciseId,
            exerciseName: row.exercise.name,
            volume: row.set.weight * row.set.reps
          });
        }
      }
      const exercisesList = [...exerciseVolumeMap.values()];
      summaries.push({
        date: dateKey,
        // string型
        exerciseNames,
        exercises: exercisesList,
        totalVolume,
        setCount: dateSets.length,
        memos: memosByDate.get(dateKey) || []
      });
    }
    return summaries;
  }
  async findByDate(userId, date) {
    const rows = await db.select({ set: sets, exercise: exercises }).from(sets).innerJoin(exercises, eq(sets.exerciseId, exercises.id)).where(and(eq(sets.userId, userId), eq(sets.date, date))).orderBy(asc(sets.sortIndex));
    if (rows.length === 0) {
      return null;
    }
    return {
      date,
      // string型をそのまま返す
      userId,
      sets: rows.map((r) => ({
        id: r.set.id,
        exerciseId: r.set.exerciseId,
        userId: r.set.userId,
        weight: r.set.weight,
        reps: r.set.reps,
        date: toDateString(r.set.date),
        sortIndex: r.set.sortIndex,
        createdAt: toISOString(r.set.createdAt),
        updatedAt: toISOString(r.set.updatedAt),
        exercise: {
          id: r.exercise.id,
          userId: r.exercise.userId,
          name: r.exercise.name,
          sortIndex: r.exercise.sortIndex,
          createdAt: toISOString(r.exercise.createdAt),
          updatedAt: toISOString(r.exercise.updatedAt)
        }
      }))
    };
  }
  async save(userId, date, setsInput) {
    await db.transaction(async (tx) => {
      await tx.delete(sets).where(and(eq(sets.userId, userId), eq(sets.date, date)));
      if (setsInput.length > 0) {
        const now = /* @__PURE__ */ new Date();
        await tx.insert(sets).values(
          setsInput.map((s) => ({
            exerciseId: s.exerciseId,
            userId,
            weight: s.weight,
            reps: s.reps,
            date,
            sortIndex: s.sortIndex,
            createdAt: now,
            updatedAt: now
          }))
        );
      }
    });
    const result = await this.findByDate(userId, date);
    return result ?? { date, userId, sets: [] };
  }
  async deleteByDate(userId, date) {
    await db.delete(sets).where(and(eq(sets.userId, userId), eq(sets.date, date)));
  }
  async getLatestHistory(userId, exerciseId, excludeDate) {
    const rows = await db.select({ set: sets, exercise: exercises }).from(sets).innerJoin(exercises, eq(sets.exerciseId, exercises.id)).where(
      and(
        eq(sets.userId, userId),
        eq(sets.exerciseId, exerciseId),
        ...excludeDate ? [ne(sets.date, excludeDate)] : []
      )
    ).orderBy(desc(sets.date), desc(sets.sortIndex)).limit(1);
    const latestSet = rows[0];
    if (!latestSet) {
      return null;
    }
    return {
      exerciseId: latestSet.set.exerciseId,
      exerciseName: latestSet.exercise.name,
      weight: latestSet.set.weight,
      reps: latestSet.set.reps,
      date: toDateString(latestSet.set.date)
    };
  }
  async getLatestExerciseSets(userId, exerciseId, excludeDate) {
    const latestRows = await db.select({ date: sets.date }).from(sets).where(
      and(
        eq(sets.userId, userId),
        eq(sets.exerciseId, exerciseId),
        ...excludeDate ? [ne(sets.date, excludeDate)] : []
      )
    ).orderBy(desc(sets.date)).limit(1);
    const latestSet = latestRows[0];
    if (!latestSet) {
      return null;
    }
    const rows = await db.select({ set: sets, exercise: exercises }).from(sets).innerJoin(exercises, eq(sets.exerciseId, exercises.id)).where(
      and(
        eq(sets.userId, userId),
        eq(sets.exerciseId, exerciseId),
        eq(sets.date, latestSet.date)
      )
    ).orderBy(asc(sets.sortIndex));
    if (rows.length === 0) {
      return null;
    }
    return {
      exerciseId: rows[0].set.exerciseId,
      exerciseName: rows[0].exercise.name,
      date: toDateString(rows[0].set.date),
      sets: rows.map((r) => ({
        weight: r.set.weight,
        reps: r.set.reps,
        sortIndex: r.set.sortIndex
      }))
    };
  }
  async getLatestExerciseSetsMultiple(userId, exerciseIds, excludeDate) {
    if (exerciseIds.length === 0) {
      return /* @__PURE__ */ new Map();
    }
    const allRows = await db.select({ set: sets, exercise: exercises }).from(sets).innerJoin(exercises, eq(sets.exerciseId, exercises.id)).where(
      and(
        eq(sets.userId, userId),
        inArray(sets.exerciseId, exerciseIds),
        ...excludeDate ? [ne(sets.date, excludeDate)] : []
      )
    ).orderBy(desc(sets.date), asc(sets.sortIndex));
    const latestDateByExercise = /* @__PURE__ */ new Map();
    for (const row of allRows) {
      if (!latestDateByExercise.has(row.set.exerciseId)) {
        latestDateByExercise.set(row.set.exerciseId, toDateString(row.set.date));
      }
    }
    const result = /* @__PURE__ */ new Map();
    for (const row of allRows) {
      const latestDate = latestDateByExercise.get(row.set.exerciseId);
      if (!latestDate || toDateString(row.set.date) !== latestDate) {
        continue;
      }
      if (!result.has(row.set.exerciseId)) {
        result.set(row.set.exerciseId, {
          exerciseId: row.set.exerciseId,
          exerciseName: row.exercise.name,
          date: toDateString(row.set.date),
          sets: []
        });
      }
      result.get(row.set.exerciseId)?.sets.push({
        weight: row.set.weight,
        reps: row.set.reps,
        sortIndex: row.set.sortIndex
      });
    }
    return result;
  }
  async getAvailableYearMonths(userId) {
    const result = await db.execute(sql`
      SELECT
        EXTRACT(YEAR FROM date)::int AS year,
        EXTRACT(MONTH FROM date)::int AS month
      FROM sets
      WHERE user_id = ${userId}
      GROUP BY year, month
      ORDER BY year DESC, month DESC
    `);
    return [...result];
  }
}
const trainingRepository = new DrizzleTrainingRepository();
function escapeLikePattern(value) {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
class DrizzleExerciseRepository {
  async findAllByUserId(userId) {
    const rows = await db.select().from(exercises).where(eq(exercises.userId, userId)).orderBy(asc(exercises.sortIndex));
    return rows.map((e) => ({
      id: e.id,
      userId: e.userId,
      name: e.name,
      sortIndex: e.sortIndex,
      createdAt: toISOString(e.createdAt),
      updatedAt: toISOString(e.updatedAt)
    }));
  }
  async searchByName(userId, query) {
    const pattern = `%${escapeLikePattern(query)}%`;
    const rows = await db.select().from(exercises).where(
      and(eq(exercises.userId, userId), sql`${exercises.name} ILIKE ${pattern} ESCAPE '\\'`)
    ).orderBy(asc(exercises.sortIndex));
    return rows.map((e) => ({
      id: e.id,
      userId: e.userId,
      name: e.name,
      sortIndex: e.sortIndex,
      createdAt: toISOString(e.createdAt),
      updatedAt: toISOString(e.updatedAt)
    }));
  }
  async create(userId, name) {
    const maxRows = await db.select({ value: max(exercises.sortIndex) }).from(exercises).where(eq(exercises.userId, userId));
    const nextSortIndex = (maxRows[0]?.value ?? -1) + 1;
    const [exercise] = await db.insert(exercises).values({
      userId,
      name,
      sortIndex: nextSortIndex,
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    if (!exercise) throw new Error("Failed to create exercise");
    return {
      id: exercise.id,
      userId: exercise.userId,
      name: exercise.name,
      sortIndex: exercise.sortIndex,
      createdAt: toISOString(exercise.createdAt),
      updatedAt: toISOString(exercise.updatedAt)
    };
  }
  async update(userId, exerciseId, name) {
    const [exercise] = await db.update(exercises).set({ name, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId))).returning();
    if (!exercise) {
      throw new Error("Exercise not found or not owned by user");
    }
    return {
      id: exercise.id,
      userId: exercise.userId,
      name: exercise.name,
      sortIndex: exercise.sortIndex,
      createdAt: toISOString(exercise.createdAt),
      updatedAt: toISOString(exercise.updatedAt)
    };
  }
  async updateSortOrder(userId, exercisesInput) {
    if (exercisesInput.length === 0) return;
    const values = sql.join(
      exercisesInput.map((e) => sql`(${e.id}::int, ${e.sortIndex}::int)`),
      sql`, `
    );
    await db.execute(sql`
      UPDATE exercises AS e
      SET sort_index = v.sort_index, updated_at = NOW()
      FROM (VALUES ${values}) AS v(id, sort_index)
      WHERE e.id = v.id AND e.user_id = ${userId}
    `);
  }
  async delete(userId, exerciseId) {
    const [deleted] = await db.delete(exercises).where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId))).returning({ id: exercises.id });
    if (!deleted) {
      throw new Error("Exercise not found or not owned by user");
    }
  }
  async hasRelatedSets(userId, exerciseId) {
    const rows = await db.select({ id: sets.id }).from(sets).where(and(eq(sets.exerciseId, exerciseId), eq(sets.userId, userId))).limit(1);
    return rows.length > 0;
  }
}
const exerciseRepository = new DrizzleExerciseRepository();
class DrizzleTrainingMemoRepository {
  async findByDate(userId, date) {
    const memos = await db.select().from(trainingMemos).where(and(eq(trainingMemos.userId, userId), eq(trainingMemos.date, date))).orderBy(asc(trainingMemos.createdAt));
    return memos.map((m) => ({
      id: m.id,
      userId: m.userId,
      date: toDateString(m.date),
      content: m.content,
      createdAt: toISOString(m.createdAt),
      updatedAt: toISOString(m.updatedAt)
    }));
  }
  async findDatesWithMemoByMonth(userId, year, month) {
    const startStr = toLocalDateString(new Date(year, month - 1, 1));
    const endStr = toLocalDateString(new Date(year, month, 0));
    const memos = await db.selectDistinct({ date: trainingMemos.date }).from(trainingMemos).where(
      and(
        eq(trainingMemos.userId, userId),
        gte(trainingMemos.date, startStr),
        lte(trainingMemos.date, endStr)
      )
    );
    return memos.map((m) => toDateString(m.date));
  }
  async create(userId, date, content) {
    const [memo] = await db.insert(trainingMemos).values({
      userId,
      date,
      content,
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    if (!memo) throw new Error("Failed to create training memo");
    return {
      id: memo.id,
      userId: memo.userId,
      date: toDateString(memo.date),
      content: memo.content,
      createdAt: toISOString(memo.createdAt),
      updatedAt: toISOString(memo.updatedAt)
    };
  }
  async update(userId, memoId, content) {
    const [memo] = await db.update(trainingMemos).set({ content, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(trainingMemos.id, memoId), eq(trainingMemos.userId, userId))).returning();
    if (!memo) {
      throw new Error("Training memo not found or not owned by user");
    }
    return {
      id: memo.id,
      userId: memo.userId,
      date: toDateString(memo.date),
      content: memo.content,
      createdAt: toISOString(memo.createdAt),
      updatedAt: toISOString(memo.updatedAt)
    };
  }
  async delete(userId, memoId) {
    const [deleted] = await db.delete(trainingMemos).where(and(eq(trainingMemos.id, memoId), eq(trainingMemos.userId, userId))).returning({ id: trainingMemos.id });
    if (!deleted) {
      throw new Error("Training memo not found or not owned by user");
    }
  }
  async saveAll(userId, date, memos) {
    return await db.transaction(async (tx) => {
      const existingMemos = await tx.select().from(trainingMemos).where(and(eq(trainingMemos.userId, userId), eq(trainingMemos.date, date)));
      const existingIds = existingMemos.map((m) => m.id);
      const inputIds = memos.filter((m) => m.id !== void 0).map((m) => m.id);
      const toDelete = existingIds.filter((id) => !inputIds.includes(id));
      const toUpdate = memos.filter(
        (m) => m.id !== void 0 && existingIds.includes(m.id)
      );
      const toCreate = memos.filter((m) => m.id === void 0);
      if (toDelete.length > 0) {
        await tx.delete(trainingMemos).where(and(inArray(trainingMemos.id, toDelete), eq(trainingMemos.userId, userId)));
      }
      for (const memo of toUpdate) {
        await tx.update(trainingMemos).set({ content: memo.content, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(trainingMemos.id, memo.id), eq(trainingMemos.userId, userId)));
      }
      if (toCreate.length > 0) {
        await tx.insert(trainingMemos).values(
          toCreate.map((m) => ({
            userId,
            date,
            content: m.content,
            updatedAt: /* @__PURE__ */ new Date()
          }))
        );
      }
      const result = await tx.select().from(trainingMemos).where(and(eq(trainingMemos.userId, userId), eq(trainingMemos.date, date))).orderBy(asc(trainingMemos.createdAt));
      return result.map((m) => ({
        id: m.id,
        userId: m.userId,
        date: toDateString(m.date),
        content: m.content,
        createdAt: toISOString(m.createdAt),
        updatedAt: toISOString(m.updatedAt)
      }));
    });
  }
}
const trainingMemoRepository = new DrizzleTrainingMemoRepository();
function toUnitTimer(u) {
  return {
    id: u.id,
    timerId: u.timerId,
    name: u.name,
    sortIndex: u.sortIndex,
    duration: u.duration,
    countSound: u.countSound,
    countSoundLast3Sec: u.countSoundLast3Sec,
    endSound: u.endSound,
    createdAt: toISOString(u.createdAt),
    updatedAt: toISOString(u.updatedAt)
  };
}
function toTimer(t) {
  return {
    id: t.id,
    userId: t.userId,
    name: t.name,
    sortIndex: t.sortIndex,
    createdAt: toISOString(t.createdAt),
    updatedAt: toISOString(t.updatedAt),
    unitTimers: t.unitTimers.map(toUnitTimer).sort((a, b) => a.sortIndex - b.sortIndex)
  };
}
async function findUnitsByTimerIds(timerIds) {
  const byTimerId = /* @__PURE__ */ new Map();
  if (timerIds.length === 0) return byTimerId;
  const rows = await db.select().from(unitTimers).where(inArray(unitTimers.timerId, timerIds)).orderBy(asc(unitTimers.sortIndex));
  for (const row of rows) {
    const list = byTimerId.get(row.timerId) ?? [];
    list.push(row);
    byTimerId.set(row.timerId, list);
  }
  return byTimerId;
}
async function findTimerWithUnits(timerId, userId) {
  const timerRows = await db.select().from(timers).where(
    userId !== void 0 ? and(eq(timers.id, timerId), eq(timers.userId, userId)) : eq(timers.id, timerId)
  ).limit(1);
  const timer = timerRows[0];
  if (!timer) return null;
  const unitsByTimerId = await findUnitsByTimerIds([timerId]);
  return { ...timer, unitTimers: unitsByTimerId.get(timerId) ?? [] };
}
class DrizzleTimerRepository {
  async findAllByUserId(userId) {
    const timerRows = await db.select().from(timers).where(eq(timers.userId, userId)).orderBy(asc(timers.sortIndex));
    if (timerRows.length === 0) return [];
    const unitsByTimerId = await findUnitsByTimerIds(timerRows.map((t) => t.id));
    return timerRows.map(
      (timer) => toTimer({ ...timer, unitTimers: unitsByTimerId.get(timer.id) ?? [] })
    );
  }
  async findById(userId, timerId) {
    const timer = await findTimerWithUnits(timerId, userId);
    return timer ? toTimer(timer) : null;
  }
  async create(userId, input) {
    const maxRows = await db.select({ value: max(timers.sortIndex) }).from(timers).where(eq(timers.userId, userId));
    const nextSortIndex = (maxRows[0]?.value ?? -1) + 1;
    const now = /* @__PURE__ */ new Date();
    const created = await db.transaction(async (tx) => {
      const [timer] = await tx.insert(timers).values({
        userId,
        name: input.name,
        sortIndex: nextSortIndex,
        createdAt: now,
        updatedAt: now
      }).returning();
      if (!timer) throw new Error("Failed to create timer");
      const createdUnits = input.unitTimers.length > 0 ? await tx.insert(unitTimers).values(
        input.unitTimers.map((u, index) => ({
          timerId: timer.id,
          name: u.name,
          sortIndex: index,
          duration: u.duration,
          countSound: u.countSound,
          countSoundLast3Sec: u.countSoundLast3Sec,
          endSound: u.endSound,
          createdAt: now,
          updatedAt: now
        }))
      ).returning() : [];
      return { ...timer, unitTimers: createdUnits };
    });
    return toTimer(created);
  }
  async update(userId, timerId, input) {
    await db.transaction(async (tx) => {
      const [updated] = await tx.update(timers).set({ name: input.name, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(timers.id, timerId), eq(timers.userId, userId))).returning();
      if (!updated) {
        throw new Error("Timer not found or not owned by user");
      }
      await tx.delete(unitTimers).where(eq(unitTimers.timerId, timerId));
      const now = /* @__PURE__ */ new Date();
      if (input.unitTimers.length > 0) {
        await tx.insert(unitTimers).values(
          input.unitTimers.map((u, index) => ({
            timerId,
            name: u.name,
            sortIndex: index,
            duration: u.duration,
            countSound: u.countSound,
            countSoundLast3Sec: u.countSoundLast3Sec,
            endSound: u.endSound,
            createdAt: now,
            updatedAt: now
          }))
        );
      }
    });
    const timer = await findTimerWithUnits(timerId, userId);
    if (!timer) {
      throw new Error("Timer not found");
    }
    return toTimer(timer);
  }
  async updateSortOrder(userId, timersInput) {
    if (timersInput.length === 0) return;
    const values = sql.join(
      timersInput.map((t) => sql`(${t.id}::int, ${t.sortIndex}::int)`),
      sql`, `
    );
    await db.execute(sql`
      UPDATE timers AS t
      SET sort_index = v.sort_index, updated_at = NOW()
      FROM (VALUES ${values}) AS v(id, sort_index)
      WHERE t.id = v.id AND t.user_id = ${userId}
    `);
  }
  async delete(userId, timerId) {
    const [deleted] = await db.delete(timers).where(and(eq(timers.id, timerId), eq(timers.userId, userId))).returning({ id: timers.id });
    if (!deleted) {
      throw new Error("Timer not found or not owned by user");
    }
  }
}
const timerRepository = new DrizzleTimerRepository();
class DrizzleBodyPartRepository {
  async findAll() {
    const rows = await db.select().from(bodyParts).orderBy(asc(bodyParts.category), asc(bodyParts.sortIndex));
    return rows.map((bp) => ({
      id: bp.id,
      category: bp.category,
      name: bp.name,
      sortIndex: bp.sortIndex,
      createdAt: toISOString(bp.createdAt),
      updatedAt: toISOString(bp.updatedAt)
    }));
  }
  async findByCategory(category) {
    const rows = await db.select().from(bodyParts).where(eq(bodyParts.category, category)).orderBy(asc(bodyParts.sortIndex));
    return rows.map((bp) => ({
      id: bp.id,
      category: bp.category,
      name: bp.name,
      sortIndex: bp.sortIndex,
      createdAt: toISOString(bp.createdAt),
      updatedAt: toISOString(bp.updatedAt)
    }));
  }
  async findById(id) {
    const rows = await db.select().from(bodyParts).where(eq(bodyParts.id, id)).limit(1);
    const bodyPart = rows[0];
    if (!bodyPart) return null;
    return {
      id: bodyPart.id,
      category: bodyPart.category,
      name: bodyPart.name,
      sortIndex: bodyPart.sortIndex,
      createdAt: toISOString(bodyPart.createdAt),
      updatedAt: toISOString(bodyPart.updatedAt)
    };
  }
}
const bodyPartRepository = new DrizzleBodyPartRepository();
const BodyPartCategoryOrder = [
  "CHEST",
  "BACK",
  "SHOULDER",
  "ARM",
  "ABS",
  "LEG"
];
function toBodyPart(bp) {
  return {
    id: bp.id,
    category: bp.category,
    name: bp.name,
    sortIndex: bp.sortIndex,
    createdAt: toISOString(bp.createdAt),
    updatedAt: toISOString(bp.updatedAt)
  };
}
function toExerciseBodyPart(ebp) {
  return {
    id: ebp.id,
    exerciseId: ebp.exerciseId,
    bodyPartId: ebp.bodyPartId,
    loadRatio: ebp.loadRatio,
    createdAt: toISOString(ebp.createdAt),
    updatedAt: toISOString(ebp.updatedAt),
    bodyPart: toBodyPart(ebp.bodyPart)
  };
}
class DrizzleExerciseBodyPartRepository {
  async findByExerciseId(exerciseId) {
    const rows = await db.select({ exerciseBodyPart: exerciseBodyParts, bodyPart: bodyParts }).from(exerciseBodyParts).innerJoin(bodyParts, eq(exerciseBodyParts.bodyPartId, bodyParts.id)).where(eq(exerciseBodyParts.exerciseId, exerciseId)).orderBy(desc(exerciseBodyParts.loadRatio));
    return rows.map(
      (r) => toExerciseBodyPart({ ...r.exerciseBodyPart, bodyPart: r.bodyPart })
    );
  }
  async saveAll(userId, exerciseId, bodyPartsInput) {
    const exerciseRows = await db.select({ id: exercises.id }).from(exercises).where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId))).limit(1);
    if (exerciseRows.length === 0) {
      throw new Error("Exercise not found or not owned by user");
    }
    const totalRatio = bodyPartsInput.reduce((sum, bp) => sum + bp.loadRatio, 0);
    if (bodyPartsInput.length > 0 && totalRatio !== 100) {
      throw new Error("Total load ratio must be 100%");
    }
    await db.transaction(async (tx) => {
      await tx.delete(exerciseBodyParts).where(eq(exerciseBodyParts.exerciseId, exerciseId));
      if (bodyPartsInput.length > 0) {
        const now = /* @__PURE__ */ new Date();
        await tx.insert(exerciseBodyParts).values(
          bodyPartsInput.map((bp) => ({
            exerciseId,
            bodyPartId: bp.bodyPartId,
            loadRatio: bp.loadRatio,
            createdAt: now,
            updatedAt: now
          }))
        );
      }
    });
    return this.findByExerciseId(exerciseId);
  }
  async findAllWithBodyParts(userId) {
    const exerciseRows = await db.select().from(exercises).where(eq(exercises.userId, userId)).orderBy(asc(exercises.sortIndex));
    if (exerciseRows.length === 0) return [];
    const ebpRows = await db.select({ exerciseBodyPart: exerciseBodyParts, bodyPart: bodyParts }).from(exerciseBodyParts).innerJoin(bodyParts, eq(exerciseBodyParts.bodyPartId, bodyParts.id)).where(
      inArray(
        exerciseBodyParts.exerciseId,
        exerciseRows.map((e) => e.id)
      )
    ).orderBy(desc(exerciseBodyParts.loadRatio));
    const bodyPartsByExerciseId = /* @__PURE__ */ new Map();
    for (const r of ebpRows) {
      const list = bodyPartsByExerciseId.get(r.exerciseBodyPart.exerciseId) ?? [];
      list.push(toExerciseBodyPart({ ...r.exerciseBodyPart, bodyPart: r.bodyPart }));
      bodyPartsByExerciseId.set(r.exerciseBodyPart.exerciseId, list);
    }
    const result = exerciseRows.map((e) => {
      const bodyPartsList = bodyPartsByExerciseId.get(e.id) ?? [];
      const primaryCategory = bodyPartsList.length > 0 ? bodyPartsList[0].bodyPart?.category : null;
      return {
        id: e.id,
        userId: e.userId,
        name: e.name,
        sortIndex: e.sortIndex,
        createdAt: toISOString(e.createdAt),
        updatedAt: toISOString(e.updatedAt),
        bodyParts: bodyPartsList,
        primaryCategory
      };
    });
    result.sort((a, b) => {
      const categoryOrderA = a.primaryCategory ? BodyPartCategoryOrder.indexOf(a.primaryCategory) : Number.MAX_SAFE_INTEGER;
      const categoryOrderB = b.primaryCategory ? BodyPartCategoryOrder.indexOf(b.primaryCategory) : Number.MAX_SAFE_INTEGER;
      if (categoryOrderA !== categoryOrderB) {
        return categoryOrderA - categoryOrderB;
      }
      return a.sortIndex - b.sortIndex;
    });
    return result;
  }
}
const exerciseBodyPartRepository = new DrizzleExerciseBodyPartRepository();
class TrainingService {
  constructor(repository = trainingRepository) {
    this.repository = repository;
  }
  /**
   * 指定月のトレーニング一覧を取得
   */
  async getMonthlyTrainings(userId, year, month) {
    const cacheKey = cacheService.buildKey(
      userId,
      "training",
      "getMonthlyTrainings",
      `${year}-${month}`
    );
    return cacheService.through(cacheKey, () => this.repository.findByMonth(userId, year, month));
  }
  /**
   * 特定日のトレーニング詳細を取得
   * @param date YYYY-MM-DD形式
   */
  async getTrainingByDate(userId, date) {
    const cacheKey = cacheService.buildKey(userId, "training", "getTrainingByDate", date);
    return cacheService.through(cacheKey, () => this.repository.findByDate(userId, date));
  }
  /**
   * トレーニングを保存
   * @param date YYYY-MM-DD形式
   */
  async saveTraining(userId, date, sets2) {
    const setsWithIndex = sets2.map((s, i) => ({
      ...s,
      sortIndex: s.sortIndex ?? i
    }));
    const result = await this.repository.save(userId, date, setsWithIndex);
    await cacheService.invalidateUserDomains(userId, ["training", "statistics"]);
    return result;
  }
  /**
   * トレーニングを削除
   * @param date YYYY-MM-DD形式
   */
  async deleteTraining(userId, date) {
    await this.repository.deleteByDate(userId, date);
    await cacheService.invalidateUserDomains(userId, ["training", "statistics"]);
  }
  /**
   * 種目の前回値を取得
   * @param excludeDate 除外する日付（YYYY-MM-DD形式、この日付のセットは対象外）
   */
  async getLatestExerciseHistory(userId, exerciseId, excludeDate) {
    return this.repository.getLatestHistory(userId, exerciseId, excludeDate);
  }
  /**
   * 直近実施日の当該種目の全セットを取得
   * @param excludeDate 除外する日付（YYYY-MM-DD形式、この日付のセットは対象外）
   */
  async getLatestExerciseSets(userId, exerciseId, excludeDate) {
    return this.repository.getLatestExerciseSets(userId, exerciseId, excludeDate);
  }
  /**
   * 複数種目の直近実施日の全セットを一括取得
   * @param excludeDate 除外する日付（YYYY-MM-DD形式、この日付のセットは対象外）
   */
  async getLatestExerciseSetsMultiple(userId, exerciseIds, excludeDate) {
    return this.repository.getLatestExerciseSetsMultiple(userId, exerciseIds, excludeDate);
  }
  /**
   * セット情報が存在する年月の一覧を取得（降順）
   */
  async getAvailableYearMonths(userId) {
    const cacheKey = cacheService.buildKey(userId, "training", "getAvailableYearMonths");
    return cacheService.through(cacheKey, () => this.repository.getAvailableYearMonths(userId));
  }
}
const trainingService = new TrainingService();
class ExerciseService {
  constructor(repository = exerciseRepository) {
    this.repository = repository;
  }
  /**
   * ユーザーの全種目を取得（sortIndex順）
   */
  async getAllExercises(userId) {
    const cacheKey = cacheService.buildKey(userId, "exercise", "getAllExercises");
    return cacheService.through(cacheKey, () => this.repository.findAllByUserId(userId));
  }
  /**
   * 種目名で検索
   */
  async searchExercises(userId, query) {
    if (!query.trim()) {
      return this.getAllExercises(userId);
    }
    const cacheKey = cacheService.buildKey(userId, "exercise", "searchExercises", query);
    return cacheService.through(cacheKey, () => this.repository.searchByName(userId, query));
  }
  /**
   * 種目を作成
   */
  async createExercise(userId, name) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("種目名は必須です");
    }
    const result = await this.repository.create(userId, trimmedName);
    await cacheService.invalidateUserDomain(userId, "exercise");
    return result;
  }
  /**
   * 種目名を更新
   */
  async updateExercise(userId, exerciseId, name) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("種目名は必須です");
    }
    const result = await this.repository.update(userId, exerciseId, trimmedName);
    await cacheService.invalidateUserDomain(userId, "exercise");
    return result;
  }
  /**
   * 種目の並び順を更新
   */
  async updateSortOrder(userId, exercises2) {
    await this.repository.updateSortOrder(userId, exercises2);
    await cacheService.invalidateUserDomain(userId, "exercise");
  }
  /**
   * 種目を削除可能かチェック
   * @returns true: 削除可能, false: セットが紐づいているため削除不可
   */
  async canDelete(userId, exerciseId) {
    const hasRelatedSets = await this.repository.hasRelatedSets(userId, exerciseId);
    return !hasRelatedSets;
  }
  /**
   * 種目を削除
   */
  async deleteExercise(userId, exerciseId) {
    await this.repository.delete(userId, exerciseId);
    await cacheService.invalidateUserDomain(userId, "exercise");
  }
}
const exerciseService = new ExerciseService();
dayjs.extend(isoWeek);
class StatisticsService {
  /**
   * 日付を期間キーに変換
   */
  formatPeriodKey(date, granularity) {
    switch (granularity) {
      case "day":
        return date.format("YYYY-MM-DD");
      case "week":
        return `${date.isoWeekYear()}-W${String(date.isoWeek()).padStart(2, "0")}`;
      case "month":
        return date.format("YYYY-MM");
    }
  }
  /**
   * PostgreSQL用の期間フォーマット文字列を取得（drizzle sqlで使用）
   */
  getPeriodFormatSql(granularity) {
    switch (granularity) {
      case "day":
        return sql.raw("'YYYY-MM-DD'");
      case "week":
        return sql.raw(`'IYYY-"W"IW'`);
      case "month":
        return sql.raw("'YYYY-MM'");
    }
  }
  /**
   * 期間内の全期間キーを生成（最適化版）
   */
  generatePeriodKeys(startDate, endDate, granularity) {
    const keys = [];
    let current = dayjs(startDate);
    const end = dayjs(endDate);
    const seen = /* @__PURE__ */ new Set();
    const step = granularity === "day" ? "day" : granularity === "week" ? "week" : "month";
    while (current.isBefore(end) || current.isSame(end, "day")) {
      const key = this.formatPeriodKey(current, granularity);
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
      current = current.add(1, step);
    }
    return keys;
  }
  /**
   * 種目別ボリュームを期間ごとに取得（積み上げグラフ用）
   * SQL集計版
   */
  async getVolumeByExercise(userId, startDate, endDate, granularity) {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    const cacheKey = cacheService.buildKey(
      userId,
      "statistics",
      "getVolumeByExercise",
      `${startStr}_${endStr}_${granularity}`
    );
    return cacheService.through(cacheKey, async () => {
      const periodFormatSql = this.getPeriodFormatSql(granularity);
      const results = await db.execute(sql`
        SELECT
          to_char(s.date, ${periodFormatSql}) as period,
          s.exercise_id,
          e.name as exercise_name,
          SUM(s.weight * s.reps)::float as volume,
          COUNT(*)::bigint as set_count
        FROM sets s
        JOIN exercises e ON e.id = s.exercise_id
        WHERE s.user_id = ${userId}
          AND s.date >= ${startDate}
          AND s.date <= ${endDate}
        GROUP BY 1, s.exercise_id, e.name
        ORDER BY period ASC
      `);
      return results.map((r) => ({
        period: r.period,
        exerciseId: r.exercise_id,
        exerciseName: r.exercise_name,
        volume: r.volume,
        setCount: Number(r.set_count)
      }));
    });
  }
  /**
   * 種目別ボリューム合計を取得（リスト用、ボリューム降順）
   * SQL集計版
   */
  async getExerciseVolumeTotals(userId, startDate, endDate) {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    const cacheKey = cacheService.buildKey(
      userId,
      "statistics",
      "getExerciseVolumeTotals",
      `${startStr}_${endStr}`
    );
    return cacheService.through(cacheKey, async () => {
      const results = await db.execute(sql`
        SELECT
          s.exercise_id,
          e.name as exercise_name,
          SUM(s.weight * s.reps)::float as volume,
          COUNT(*)::bigint as set_count
        FROM sets s
        JOIN exercises e ON e.id = s.exercise_id
        WHERE s.user_id = ${userId}
          AND s.date >= ${startDate}
          AND s.date <= ${endDate}
        GROUP BY s.exercise_id, e.name
        ORDER BY volume DESC
      `);
      return results.map((r) => ({
        exerciseId: r.exercise_id,
        exerciseName: r.exercise_name,
        volume: r.volume,
        setCount: Number(r.set_count)
      }));
    });
  }
  /**
   * 期間ごとの合計ボリュームを取得
   * SQL集計版
   */
  async getVolumeByPeriod(userId, startDate, endDate, granularity) {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    const cacheKey = cacheService.buildKey(
      userId,
      "statistics",
      "getVolumeByPeriod",
      `${startStr}_${endStr}_${granularity}`
    );
    return cacheService.through(cacheKey, async () => {
      const periodFormatSql = this.getPeriodFormatSql(granularity);
      const results = await db.execute(sql`
        SELECT
          to_char(date, ${periodFormatSql}) as period,
          SUM(weight * reps)::float as volume
        FROM sets
        WHERE user_id = ${userId}
          AND date >= ${startDate}
          AND date <= ${endDate}
        GROUP BY 1
      `);
      const volumeMap = /* @__PURE__ */ new Map();
      for (const r of results) {
        volumeMap.set(r.period, r.volume);
      }
      const periodKeys = this.generatePeriodKeys(startDate, endDate, granularity);
      return periodKeys.map((period) => ({
        period,
        volume: volumeMap.get(period) || 0
      }));
    });
  }
  /**
   * 種目別の最大重量推移を取得
   * SQL集計版
   */
  async getMaxWeightHistory(userId, exerciseId, startDate, endDate, granularity) {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    const cacheKey = cacheService.buildKey(
      userId,
      "statistics",
      "getMaxWeightHistory",
      `${exerciseId}_${startStr}_${endStr}_${granularity}`
    );
    return cacheService.through(cacheKey, async () => {
      const periodFormatSql = this.getPeriodFormatSql(granularity);
      const results = await db.execute(sql`
        SELECT
          to_char(date, ${periodFormatSql}) as period,
          MAX(weight)::float as max_weight
        FROM sets
        WHERE user_id = ${userId}
          AND exercise_id = ${exerciseId}
          AND date >= ${startDate}
          AND date <= ${endDate}
        GROUP BY 1
        ORDER BY period ASC
      `);
      const maxWeightMap = /* @__PURE__ */ new Map();
      for (const r of results) {
        maxWeightMap.set(r.period, r.max_weight);
      }
      const periodKeys = this.generatePeriodKeys(startDate, endDate, granularity);
      const result = [];
      for (const period of periodKeys) {
        const weight = maxWeightMap.get(period);
        if (weight !== void 0) {
          result.push({ period, weight });
        }
      }
      return result;
    });
  }
  /**
   * 種目別の1RM推移を取得
   * 1RM = weight × (1 + reps / 29.5)
   * SQL集計版
   */
  async getOneRMHistory(userId, exerciseId, startDate, endDate, granularity) {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    const cacheKey = cacheService.buildKey(
      userId,
      "statistics",
      "getOneRMHistory",
      `${exerciseId}_${startStr}_${endStr}_${granularity}`
    );
    return cacheService.through(cacheKey, async () => {
      const periodFormatSql = this.getPeriodFormatSql(granularity);
      const results = await db.execute(sql`
        SELECT
          to_char(date, ${periodFormatSql}) as period,
          MAX(weight * (1 + reps / 29.5))::float as max_one_rm
        FROM sets
        WHERE user_id = ${userId}
          AND exercise_id = ${exerciseId}
          AND date >= ${startDate}
          AND date <= ${endDate}
        GROUP BY 1
        ORDER BY period ASC
      `);
      const oneRMMap = /* @__PURE__ */ new Map();
      for (const r of results) {
        oneRMMap.set(r.period, r.max_one_rm);
      }
      const periodKeys = this.generatePeriodKeys(startDate, endDate, granularity);
      const result = [];
      for (const period of periodKeys) {
        const oneRM = oneRMMap.get(period);
        if (oneRM !== void 0) {
          result.push({ period, oneRM: Math.round(oneRM * 10) / 10 });
        }
      }
      return result;
    });
  }
  /**
   * 統計サマリーを取得
   * SQL集計版
   */
  async getSummary(userId) {
    const cacheKey = cacheService.buildKey(userId, "statistics", "getSummary");
    return cacheService.through(cacheKey, async () => {
      const statsResult = await db.execute(sql`
        SELECT
          SUM(weight * reps)::float as total_volume,
          COUNT(*)::bigint as total_sets,
          COUNT(DISTINCT date)::bigint as total_workouts
        FROM sets
        WHERE user_id = ${userId}
      `);
      const stats = statsResult[0];
      if (!stats || Number(stats.total_sets) === 0) {
        return {
          totalVolume: 0,
          totalSets: 0,
          totalWorkouts: 0,
          currentStreak: 0,
          maxStreak: 0
        };
      }
      const datesResult = await db.execute(sql`
        SELECT DISTINCT date
        FROM sets
        WHERE user_id = ${userId}
        ORDER BY date DESC
      `);
      const sortedDates = datesResult.map((r) => dayjs(r.date).format("YYYY-MM-DD"));
      const { currentStreak, maxStreak } = this.calculateStreaks(sortedDates);
      return {
        totalVolume: stats.total_volume || 0,
        totalSets: Number(stats.total_sets),
        totalWorkouts: Number(stats.total_workouts),
        currentStreak,
        maxStreak
      };
    });
  }
  /**
   * 継続統計を取得（日数、連続週数、連続月数）
   * SQL集計版（二重クエリ問題を修正）
   */
  async getContinuityStats(userId, startDate, endDate) {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    const cacheKey = cacheService.buildKey(
      userId,
      "statistics",
      "getContinuityStats",
      `${startStr}_${endStr}`
    );
    return cacheService.through(cacheKey, async () => {
      const totalDaysResult = await db.execute(sql`
        SELECT COUNT(DISTINCT date)::bigint as total_days
        FROM sets
        WHERE user_id = ${userId}
          AND date >= ${startDate}
          AND date <= ${endDate}
      `);
      const totalDays = Number(totalDaysResult[0]?.total_days || 0);
      if (totalDays === 0) {
        return {
          totalDays: 0,
          currentStreakWeeks: 0,
          currentStreakMonths: 0
        };
      }
      const oneYearAgo = dayjs().subtract(1, "year").toDate();
      const datesResult = await db.execute(sql`
        SELECT DISTINCT date
        FROM sets
        WHERE user_id = ${userId}
          AND date >= ${oneYearAgo}
        ORDER BY date DESC
      `);
      const allUniqueDates = datesResult.map((r) => dayjs(r.date).format("YYYY-MM-DD"));
      const weeksWithTraining = /* @__PURE__ */ new Set();
      for (const dateStr of allUniqueDates) {
        const date = dayjs(dateStr);
        weeksWithTraining.add(`${date.isoWeekYear()}-W${String(date.isoWeek()).padStart(2, "0")}`);
      }
      const monthsWithTraining = /* @__PURE__ */ new Set();
      for (const dateStr of allUniqueDates) {
        const date = dayjs(dateStr);
        monthsWithTraining.add(date.format("YYYY-MM"));
      }
      const currentStreakWeeks = this.calculatePeriodStreak(
        Array.from(weeksWithTraining).sort().reverse(),
        "week"
      );
      const currentStreakMonths = this.calculatePeriodStreak(
        Array.from(monthsWithTraining).sort().reverse(),
        "month"
      );
      return {
        totalDays,
        currentStreakWeeks,
        currentStreakMonths
      };
    });
  }
  /**
   * 期間ごとのトレーニング日数を取得（グラフ用）
   * SQL集計版
   */
  async getTrainingDaysByPeriod(userId, startDate, endDate, granularity) {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    const cacheKey = cacheService.buildKey(
      userId,
      "statistics",
      "getTrainingDaysByPeriod",
      `${startStr}_${endStr}_${granularity}`
    );
    return cacheService.through(cacheKey, async () => {
      const periodFormatSql = this.getPeriodFormatSql(granularity);
      const results = await db.execute(sql`
        SELECT
          to_char(date, ${periodFormatSql}) as period,
          COUNT(DISTINCT date)::bigint as days
        FROM sets
        WHERE user_id = ${userId}
          AND date >= ${startDate}
          AND date <= ${endDate}
        GROUP BY 1
      `);
      const daysMap = /* @__PURE__ */ new Map();
      for (const r of results) {
        daysMap.set(r.period, Number(r.days));
      }
      const periodKeys = this.generatePeriodKeys(startDate, endDate, granularity);
      return periodKeys.map((period) => ({
        period,
        days: daysMap.get(period) || 0
      }));
    });
  }
  /**
   * 種目別トレーニング日数を取得（リスト用、日数降順）
   * SQL集計版
   */
  async getExerciseTrainingDays(userId, startDate, endDate) {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    const cacheKey = cacheService.buildKey(
      userId,
      "statistics",
      "getExerciseTrainingDays",
      `${startStr}_${endStr}`
    );
    return cacheService.through(cacheKey, async () => {
      const results = await db.execute(sql`
        SELECT
          s.exercise_id,
          e.name as exercise_name,
          COUNT(DISTINCT s.date)::bigint as days
        FROM sets s
        JOIN exercises e ON e.id = s.exercise_id
        WHERE s.user_id = ${userId}
          AND s.date >= ${startDate}
          AND s.date <= ${endDate}
        GROUP BY s.exercise_id, e.name
        ORDER BY days DESC
      `);
      return results.map((r) => ({
        exerciseId: r.exercise_id,
        exerciseName: r.exercise_name,
        days: Number(r.days)
      }));
    });
  }
  /**
   * 週/月の連続継続を計算
   */
  calculatePeriodStreak(sortedPeriodsDesc, type) {
    if (sortedPeriodsDesc.length === 0) {
      return 0;
    }
    const today = dayjs();
    const currentPeriod = type === "week" ? `${today.isoWeekYear()}-W${String(today.isoWeek()).padStart(2, "0")}` : today.format("YYYY-MM");
    const previousPeriod = type === "week" ? `${today.subtract(1, "week").isoWeekYear()}-W${String(today.subtract(1, "week").isoWeek()).padStart(2, "0")}` : today.subtract(1, "month").format("YYYY-MM");
    const latestPeriod = sortedPeriodsDesc[0];
    if (latestPeriod !== currentPeriod && latestPeriod !== previousPeriod) {
      return 0;
    }
    let streak = 1;
    for (let i = 1; i < sortedPeriodsDesc.length; i++) {
      const current = sortedPeriodsDesc[i - 1];
      const prev = sortedPeriodsDesc[i];
      const expectedPrev = this.getPreviousPeriod(current, type);
      if (prev === expectedPrev) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }
  /**
   * 前の期間を取得
   */
  getPreviousPeriod(period, type) {
    if (type === "month") {
      const [year2, month] = period.split("-").map(Number);
      const date = dayjs(`${year2}-${String(month).padStart(2, "0")}-01`).subtract(1, "month");
      return date.format("YYYY-MM");
    }
    const match = period.match(/(\d{4})-W(\d{2})/);
    if (!match) return "";
    const [, yearStr, weekStr] = match;
    const year = Number(yearStr);
    const week = Number(weekStr);
    const jan4 = dayjs(`${year}-01-04`);
    const firstMondayOfYear = jan4.subtract(jan4.day() === 0 ? 6 : jan4.day() - 1, "day");
    const targetMonday = firstMondayOfYear.add((week - 1) * 7, "day");
    const prevWeekDate = targetMonday.subtract(1, "week");
    return `${prevWeekDate.isoWeekYear()}-W${String(prevWeekDate.isoWeek()).padStart(2, "0")}`;
  }
  /**
   * 継続日数を計算
   */
  calculateStreaks(sortedDatesDesc) {
    if (sortedDatesDesc.length === 0) {
      return { currentStreak: 0, maxStreak: 0 };
    }
    let currentStreak = 0;
    let maxStreak = 0;
    let streak = 1;
    const today = dayjs().format("YYYY-MM-DD");
    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    const latestDate = sortedDatesDesc[0];
    const isCurrentStreakActive = latestDate === today || latestDate === yesterday;
    for (let i = 1; i < sortedDatesDesc.length; i++) {
      const currentDate = dayjs(sortedDatesDesc[i - 1]);
      const previousDate = dayjs(sortedDatesDesc[i]);
      const diff = currentDate.diff(previousDate, "day");
      if (diff === 1) {
        streak++;
      } else {
        if (i === 1 || isCurrentStreakActive) {
          currentStreak = streak;
        }
        maxStreak = Math.max(maxStreak, streak);
        streak = 1;
      }
    }
    if (isCurrentStreakActive && currentStreak === 0) {
      currentStreak = streak;
    }
    maxStreak = Math.max(maxStreak, streak);
    return { currentStreak, maxStreak };
  }
  /**
   * 部位別ボリューム合計を取得（リスト用、ボリューム降順）
   * カテゴリ単位または部位単位で集計可能
   */
  async getBodyPartVolumeTotals(userId, startDate, endDate, granularity) {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    const cacheKey = cacheService.buildKey(
      userId,
      "statistics",
      "getBodyPartVolumeTotals",
      `${startStr}_${endStr}_${granularity}`
    );
    return cacheService.through(cacheKey, async () => {
      if (granularity === "category") {
        const results2 = await db.execute(sql`
          SELECT
            bp.category,
            SUM(s.weight * s.reps * ebp.load_ratio / 100.0)::float as volume,
            COUNT(*)::bigint as set_count
          FROM sets s
          JOIN exercise_body_parts ebp ON ebp.exercise_id = s.exercise_id
          JOIN body_parts bp ON bp.id = ebp.body_part_id
          WHERE s.user_id = ${userId}
            AND s.date >= ${startDate}
            AND s.date <= ${endDate}
          GROUP BY bp.category
          ORDER BY volume DESC
        `);
        return results2.map((r) => ({
          bodyPartId: 0,
          // カテゴリ集計時は0
          category: r.category,
          bodyPartName: "",
          // カテゴリ集計時は空
          volume: r.volume,
          setCount: Number(r.set_count)
        }));
      }
      const results = await db.execute(sql`
          SELECT
            bp.id as body_part_id,
            bp.category,
            bp.name as body_part_name,
            SUM(s.weight * s.reps * ebp.load_ratio / 100.0)::float as volume,
            COUNT(*)::bigint as set_count
          FROM sets s
          JOIN exercise_body_parts ebp ON ebp.exercise_id = s.exercise_id
          JOIN body_parts bp ON bp.id = ebp.body_part_id
          WHERE s.user_id = ${userId}
            AND s.date >= ${startDate}
            AND s.date <= ${endDate}
          GROUP BY bp.id, bp.category, bp.name
          ORDER BY volume DESC
        `);
      return results.map((r) => ({
        bodyPartId: r.body_part_id,
        category: r.category,
        bodyPartName: r.body_part_name,
        volume: r.volume,
        setCount: Number(r.set_count)
      }));
    });
  }
  /**
   * 部位別ボリュームを期間ごとに取得（積み上げグラフ用）
   * カテゴリ単位または部位単位で集計可能
   */
  async getVolumeByBodyPart(userId, startDate, endDate, timeGranularity, bodyPartGranularity) {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    const cacheKey = cacheService.buildKey(
      userId,
      "statistics",
      "getVolumeByBodyPart",
      `${startStr}_${endStr}_${timeGranularity}_${bodyPartGranularity}`
    );
    return cacheService.through(cacheKey, async () => {
      const periodFormatSql = this.getPeriodFormatSql(timeGranularity);
      if (bodyPartGranularity === "category") {
        const results2 = await db.execute(sql`
          SELECT
            to_char(s.date, ${periodFormatSql}) as period,
            bp.category,
            SUM(s.weight * s.reps * ebp.load_ratio / 100.0)::float as volume
          FROM sets s
          JOIN exercise_body_parts ebp ON ebp.exercise_id = s.exercise_id
          JOIN body_parts bp ON bp.id = ebp.body_part_id
          WHERE s.user_id = ${userId}
            AND s.date >= ${startDate}
            AND s.date <= ${endDate}
          GROUP BY 1, bp.category
          ORDER BY period ASC
        `);
        return results2.map((r) => ({
          period: r.period,
          bodyPartId: 0,
          category: r.category,
          bodyPartName: "",
          volume: r.volume
        }));
      }
      const results = await db.execute(sql`
          SELECT
            to_char(s.date, ${periodFormatSql}) as period,
            bp.id as body_part_id,
            bp.category,
            bp.name as body_part_name,
            SUM(s.weight * s.reps * ebp.load_ratio / 100.0)::float as volume
          FROM sets s
          JOIN exercise_body_parts ebp ON ebp.exercise_id = s.exercise_id
          JOIN body_parts bp ON bp.id = ebp.body_part_id
          WHERE s.user_id = ${userId}
            AND s.date >= ${startDate}
            AND s.date <= ${endDate}
          GROUP BY 1, bp.id, bp.category, bp.name
          ORDER BY period ASC
        `);
      return results.map((r) => ({
        period: r.period,
        bodyPartId: r.body_part_id,
        category: r.category,
        bodyPartName: r.body_part_name,
        volume: r.volume
      }));
    });
  }
  /**
   * 部位別トレーニング日数を取得（リスト用、日数降順）
   * カテゴリ単位または部位単位で集計可能
   */
  async getBodyPartTrainingDays(userId, startDate, endDate, granularity) {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    const cacheKey = cacheService.buildKey(
      userId,
      "statistics",
      "getBodyPartTrainingDays",
      `${startStr}_${endStr}_${granularity}`
    );
    return cacheService.through(cacheKey, async () => {
      if (granularity === "category") {
        const results2 = await db.execute(sql`
          SELECT
            bp.category,
            COUNT(DISTINCT s.date)::bigint as days
          FROM sets s
          JOIN exercise_body_parts ebp ON ebp.exercise_id = s.exercise_id
          JOIN body_parts bp ON bp.id = ebp.body_part_id
          WHERE s.user_id = ${userId}
            AND s.date >= ${startDate}
            AND s.date <= ${endDate}
          GROUP BY bp.category
          ORDER BY days DESC
        `);
        return results2.map((r) => ({
          bodyPartId: 0,
          category: r.category,
          bodyPartName: "",
          days: Number(r.days)
        }));
      }
      const results = await db.execute(sql`
          SELECT
            bp.id as body_part_id,
            bp.category,
            bp.name as body_part_name,
            COUNT(DISTINCT s.date)::bigint as days
          FROM sets s
          JOIN exercise_body_parts ebp ON ebp.exercise_id = s.exercise_id
          JOIN body_parts bp ON bp.id = ebp.body_part_id
          WHERE s.user_id = ${userId}
            AND s.date >= ${startDate}
            AND s.date <= ${endDate}
          GROUP BY bp.id, bp.category, bp.name
          ORDER BY days DESC
        `);
      return results.map((r) => ({
        bodyPartId: r.body_part_id,
        category: r.category,
        bodyPartName: r.body_part_name,
        days: Number(r.days)
      }));
    });
  }
}
const statisticsService = new StatisticsService();
class TrainingMemoService {
  constructor(repository = trainingMemoRepository) {
    this.repository = repository;
  }
  /**
   * 指定日のメモ一覧を取得
   * @param date YYYY-MM-DD形式
   */
  async getMemosByDate(userId, date) {
    const cacheKey = cacheService.buildKey(userId, "memo", "getMemosByDate", date);
    return cacheService.through(cacheKey, () => this.repository.findByDate(userId, date));
  }
  /**
   * メモを作成
   * @param date YYYY-MM-DD形式
   */
  async createMemo(userId, date, content) {
    const result = await this.repository.create(userId, date, content);
    await cacheService.invalidateUserDomain(userId, "memo");
    return result;
  }
  /**
   * メモを更新
   */
  async updateMemo(userId, memoId, content) {
    const result = await this.repository.update(userId, memoId, content);
    await cacheService.invalidateUserDomain(userId, "memo");
    return result;
  }
  /**
   * メモを削除
   */
  async deleteMemo(userId, memoId) {
    await this.repository.delete(userId, memoId);
    await cacheService.invalidateUserDomain(userId, "memo");
  }
  /**
   * メモを一括保存
   * @param date YYYY-MM-DD形式
   */
  async saveMemos(userId, date, memos) {
    const result = await this.repository.saveAll(userId, date, memos);
    await cacheService.invalidateUserDomain(userId, "memo");
    return result;
  }
}
const trainingMemoService = new TrainingMemoService();
class TimerService {
  constructor(repository = timerRepository) {
    this.repository = repository;
  }
  /**
   * ユーザーの全タイマーを取得（sortIndex順）
   */
  async getAllTimers(userId) {
    const cacheKey = cacheService.buildKey(userId, "timer", "getAllTimers");
    return cacheService.through(cacheKey, () => this.repository.findAllByUserId(userId));
  }
  /**
   * タイマーをIDで取得
   */
  async getTimer(userId, timerId) {
    const cacheKey = cacheService.buildKey(userId, "timer", "getTimer", timerId.toString());
    return cacheService.through(cacheKey, () => this.repository.findById(userId, timerId));
  }
  /**
   * タイマーを作成
   */
  async createTimer(userId, input) {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error("タイマー名は必須です");
    }
    if (input.unitTimers.length === 0) {
      throw new Error("ユニットタイマーは1つ以上必要です");
    }
    for (const unitTimer of input.unitTimers) {
      if (unitTimer.duration <= 0) {
        throw new Error("タイマーの時間は1秒以上必要です");
      }
    }
    const result = await this.repository.create(userId, {
      ...input,
      name: trimmedName
    });
    await cacheService.invalidateUserDomain(userId, "timer");
    return result;
  }
  /**
   * タイマーを更新
   */
  async updateTimer(userId, timerId, input) {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error("タイマー名は必須です");
    }
    if (input.unitTimers.length === 0) {
      throw new Error("ユニットタイマーは1つ以上必要です");
    }
    for (const unitTimer of input.unitTimers) {
      if (unitTimer.duration <= 0) {
        throw new Error("タイマーの時間は1秒以上必要です");
      }
    }
    const result = await this.repository.update(userId, timerId, {
      ...input,
      name: trimmedName
    });
    await cacheService.invalidateUserDomain(userId, "timer");
    return result;
  }
  /**
   * タイマーの並び順を更新
   */
  async updateSortOrder(userId, timers2) {
    await this.repository.updateSortOrder(userId, timers2);
    await cacheService.invalidateUserDomain(userId, "timer");
  }
  /**
   * タイマーを削除
   */
  async deleteTimer(userId, timerId) {
    await this.repository.delete(userId, timerId);
    await cacheService.invalidateUserDomain(userId, "timer");
  }
}
const timerService = new TimerService();
class BodyPartService {
  /**
   * 全部位を取得（カテゴリ・sortIndex順）
   */
  async getAllBodyParts() {
    const cacheKey = cacheService.buildKey(0, "bodyPart", "getAllBodyParts");
    return cacheService.through(
      cacheKey,
      () => bodyPartRepository.findAll(),
      60 * 60
      // 1時間キャッシュ（マスタデータなので長め）
    );
  }
  /**
   * カテゴリ別に部位を取得
   */
  async getBodyPartsByCategory(category) {
    const cacheKey = cacheService.buildKey(0, "bodyPart", "getBodyPartsByCategory", category);
    return cacheService.through(
      cacheKey,
      () => bodyPartRepository.findByCategory(category),
      60 * 60
      // 1時間キャッシュ
    );
  }
  /**
   * ユーザーの全種目を部位情報付きで取得（主要カテゴリ順）
   */
  async getExercisesWithBodyParts(userId) {
    const cacheKey = cacheService.buildKey(userId, "exercise", "getExercisesWithBodyParts");
    return cacheService.through(
      cacheKey,
      () => exerciseBodyPartRepository.findAllWithBodyParts(userId)
    );
  }
  /**
   * 種目の部位紐付けを更新
   */
  async updateExerciseBodyParts(userId, exerciseId, bodyParts2) {
    await exerciseBodyPartRepository.saveAll(userId, exerciseId, bodyParts2);
    await cacheService.invalidateUserDomain(userId, "exercise");
    await cacheService.invalidateUserDomain(userId, "statistics");
  }
}
const bodyPartService = new BodyPartService();
const canDelete = new Hono().get("/:id/can-delete", async (c) => {
  const userId = c.get("userId");
  const exerciseId = Number(c.req.param("id"));
  const canDelete2 = await exerciseService.canDelete(userId, exerciseId);
  return c.json({ canDelete: canDelete2 });
});
const createExerciseSchema = z.object({
  name: z.string().min(1)
});
const createExercise = new Hono().post(
  "/",
  zValidator("json", createExerciseSchema),
  async (c) => {
    const userId = c.get("userId");
    const { name } = c.req.valid("json");
    const exercise = await exerciseService.createExercise(userId, name);
    return c.json(exercise, 201);
  }
);
const deleteExercise = new Hono().delete("/:id", async (c) => {
  const userId = c.get("userId");
  const exerciseId = Number(c.req.param("id"));
  await exerciseService.deleteExercise(userId, exerciseId);
  return c.json({ success: true });
});
const getBodyParts = new Hono().get("/body-parts", async (c) => {
  const bodyParts2 = await bodyPartService.getAllBodyParts();
  return c.json(bodyParts2);
});
const getExercises$1 = new Hono().get("/", async (c) => {
  const userId = c.get("userId");
  const exercises2 = await exerciseService.getAllExercises(userId);
  return c.json(exercises2);
});
const getExercisesWithBodyParts = new Hono().get(
  "/with-body-parts",
  async (c) => {
    const userId = c.get("userId");
    const exercises2 = await bodyPartService.getExercisesWithBodyParts(userId);
    return c.json(exercises2);
  }
);
const searchQuerySchema = z.object({
  q: z.string().optional().default("")
});
const searchExercises = new Hono().get(
  "/search",
  zValidator("query", searchQuerySchema),
  async (c) => {
    const userId = c.get("userId");
    const { q } = c.req.valid("query");
    const exercises2 = await exerciseService.searchExercises(userId, q);
    return c.json(exercises2);
  }
);
const updateExerciseSchema = z.object({
  name: z.string().min(1)
});
const updateExercise = new Hono().put(
  "/:id",
  zValidator("json", updateExerciseSchema),
  async (c) => {
    const userId = c.get("userId");
    const exerciseId = Number(c.req.param("id"));
    const { name } = c.req.valid("json");
    const exercise = await exerciseService.updateExercise(userId, exerciseId, name);
    return c.json(exercise);
  }
);
const bodyPartInputSchema = z.object({
  bodyPartId: z.number().int().positive(),
  loadRatio: z.number().int().min(0).max(100)
});
const requestSchema$1 = z.object({
  bodyParts: z.array(bodyPartInputSchema)
});
const updateExerciseBodyParts = new Hono().put(
  "/:exerciseId/body-parts",
  zValidator("json", requestSchema$1),
  async (c) => {
    const userId = c.get("userId");
    const exerciseId = Number(c.req.param("exerciseId"));
    const { bodyParts: bodyParts2 } = c.req.valid("json");
    if (bodyParts2.length > 0) {
      const totalRatio = bodyParts2.reduce((sum, bp) => sum + bp.loadRatio, 0);
      if (totalRatio !== 100) {
        return c.json({ error: "負荷割合の合計は100%にしてください" }, 400);
      }
    }
    await bodyPartService.updateExerciseBodyParts(userId, exerciseId, bodyParts2);
    return c.json({ success: true });
  }
);
const sortOrderSchema$1 = z.object({
  exercises: z.array(
    z.object({
      id: z.number(),
      sortIndex: z.number()
    })
  )
});
const updateSortOrder$1 = new Hono().put(
  "/sort-order",
  zValidator("json", sortOrderSchema$1),
  async (c) => {
    const userId = c.get("userId");
    const { exercises: exercises2 } = c.req.valid("json");
    await exerciseService.updateSortOrder(userId, exercises2);
    return c.json({ success: true });
  }
);
const checkExists = new Hono().get("/:date/exists", async (c) => {
  const userId = c.get("userId");
  const dateStr = c.req.param("date");
  const training = await trainingService.getTrainingByDate(userId, dateStr);
  const exists = training !== null && training.sets.length > 0;
  return c.json({ exists });
});
const deleteTraining = new Hono().delete("/:date", async (c) => {
  const userId = c.get("userId");
  const dateStr = c.req.param("date");
  await trainingService.deleteTraining(userId, dateStr);
  return c.json({ success: true });
});
const querySchema$f = z.object({
  excludeDate: z.string().optional()
  // YYYY-MM-DD形式
});
const getExerciseHistory = new Hono().get(
  "/exercises/:exerciseId/history",
  zValidator("query", querySchema$f),
  async (c) => {
    const userId = c.get("userId");
    const exerciseId = Number(c.req.param("exerciseId"));
    const { excludeDate } = c.req.valid("query");
    const history = await trainingService.getLatestExerciseHistory(userId, exerciseId, excludeDate);
    if (!history) return c.json(null);
    return c.json({ weight: history.weight, reps: history.reps });
  }
);
const querySchema$e = z.object({
  excludeDate: z.string().optional()
  // YYYY-MM-DD形式
});
const getLatestSets = new Hono().get(
  "/exercises/:exerciseId/latest-sets",
  zValidator("query", querySchema$e),
  async (c) => {
    const userId = c.get("userId");
    const exerciseId = Number(c.req.param("exerciseId"));
    const { excludeDate } = c.req.valid("query");
    const latestSets = await trainingService.getLatestExerciseSets(userId, exerciseId, excludeDate);
    return c.json(latestSets);
  }
);
const requestSchema = z.object({
  exerciseIds: z.array(z.number()),
  excludeDate: z.string().optional()
  // YYYY-MM-DD形式
});
const getLatestSetsMultiple = new Hono().post(
  "/exercises/latest-sets-multiple",
  zValidator("json", requestSchema),
  async (c) => {
    const userId = c.get("userId");
    const { exerciseIds, excludeDate } = c.req.valid("json");
    const resultMap = await trainingService.getLatestExerciseSetsMultiple(
      userId,
      exerciseIds,
      excludeDate
    );
    return c.json(Object.fromEntries(resultMap));
  }
);
const getMemos = new Hono().get("/:date/memos", async (c) => {
  const userId = c.get("userId");
  const dateStr = c.req.param("date");
  const memos = await trainingMemoService.getMemosByDate(userId, dateStr);
  return c.json(memos);
});
const getTrainingByDate = new Hono().get("/:date", async (c) => {
  const userId = c.get("userId");
  const dateStr = c.req.param("date");
  const training = await trainingService.getTrainingByDate(userId, dateStr);
  return c.json(training);
});
const querySchema$d = z.object({
  year: z.string().transform(Number),
  month: z.string().transform(Number)
});
const getTrainings = new Hono().get(
  "/",
  zValidator("query", querySchema$d),
  async (c) => {
    const userId = c.get("userId");
    const { year, month } = c.req.valid("query");
    const trainings = await trainingService.getMonthlyTrainings(userId, year, month);
    return c.json(trainings);
  }
);
const getYearMonths = new Hono().get("/year-months", async (c) => {
  const userId = c.get("userId");
  const yearMonths = await trainingService.getAvailableYearMonths(userId);
  return c.json(yearMonths);
});
const memoInputSchema = z.object({
  id: z.number().optional(),
  content: z.string()
});
const saveMemosSchema = z.object({
  memos: z.array(memoInputSchema)
});
const saveMemos = new Hono().put(
  "/:date/memos",
  zValidator("json", saveMemosSchema),
  async (c) => {
    const userId = c.get("userId");
    const dateStr = c.req.param("date");
    const { memos } = c.req.valid("json");
    const savedMemos = await trainingMemoService.saveMemos(userId, dateStr, memos);
    return c.json(savedMemos);
  }
);
const setInputSchema = z.object({
  id: z.number().optional(),
  exerciseId: z.number(),
  weight: z.number(),
  reps: z.number(),
  sortIndex: z.number()
});
const upsertTrainingSchema = z.object({
  sets: z.array(setInputSchema)
});
const upsertTraining = new Hono().put(
  "/:date",
  zValidator("json", upsertTrainingSchema),
  async (c) => {
    const userId = c.get("userId");
    const dateStr = c.req.param("date");
    const { sets: sets2 } = c.req.valid("json");
    const training = await trainingService.saveTraining(userId, dateStr, sets2);
    return c.json(training);
  }
);
function getStartDateFromPreset(preset) {
  const today = dayjs();
  switch (preset) {
    case "1month":
      return today.subtract(1, "month").toDate();
    case "3months":
      return today.subtract(3, "month").toDate();
    case "6months":
      return today.subtract(6, "month").toDate();
    case "1year":
      return today.subtract(1, "year").toDate();
    case "all":
      return /* @__PURE__ */ new Date("2000-01-01");
    default:
      return today.subtract(1, "month").toDate();
  }
}
function calculateDateRange(preset, customStartDate, customEndDate, defaultPreset = "1month") {
  const endDate = customEndDate ? dayjs(customEndDate).toDate() : dayjs().toDate();
  const startDate = customStartDate ? dayjs(customStartDate).toDate() : getStartDateFromPreset(preset || defaultPreset);
  return { startDate, endDate };
}
const getBodyPartTrainingDays = new Hono().get(
  "/body-part-training-days",
  async (c) => {
    const userId = c.get("userId");
    const { preset, startDate: customStartDate, endDate: customEndDate, granularity } = c.req.query();
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate);
    const bodyPartGranularity = granularity === "bodyPart" ? "bodyPart" : "category";
    const days = await statisticsService.getBodyPartTrainingDays(
      userId,
      startDate,
      endDate,
      bodyPartGranularity
    );
    return c.json(days);
  }
);
const querySchema$c = z.object({
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional(),
  granularity: z.enum(["category", "bodyPart"]).default("category")
});
const getBodyPartVolumeTotals = new Hono().get(
  "/body-part-volume-totals",
  zValidator("query", querySchema$c),
  async (c) => {
    const userId = c.get("userId");
    const { preset, customStartDate, customEndDate, granularity } = c.req.valid("query");
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate);
    const data = await statisticsService.getBodyPartVolumeTotals(userId, startDate, endDate, granularity);
    return c.json(data);
  }
);
const querySchema$b = z.object({
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional()
});
const getContinuityStats = new Hono().get(
  "/continuity-stats",
  zValidator("query", querySchema$b),
  async (c) => {
    const userId = c.get("userId");
    const { preset, customStartDate, customEndDate } = c.req.valid("query");
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate);
    const data = await statisticsService.getContinuityStats(userId, startDate, endDate);
    return c.json(data);
  }
);
const querySchema$a = z.object({
  granularity: z.enum(["day", "week", "month"]),
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional()
});
const getContinuityTab = new Hono().get(
  "/continuity",
  zValidator("query", querySchema$a),
  async (c) => {
    const userId = c.get("userId");
    const { granularity, preset, customStartDate, customEndDate } = c.req.valid("query");
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate);
    const [stats, daysByPeriod, exerciseDays] = await Promise.all([
      statisticsService.getContinuityStats(userId, startDate, endDate),
      statisticsService.getTrainingDaysByPeriod(userId, startDate, endDate, granularity),
      statisticsService.getExerciseTrainingDays(userId, startDate, endDate)
    ]);
    return c.json({
      stats,
      daysByPeriod,
      exerciseDays
    });
  }
);
const getExercises = new Hono().get("/exercises", async (c) => {
  const userId = c.get("userId");
  const exercises2 = await exerciseService.getAllExercises(userId);
  return c.json(exercises2);
});
const querySchema$9 = z.object({
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional()
});
const getExerciseTrainingDays = new Hono().get(
  "/exercise-training-days",
  zValidator("query", querySchema$9),
  async (c) => {
    const userId = c.get("userId");
    const { preset, customStartDate, customEndDate } = c.req.valid("query");
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate);
    const data = await statisticsService.getExerciseTrainingDays(userId, startDate, endDate);
    return c.json(data);
  }
);
const querySchema$8 = z.object({
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional()
});
const getExerciseVolumeTotals = new Hono().get(
  "/exercise-volume-totals",
  zValidator("query", querySchema$8),
  async (c) => {
    const userId = c.get("userId");
    const { preset, customStartDate, customEndDate } = c.req.valid("query");
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate);
    const data = await statisticsService.getExerciseVolumeTotals(userId, startDate, endDate);
    return c.json(data);
  }
);
const querySchema$7 = z.object({
  exerciseId: z.string().transform(Number),
  granularity: z.enum(["day", "week", "month"]),
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional()
});
const getMaxWeightHistory = new Hono().get(
  "/max-weight-history",
  zValidator("query", querySchema$7),
  async (c) => {
    const userId = c.get("userId");
    const { exerciseId, granularity, preset, customStartDate, customEndDate } = c.req.valid("query");
    const { startDate, endDate } = calculateDateRange(
      preset,
      customStartDate,
      customEndDate,
      "3months"
    );
    const data = await statisticsService.getMaxWeightHistory(
      userId,
      exerciseId,
      startDate,
      endDate,
      granularity
    );
    return c.json(data);
  }
);
const querySchema$6 = z.object({
  exerciseId: z.string().transform(Number),
  granularity: z.enum(["day", "week", "month"]),
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional()
});
const getOneRMHistory = new Hono().get(
  "/one-rm-history",
  zValidator("query", querySchema$6),
  async (c) => {
    const userId = c.get("userId");
    const { exerciseId, granularity, preset, customStartDate, customEndDate } = c.req.valid("query");
    const { startDate, endDate } = calculateDateRange(
      preset,
      customStartDate,
      customEndDate,
      "3months"
    );
    const data = await statisticsService.getOneRMHistory(
      userId,
      exerciseId,
      startDate,
      endDate,
      granularity
    );
    return c.json(data);
  }
);
const getSummary = new Hono().get("/summary", async (c) => {
  const userId = c.get("userId");
  const summary = await statisticsService.getSummary(userId);
  return c.json(summary);
});
const querySchema$5 = z.object({
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional()
});
const getTotalVolume = new Hono().get(
  "/total-volume",
  zValidator("query", querySchema$5),
  async (c) => {
    const userId = c.get("userId");
    const { preset, customStartDate, customEndDate } = c.req.valid("query");
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate);
    const totals = await statisticsService.getExerciseVolumeTotals(userId, startDate, endDate);
    const totalVolume = totals.reduce((sum, t) => sum + t.volume, 0);
    return c.json({ totalVolume });
  }
);
const querySchema$4 = z.object({
  granularity: z.enum(["day", "week", "month"]),
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional()
});
const getTrainingDaysByPeriod = new Hono().get(
  "/training-days-by-period",
  zValidator("query", querySchema$4),
  async (c) => {
    const userId = c.get("userId");
    const { granularity, preset, customStartDate, customEndDate } = c.req.valid("query");
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate);
    const data = await statisticsService.getTrainingDaysByPeriod(
      userId,
      startDate,
      endDate,
      granularity
    );
    return c.json(data);
  }
);
const querySchema$3 = z.object({
  granularity: z.enum(["day", "week", "month"]),
  bodyPartGranularity: z.enum(["category", "bodyPart"]).default("category"),
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional()
});
const getVolumeByBodyPart = new Hono().get(
  "/volume-by-body-part",
  zValidator("query", querySchema$3),
  async (c) => {
    const userId = c.get("userId");
    const { granularity, bodyPartGranularity, preset, customStartDate, customEndDate } = c.req.valid("query");
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate);
    const data = await statisticsService.getVolumeByBodyPart(
      userId,
      startDate,
      endDate,
      granularity,
      bodyPartGranularity
    );
    return c.json(data);
  }
);
const querySchema$2 = z.object({
  granularity: z.enum(["day", "week", "month"]),
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional()
});
const getVolumeByExercise = new Hono().get(
  "/volume-by-exercise",
  zValidator("query", querySchema$2),
  async (c) => {
    const userId = c.get("userId");
    const { granularity, preset, customStartDate, customEndDate } = c.req.valid("query");
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate);
    const data = await statisticsService.getVolumeByExercise(
      userId,
      startDate,
      endDate,
      granularity
    );
    return c.json(data);
  }
);
const querySchema$1 = z.object({
  granularity: z.enum(["day", "week", "month"]),
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional()
});
const getVolumeTab = new Hono().get(
  "/volume",
  zValidator("query", querySchema$1),
  async (c) => {
    const userId = c.get("userId");
    const { granularity, preset, customStartDate, customEndDate } = c.req.valid("query");
    const { startDate, endDate } = calculateDateRange(preset, customStartDate, customEndDate);
    const [volumeByExercise, exerciseVolumeTotals] = await Promise.all([
      statisticsService.getVolumeByExercise(userId, startDate, endDate, granularity),
      statisticsService.getExerciseVolumeTotals(userId, startDate, endDate)
    ]);
    const totalVolume = exerciseVolumeTotals.reduce((sum, t) => sum + t.volume, 0);
    return c.json({
      totalVolume,
      volumeByExercise,
      exerciseVolumeTotals
    });
  }
);
const querySchema = z.object({
  exerciseId: z.string().transform(Number),
  granularity: z.enum(["day", "week", "month"]),
  preset: z.string().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional()
});
const getWeightTab = new Hono().get(
  "/weight",
  zValidator("query", querySchema),
  async (c) => {
    const userId = c.get("userId");
    const { exerciseId, granularity, preset, customStartDate, customEndDate } = c.req.valid("query");
    const { startDate, endDate } = calculateDateRange(
      preset,
      customStartDate,
      customEndDate,
      "3months"
    );
    const [maxWeightHistory, oneRMHistory] = await Promise.all([
      statisticsService.getMaxWeightHistory(userId, exerciseId, startDate, endDate, granularity),
      statisticsService.getOneRMHistory(userId, exerciseId, startDate, endDate, granularity)
    ]);
    return c.json({
      maxWeightHistory,
      oneRMHistory
    });
  }
);
const unitTimerInputSchema$1 = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  sortIndex: z.number(),
  duration: z.number(),
  countSound: z.string().nullable(),
  countSoundLast3Sec: z.string().nullable(),
  endSound: z.string().nullable()
});
const timerInputSchema$1 = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  sortIndex: z.number(),
  unitTimers: z.array(unitTimerInputSchema$1)
});
const createTimer = new Hono().post(
  "/",
  zValidator("json", timerInputSchema$1),
  async (c) => {
    const userId = c.get("userId");
    const input = c.req.valid("json");
    const timer = await timerService.createTimer(userId, input);
    return c.json(timer, 201);
  }
);
const deleteTimer = new Hono().delete("/:id", async (c) => {
  const userId = c.get("userId");
  const timerId = Number(c.req.param("id"));
  await timerService.deleteTimer(userId, timerId);
  return c.json({ success: true });
});
const getSounds = new Hono().get("/sounds", async (c) => {
  try {
    const host = c.req.header("host") || "localhost:3000";
    const protocol = c.req.header("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;
    const response = await fetch(`${baseUrl}/sounds/manifest.json`, {
      cache: "no-store"
    });
    if (!response.ok) {
      console.error("Failed to fetch sound manifest:", response.status);
      return c.json([]);
    }
    const sounds = await response.json();
    return c.json(sounds);
  } catch (error) {
    console.error("Failed to fetch sound manifest:", error);
    return c.json([]);
  }
});
const getTimer = new Hono().get("/:id", async (c) => {
  const userId = c.get("userId");
  const timerId = Number(c.req.param("id"));
  const timer = await timerService.getTimer(userId, timerId);
  return c.json(timer);
});
const getTimers = new Hono().get("/", async (c) => {
  const userId = c.get("userId");
  const timers2 = await timerService.getAllTimers(userId);
  return c.json(timers2);
});
const sortOrderSchema = z.object({
  timers: z.array(
    z.object({
      id: z.number(),
      sortIndex: z.number()
    })
  )
});
const updateSortOrder = new Hono().put(
  "/sort-order",
  zValidator("json", sortOrderSchema),
  async (c) => {
    const userId = c.get("userId");
    const { timers: timers2 } = c.req.valid("json");
    await timerService.updateSortOrder(userId, timers2);
    return c.json({ success: true });
  }
);
const unitTimerInputSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  sortIndex: z.number(),
  duration: z.number(),
  countSound: z.string().nullable(),
  countSoundLast3Sec: z.string().nullable(),
  endSound: z.string().nullable()
});
const timerInputSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  sortIndex: z.number(),
  unitTimers: z.array(unitTimerInputSchema)
});
const updateTimer = new Hono().put(
  "/:id",
  zValidator("json", timerInputSchema),
  async (c) => {
    const userId = c.get("userId");
    const timerId = Number(c.req.param("id"));
    const input = c.req.valid("json");
    const timer = await timerService.updateTimer(userId, timerId, input);
    return c.json(timer);
  }
);
function buildExercisesApp(mw) {
  return new Hono().use("*", mw).route("/", getBodyParts).route("/", getExercisesWithBodyParts).route("/", searchExercises).route("/", updateSortOrder$1).route("/", getExercises$1).route("/", createExercise).route("/", canDelete).route("/", updateExerciseBodyParts).route("/", updateExercise).route("/", deleteExercise);
}
function buildTrainingsApp(mw) {
  return new Hono().use("*", mw).route("/", getYearMonths).route("/", getLatestSetsMultiple).route("/", getExerciseHistory).route("/", getLatestSets).route("/", getTrainings).route("/", checkExists).route("/", getMemos).route("/", saveMemos).route("/", getTrainingByDate).route("/", upsertTraining).route("/", deleteTraining);
}
function buildStatisticsApp(mw) {
  return new Hono().use("*", mw).route("/", getSummary).route("/", getExercises).route("/", getVolumeTab).route("/", getWeightTab).route("/", getContinuityTab).route("/", getVolumeByExercise).route("/", getVolumeByBodyPart).route("/", getExerciseVolumeTotals).route("/", getBodyPartVolumeTotals).route("/", getTotalVolume).route("/", getMaxWeightHistory).route("/", getOneRMHistory).route("/", getContinuityStats).route("/", getTrainingDaysByPeriod).route("/", getExerciseTrainingDays).route("/", getBodyPartTrainingDays);
}
function buildTimersApp(mw) {
  return new Hono().use("*", mw).route("/", getSounds).route("/", updateSortOrder).route("/", getTimers).route("/", createTimer).route("/", getTimer).route("/", updateTimer).route("/", deleteTimer);
}
function buildApp(mw) {
  return new Hono().basePath("/api").get("/health", (c) => c.json({ ...HEALTH_PAYLOAD })).route("/exercises", buildExercisesApp(mw)).route("/trainings", buildTrainingsApp(mw)).route("/statistics", buildStatisticsApp(mw)).route("/timers", buildTimersApp(mw));
}
export {
  buildApp
};
