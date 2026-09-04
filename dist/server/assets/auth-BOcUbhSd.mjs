import { auth } from "./auth-sbdKgJv0.mjs";
import { t as toUserId } from "./user-id-DBoM6eed.mjs";
import "./client-XWGVBEAR.mjs";
import "drizzle-orm/postgres-js";
import "postgres";
import "drizzle-orm/pg-core";
import "@better-auth/core/db";
import "@better-auth/core/env";
import "@better-auth/core/error";
import "@better-auth/core/db/internal";
import "@better-auth/kysely-adapter";
import "@better-auth/core/db/adapter";
import "kysely";
import "./index-Bnn1A655.mjs";
import "@better-auth/utils/password";
import "@noble/hashes/hkdf.js";
import "@noble/hashes/sha2.js";
import "jose";
import "@better-auth/core/utils/db";
import "@better-auth/core/utils/json";
import "zod";
import "better-call";
import "@better-auth/utils/base64";
import "@better-auth/utils/binary";
import "@better-auth/utils/hmac";
import "@better-auth/utils/hash";
import "@better-auth/core/context";
import "@better-auth/core/instrumentation";
import "@better-auth/core/utils/id";
import "@better-auth/core/utils/ip";
import "defu";
import "@better-auth/core/utils/host";
import "@better-auth/core/utils/is-api-error";
import "@better-auth/core/utils/url";
import "@better-auth/core/api";
import "@better-auth/core/utils/deprecate";
import "@better-auth/utils";
import "@noble/ciphers/chacha.js";
import "@noble/ciphers/utils.js";
import "jose/errors";
import "@better-auth/utils/random";
import "@better-auth/core/oauth2";
import "@better-auth/core/social-providers";
import "@better-auth/telemetry";
import "drizzle-orm";
import "@better-auth/drizzle-adapter";
async function resolveStartUserId(c) {
  let resolved;
  try {
    resolved = await auth.api.getSession({ headers: c.req.raw.headers });
  } catch (error) {
    console.error("[hono-auth] better-auth getSession failed", error);
    throw error;
  }
  return toUserId(resolved?.user?.id);
}
const authMiddleware = async (c, next) => {
  const userId = await resolveStartUserId(c);
  if (userId === null) {
    return c.json({ error: "認証が必要です" }, 401);
  }
  c.set("userId", userId);
  await next();
};
function getUserId(c) {
  return c.get("userId");
}
export {
  authMiddleware,
  getUserId
};
