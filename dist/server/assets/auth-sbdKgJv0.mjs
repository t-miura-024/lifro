import { d as db, v as verification, a as account, s as session, u as user, b as users } from "./client-XWGVBEAR.mjs";
import { getAuthTables, userSchema, sessionSchema, createLocalAccountIssuer, createOAuthAccountIssuer } from "@better-auth/core/db";
import { logger, isProduction, env, isDevelopment, shouldPublishLog, createLogger, isTest } from "@better-auth/core/env";
import { APIError, BASE_ERROR_CODES, BetterAuthError } from "@better-auth/core/error";
import { getAuthTablesWithResolvedIndexes, getPortableDatabaseIdentifierKey, getDatabaseFieldIndexName, getDatabaseIndexStringLength } from "@better-auth/core/db/internal";
import { createKyselyAdapter, getKyselyDatabaseType } from "@better-auth/kysely-adapter";
import { initGetModelName, initGetFieldName } from "@better-auth/core/db/adapter";
import { sql } from "kysely";
import { i as isDynamicBaseURLConfig, w as wildcardMatch, a as getOrigin, b as getHost, c as getProtocol, g as getBaseURL, r as resolveBaseURL, d as isRequestLike } from "./index-Bnn1A655.mjs";
import { hashPassword, verifyPassword as verifyPassword$2 } from "@better-auth/utils/password";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { SignJWT, decodeProtectedHeader, jwtDecrypt, calculateJwkThumbprint, base64url, jwtVerify, EncryptJWT } from "jose";
import { filterOutputFields } from "@better-auth/core/utils/db";
import { safeJSONParse } from "@better-auth/core/utils/json";
import * as z from "zod";
import { serializeCookie, toResponse, kAPIErrorHeaderSymbol, createRouter } from "better-call";
import { base64Url } from "@better-auth/utils/base64";
import { binary } from "@better-auth/utils/binary";
import { createHMAC } from "@better-auth/utils/hmac";
import { createHash } from "@better-auth/utils/hash";
import { defineRequestState, tryGetCurrentAuthEndpointContext, getCurrentAdapter, queueAfterTransactionHook, getCurrentAuthEndpointContext, runWithTransaction, runWithEndpointContext, hasRequestState, runWithRequestState, getBetterAuthVersion, runWithAdapter } from "@better-auth/core/context";
import { withSpan, ATTR_CONTEXT, ATTR_DB_COLLECTION_NAME, ATTR_HOOK_TYPE, ATTR_OPERATION_ID, ATTR_HTTP_ROUTE, ATTR_HTTP_RESPONSE_STATUS_CODE } from "@better-auth/core/instrumentation";
import { generateId } from "@better-auth/core/utils/id";
import { getIP, createRateLimitKey, findInvalidTrustedProxies } from "@better-auth/core/utils/ip";
import defu$1, { defu, createDefu } from "defu";
import { isLoopbackHost } from "@better-auth/core/utils/host";
import { isAPIError } from "@better-auth/core/utils/is-api-error";
import { appendQueryParams, normalizePathname } from "@better-auth/core/utils/url";
import { createAuthMiddleware, createAuthEndpoint } from "@better-auth/core/api";
import { deprecate } from "@better-auth/core/utils/deprecate";
import "@better-auth/utils";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { utf8ToBytes, bytesToHex, managedNonce, hexToBytes } from "@noble/ciphers/utils.js";
import { JWTExpired } from "jose/errors";
import { createRandomStringGenerator } from "@better-auth/utils/random";
import { additionalAuthorizationParamsSchema, supportsIdTokenSignIn, verifyProviderIdToken, mergeScopes } from "@better-auth/core/oauth2";
import { SocialProviderListEnum, socialProviders } from "@better-auth/core/social-providers";
import { createTelemetry } from "@better-auth/telemetry";
import { eq, sql as sql$1 } from "drizzle-orm";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import "drizzle-orm/postgres-js";
import "postgres";
import "drizzle-orm/pg-core";
const generateRandomString = createRandomStringGenerator("a-z", "0-9", "A-Z", "-_");
async function signJWT(payload, secret, expiresIn = 3600) {
  return await new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1e3) + expiresIn).sign(new TextEncoder().encode(secret));
}
async function verifyJWT(token, secret) {
  try {
    return (await jwtVerify(token, new TextEncoder().encode(secret))).payload;
  } catch {
    return null;
  }
}
const info = new Uint8Array([
  66,
  101,
  116,
  116,
  101,
  114,
  65,
  117,
  116,
  104,
  46,
  106,
  115,
  32,
  71,
  101,
  110,
  101,
  114,
  97,
  116,
  101,
  100,
  32,
  69,
  110,
  99,
  114,
  121,
  112,
  116,
  105,
  111,
  110,
  32,
  75,
  101,
  121
]);
const now = () => Date.now() / 1e3 | 0;
const alg = "dir";
const enc = "A256CBC-HS512";
function deriveEncryptionSecret(secret, salt) {
  return hkdf(sha256, new TextEncoder().encode(secret), new TextEncoder().encode(salt), info, 64);
}
function getCurrentSecret(secret) {
  if (typeof secret === "string") return secret;
  const value = secret.keys.get(secret.currentVersion);
  if (!value) throw new Error(`Secret version ${secret.currentVersion} not found in keys`);
  return value;
}
function getAllSecrets(secret) {
  if (typeof secret === "string") return [{
    version: 0,
    value: secret
  }];
  const result = [];
  for (const [version, value] of secret.keys) result.push({
    version,
    value
  });
  if (secret.legacySecret && !result.some((s) => s.value === secret.legacySecret)) result.push({
    version: -1,
    value: secret.legacySecret
  });
  return result;
}
async function symmetricEncodeJWT(payload, secret, salt, expiresIn = 3600) {
  const encryptionSecret = deriveEncryptionSecret(getCurrentSecret(secret), salt);
  const thumbprint = await calculateJwkThumbprint({
    kty: "oct",
    k: base64url.encode(encryptionSecret)
  }, "sha256");
  return await new EncryptJWT(payload).setProtectedHeader({
    alg,
    enc,
    kid: thumbprint
  }).setIssuedAt().setExpirationTime(now() + expiresIn).setJti(crypto.randomUUID()).encrypt(encryptionSecret);
}
const jwtDecryptOpts = {
  clockTolerance: 15,
  keyManagementAlgorithms: [alg],
  contentEncryptionAlgorithms: [enc, "A256GCM"]
};
async function symmetricDecodeJWT(token, secret, salt) {
  if (!token) return null;
  let hasKid = false;
  try {
    hasKid = decodeProtectedHeader(token).kid !== void 0;
  } catch {
    return null;
  }
  try {
    const secrets = getAllSecrets(secret);
    const { payload } = await jwtDecrypt(token, async (protectedHeader) => {
      const kid = protectedHeader.kid;
      if (kid !== void 0) {
        for (const s of secrets) {
          const encryptionSecret = deriveEncryptionSecret(s.value, salt);
          if (kid === await calculateJwkThumbprint({
            kty: "oct",
            k: base64url.encode(encryptionSecret)
          }, "sha256")) return encryptionSecret;
        }
        throw new Error("no matching decryption secret");
      }
      if (secrets.length === 1) return deriveEncryptionSecret(secrets[0].value, salt);
      return deriveEncryptionSecret(secrets[0].value, salt);
    }, jwtDecryptOpts);
    return payload;
  } catch {
    if (hasKid) return null;
    const secrets = getAllSecrets(secret);
    if (secrets.length <= 1) return null;
    for (let i = 1; i < secrets.length; i++) try {
      const s = secrets[i];
      const { payload } = await jwtDecrypt(token, deriveEncryptionSecret(s.value, salt), jwtDecryptOpts);
      return payload;
    } catch {
      continue;
    }
    return null;
  }
}
const hashPassword$1 = hashPassword;
const verifyPassword$1 = async ({ hash, password }) => {
  return verifyPassword$2(hash, password);
};
const ENVELOPE_PREFIX = "$ba$";
function parseEnvelope(data) {
  if (!data.startsWith(ENVELOPE_PREFIX)) return null;
  const firstSep = 4;
  const secondSep = data.indexOf("$", firstSep);
  if (secondSep === -1) return null;
  const version = parseInt(data.slice(firstSep, secondSep), 10);
  if (!Number.isInteger(version) || version < 0) return null;
  return {
    version,
    ciphertext: data.slice(secondSep + 1)
  };
}
function formatEnvelope(version, ciphertext) {
  return `${ENVELOPE_PREFIX}${version}$${ciphertext}`;
}
async function rawEncrypt(secret, data) {
  const keyAsBytes = await createHash("SHA-256").digest(secret);
  const dataAsBytes = utf8ToBytes(data);
  return bytesToHex(managedNonce(xchacha20poly1305)(new Uint8Array(keyAsBytes)).encrypt(dataAsBytes));
}
async function rawDecrypt(secret, hex) {
  const keyAsBytes = await createHash("SHA-256").digest(secret);
  const dataAsBytes = hexToBytes(hex);
  const chacha = managedNonce(xchacha20poly1305)(new Uint8Array(keyAsBytes));
  return new TextDecoder().decode(chacha.decrypt(dataAsBytes));
}
const symmetricEncrypt = async ({ key, data }) => {
  if (typeof key === "string") return rawEncrypt(key, data);
  const secret = key.keys.get(key.currentVersion);
  if (!secret) throw new Error(`Secret version ${key.currentVersion} not found in keys`);
  const ciphertext = await rawEncrypt(secret, data);
  return formatEnvelope(key.currentVersion, ciphertext);
};
const symmetricDecrypt = async ({ key, data }) => {
  if (typeof key === "string") return rawDecrypt(key, data);
  const envelope = parseEnvelope(data);
  if (envelope) {
    const secret = key.keys.get(envelope.version);
    if (!secret) throw new Error(`Secret version ${envelope.version} not found in keys (key may have been retired)`);
    return rawDecrypt(secret, envelope.ciphertext);
  }
  if (key.legacySecret) return rawDecrypt(key.legacySecret, data);
  throw new Error("Cannot decrypt legacy bare-hex payload: no legacy secret available. Set BETTER_AUTH_SECRET for backwards compatibility.");
};
function hasServerSessionStore(options) {
  return !!options.database || !!options.secondaryStorage;
}
function hasServerAccountStore(options) {
  return !!options.database;
}
function shouldBindAccountCookieToSessionUser(options) {
  return hasServerAccountStore(options);
}
const cache = /* @__PURE__ */ new WeakMap();
function getFields(options, modelName, mode) {
  const cacheKey = `${modelName}:${mode}`;
  if (!cache.has(options)) cache.set(options, /* @__PURE__ */ new Map());
  const tableCache = cache.get(options);
  if (tableCache.has(cacheKey)) return tableCache.get(cacheKey);
  const coreSchema = mode === "output" ? getAuthTables(options)[modelName]?.fields ?? {} : {};
  const additionalFields = modelName === "user" || modelName === "session" || modelName === "account" ? options[modelName]?.additionalFields : void 0;
  let schema2 = {
    ...coreSchema,
    ...additionalFields ?? {}
  };
  for (const plugin of options.plugins || []) if (plugin.schema && plugin.schema[modelName]) schema2 = {
    ...schema2,
    ...plugin.schema[modelName].fields
  };
  tableCache.set(cacheKey, schema2);
  return schema2;
}
function parseUserOutput(options, user2) {
  return filterOutputFields(user2, getFields(options, "user", "output"));
}
function buildSyntheticUserOutput(options, data) {
  const schema2 = getFields(options, "user", "output");
  const result = {};
  for (const key in schema2) {
    const fieldAttr = schema2[key];
    if (fieldAttr.returned === false) continue;
    if (key in data && data[key] !== void 0) result[key] = data[key];
    else if (fieldAttr.defaultValue !== void 0) result[key] = typeof fieldAttr.defaultValue === "function" ? fieldAttr.defaultValue() : fieldAttr.defaultValue;
    else if (!fieldAttr.required) result[key] = null;
  }
  if ("id" in data) result.id = data.id;
  return result;
}
function parseSessionOutput(options, session2) {
  return filterOutputFields(session2, getFields(options, "session", "output"));
}
function parseAccountOutput(options, account2) {
  const { accessToken: _accessToken, refreshToken: _refreshToken, idToken: _idToken, accessTokenExpiresAt: _accessTokenExpiresAt, refreshTokenExpiresAt: _refreshTokenExpiresAt, password: _password, ...rest } = filterOutputFields(account2, getFields(options, "account", "output"));
  return rest;
}
function parseInputData(data, schema2) {
  const action = schema2.action || "create";
  const fields = schema2.fields;
  const parsedData = /* @__PURE__ */ Object.create(null);
  for (const key in fields) {
    if (key in data) {
      if (fields[key].input === false) {
        if (fields[key].defaultValue !== void 0) {
          if (action !== "update") {
            parsedData[key] = fields[key].defaultValue;
            continue;
          }
        }
        if (data[key]) throw APIError.from("BAD_REQUEST", {
          ...BASE_ERROR_CODES.FIELD_NOT_ALLOWED,
          message: `${key} is not allowed to be set`
        });
        continue;
      }
      if (fields[key].validator?.input && data[key] !== void 0) {
        const result = fields[key].validator.input["~standard"].validate(data[key]);
        if (result instanceof Promise) throw APIError.from("INTERNAL_SERVER_ERROR", BASE_ERROR_CODES.ASYNC_VALIDATION_NOT_SUPPORTED);
        if ("issues" in result && result.issues) throw APIError.from("BAD_REQUEST", {
          ...BASE_ERROR_CODES.VALIDATION_ERROR,
          message: result.issues[0]?.message || "Validation Error"
        });
        parsedData[key] = result.value;
        continue;
      }
      if (fields[key].transform?.input && data[key] !== void 0) {
        parsedData[key] = fields[key].transform?.input(data[key]);
        continue;
      }
      parsedData[key] = data[key];
      continue;
    }
    if (fields[key].defaultValue !== void 0 && action === "create") {
      if (typeof fields[key].defaultValue === "function") {
        parsedData[key] = fields[key].defaultValue();
        continue;
      }
      parsedData[key] = fields[key].defaultValue;
      continue;
    }
    if (fields[key].required && action === "create") throw APIError.from("BAD_REQUEST", {
      ...BASE_ERROR_CODES.MISSING_FIELD,
      message: `${key} is required`
    });
  }
  return parsedData;
}
function parseUserInput(options, user2 = {}, action) {
  return parseInputData(user2, {
    fields: getFields(options, "user", "input"),
    action
  });
}
function parseAdditionalUserInputFromProviderProfile(options, profile = {}, action) {
  const schema2 = getFields(options, "user", "input");
  const allowedProfileFields = /* @__PURE__ */ Object.create(null);
  for (const key of Object.keys(profile)) {
    if (schema2[key]?.input === false) continue;
    allowedProfileFields[key] = profile[key];
  }
  return parseInputData(allowedProfileFields, {
    fields: schema2,
    action
  });
}
function parseSessionInput(options, session2, action) {
  return parseInputData(session2, {
    fields: getFields(options, "session", "input"),
    action
  });
}
function getSessionDefaultFields(options) {
  const fields = getFields(options, "session", "input");
  const defaults = {};
  for (const key in fields) if (fields[key].defaultValue !== void 0) defaults[key] = typeof fields[key].defaultValue === "function" ? fields[key].defaultValue() : fields[key].defaultValue;
  return defaults;
}
const getDate = (span, unit = "ms") => {
  return new Date(Date.now() + (unit === "sec" ? span * 1e3 : span));
};
function isPromise(obj) {
  return !!obj && (typeof obj === "object" || typeof obj === "function") && typeof obj.then === "function";
}
const SEC = 1e3;
const MIN = SEC * 60;
const HOUR = MIN * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
const MONTH = DAY * 30;
const YEAR = DAY * 365.25;
const REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|months?|mo|years?|yrs?|y)(?: (ago|from now))?$/i;
function parse(value) {
  const match = REGEX.exec(value);
  if (!match || match[4] && match[1]) throw new TypeError(`Invalid time string format: "${value}". Use formats like "7d", "30m", "1 hour", etc.`);
  const n = parseFloat(match[2]);
  const unit = match[3].toLowerCase();
  let result;
  switch (unit) {
    case "years":
    case "year":
    case "yrs":
    case "yr":
    case "y":
      result = n * YEAR;
      break;
    case "months":
    case "month":
    case "mo":
      result = n * MONTH;
      break;
    case "weeks":
    case "week":
    case "w":
      result = n * WEEK;
      break;
    case "days":
    case "day":
    case "d":
      result = n * DAY;
      break;
    case "hours":
    case "hour":
    case "hrs":
    case "hr":
    case "h":
      result = n * HOUR;
      break;
    case "minutes":
    case "minute":
    case "mins":
    case "min":
    case "m":
      result = n * MIN;
      break;
    case "seconds":
    case "second":
    case "secs":
    case "sec":
    case "s":
      result = n * SEC;
      break;
    default:
      throw new TypeError(`Unknown time unit: "${unit}"`);
  }
  if (match[1] === "-" || match[4] === "ago") return -result;
  return result;
}
function sec(value) {
  return Math.round(parse(value) / 1e3);
}
const cookieCachePayloadSchema = z.looseObject({
  session: sessionSchema.loose(),
  user: userSchema.loose(),
  updatedAt: z.number(),
  version: z.string().optional()
});
const compactCookieCacheSchema = z.object({
  session: z.record(z.string(), z.unknown()),
  expiresAt: z.number(),
  signature: z.string()
});
function parseCookieCachePayload(value) {
  const parsed = safeJSONParse(value);
  if (parsed === null) return null;
  const result = cookieCachePayloadSchema.safeParse(parsed);
  if (result.success) return result.data;
  logger.warn("Cookie cache payload failed schema validation", { issues: result.error.issues.map(({ code, path }) => ({
    code,
    path
  })) });
  return null;
}
function parseCompactCookieCache(value) {
  const result = compactCookieCacheSchema.safeParse(value);
  return result.success ? result.data : null;
}
function tryDecode(str) {
  if (str.indexOf("%") === -1) return str;
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}
const SECURE_COOKIE_PREFIX = "__Secure-";
function splitSetCookieHeader(setCookie) {
  if (!setCookie) return [];
  const result = [];
  let start = 0;
  let i = 0;
  while (i < setCookie.length) {
    if (setCookie[i] === ",") {
      let j = i + 1;
      while (j < setCookie.length && setCookie[j] === " ") j++;
      while (j < setCookie.length && setCookie[j] !== "=" && setCookie[j] !== ";" && setCookie[j] !== ",") j++;
      if (j < setCookie.length && setCookie[j] === "=") {
        const part = setCookie.slice(start, i).trim();
        if (part) result.push(part);
        start = i + 1;
        while (start < setCookie.length && setCookie[start] === " ") start++;
        i = start;
        continue;
      }
    }
    i++;
  }
  const last = setCookie.slice(start).trim();
  if (last) result.push(last);
  return result;
}
const cookieNameRegex = /^[\x21\x23-\x27\x2A\x2B\x2D\x2E\x30-\x39\x41-\x5A\x5E\x5F\x60\x61-\x7A\x7C\x7E]+$/;
const cookieValueRegex = /^[\x20\x21\x23-\x3A\x3C-\x5B\x5D-\x7E]*$/;
function unquoteCookieValue(value) {
  if (value.length < 2 || !value.startsWith('"') || !value.endsWith('"')) return value;
  return value.slice(1, -1);
}
function trimOWS(s) {
  let start = 0;
  let end = s.length;
  while (start < end) {
    const c = s.charCodeAt(start);
    if (c !== 32 && c !== 9) break;
    start++;
  }
  while (end > start) {
    const c = s.charCodeAt(end - 1);
    if (c !== 32 && c !== 9) break;
    end--;
  }
  return start === 0 && end === s.length ? s : s.slice(start, end);
}
function parseCookies(cookie) {
  const cookieMap = /* @__PURE__ */ new Map();
  if (cookie.length < 2) return cookieMap;
  for (const chunk of cookie.split(";")) {
    const eq2 = chunk.indexOf("=");
    if (eq2 === -1) continue;
    const key = trimOWS(chunk.slice(0, eq2));
    const val = unquoteCookieValue(trimOWS(chunk.slice(eq2 + 1)));
    if (cookieNameRegex.test(key) && cookieValueRegex.test(val)) cookieMap.set(key, tryDecode(val));
  }
  return cookieMap;
}
const MAX_COOKIE_SIZE = 4050;
const MAX_COOKIE_CHUNKS = 100;
function getMaxCookieValueSize(name, options) {
  return MAX_COOKIE_SIZE - serializeCookie(name, "", { ...options }).length;
}
function readExistingChunks(cookieName, ctx) {
  const chunks = {};
  const cookies = parseCookies(ctx.headers?.get("cookie") || "");
  for (const [name, value] of cookies) if (name.startsWith(cookieName)) chunks[name] = value;
  return chunks;
}
function chunkCookie(storeName, cookie, chunks, logger2) {
  const chunkSize = getMaxCookieValueSize(`${cookie.name}.${MAX_COOKIE_CHUNKS - 1}`, cookie.attributes);
  const chunkCount = chunkSize > 0 ? Math.ceil(cookie.value.length / chunkSize) : Infinity;
  if (chunkCount <= 1) {
    chunks[cookie.name] = cookie.value;
    return [cookie];
  }
  if (chunkCount > MAX_COOKIE_CHUNKS) {
    logger2.warn(`${storeName} cookie is too large to store even after chunking, so the cookie cache was skipped. Reduce the cached data size or avoid storing this data in cookies.`);
    return [];
  }
  const cookies = [];
  for (let i = 0; i < chunkCount; i++) {
    const name = `${cookie.name}.${i}`;
    const start = i * chunkSize;
    const value = cookie.value.substring(start, start + chunkSize);
    cookies.push({
      ...cookie,
      name,
      value
    });
    chunks[name] = value;
  }
  logger2.debug(`CHUNKING_${storeName.toUpperCase()}_COOKIE`, {
    message: `${storeName} cookie exceeds the ${MAX_COOKIE_SIZE} byte limit and was split into ${chunkCount} chunks.`,
    valueSize: cookie.value.length,
    chunkCount,
    chunkSizes: cookies.map((c) => c.value.length)
  });
  return cookies;
}
function getCleanCookies(chunks, cookieOptions) {
  const cleanedChunks = {};
  for (const name in chunks) cleanedChunks[name] = {
    name,
    value: "",
    attributes: {
      ...cookieOptions,
      maxAge: 0
    }
  };
  return cleanedChunks;
}
const storeFactory = (storeName) => (cookieName, cookieOptions, ctx) => {
  const chunks = readExistingChunks(cookieName, ctx);
  const logger2 = ctx.context.logger;
  const expireExistingChunks = () => {
    const expired = getCleanCookies(chunks, cookieOptions);
    for (const name in chunks) delete chunks[name];
    return expired;
  };
  return {
    chunk(value, options) {
      const cookies = expireExistingChunks();
      const chunked = chunkCookie(storeName, {
        name: cookieName,
        value,
        attributes: {
          ...cookieOptions,
          ...options
        }
      }, chunks, logger2);
      for (const chunk of chunked) cookies[chunk.name] = chunk;
      return Object.values(cookies);
    },
    clean() {
      return Object.values(expireExistingChunks());
    },
    setCookies(cookies) {
      for (const cookie of cookies) ctx.setCookie(cookie.name, cookie.value, cookie.attributes);
    }
  };
};
const createSessionStore = storeFactory("Session");
const createAccountStore = storeFactory("Account");
function getChunkedCookie(ctx, cookieName) {
  const value = ctx.getCookie(cookieName);
  if (value) return value;
  const chunks = [];
  const cookieHeader = ctx.headers?.get("cookie");
  if (!cookieHeader) return null;
  for (const [name, val] of parseCookies(cookieHeader)) if (name.startsWith(cookieName + ".")) {
    const indexStr = name.split(".").at(-1);
    const index = parseInt(indexStr || "0", 10);
    if (!isNaN(index)) chunks.push({
      index,
      value: val
    });
  }
  if (chunks.length > 0) {
    chunks.sort((a, b) => a.index - b.index);
    return chunks.map((c) => c.value).join("");
  }
  return null;
}
async function setAccountCookie(c, accountData) {
  const accountDataCookie = c.context.authCookies.accountData;
  const options = {
    maxAge: 300,
    ...accountDataCookie.attributes
  };
  const data = await symmetricEncodeJWT(accountData, c.context.secretConfig, "better-auth-account", options.maxAge);
  const accountStore = createAccountStore(accountDataCookie.name, options, c);
  accountStore.setCookies(accountStore.chunk(data, options));
}
async function getAccountCookie(c) {
  const accountCookie = getChunkedCookie(c, c.context.authCookies.accountData.name);
  if (accountCookie) {
    const accountData = safeJSONParse(await symmetricDecodeJWT(accountCookie, c.context.secretConfig, "better-auth-account"));
    if (accountData) return accountData;
  }
  return null;
}
const getSessionQuerySchema = z.optional(z.object({
  /**
  * If cookie cache is enabled, it will disable the cache
  * and fetch the session from the database
  */
  disableCookieCache: z.coerce.boolean().meta({ description: "Disable cookie cache and fetch session from database" }).optional(),
  disableRefresh: z.coerce.boolean().meta({ description: "Disable session refresh. Useful for checking session status, without updating the session" }).optional()
}));
function createCookieGetter(options) {
  const baseURLString = typeof options.baseURL === "string" ? options.baseURL : void 0;
  const dynamicProtocol = typeof options.baseURL === "object" && options.baseURL !== null ? options.baseURL.protocol : void 0;
  const secureCookiePrefix = (options.advanced?.useSecureCookies !== void 0 ? options.advanced?.useSecureCookies : dynamicProtocol === "https" ? true : dynamicProtocol === "http" ? false : baseURLString ? baseURLString.startsWith("https://") : isProduction) ? SECURE_COOKIE_PREFIX : "";
  const crossSubdomainEnabled = !!options.advanced?.crossSubDomainCookies?.enabled;
  const domain = crossSubdomainEnabled ? options.advanced?.crossSubDomainCookies?.domain || (baseURLString ? new URL(baseURLString).hostname : void 0) : void 0;
  if (crossSubdomainEnabled && !domain && !isDynamicBaseURLConfig(options.baseURL)) throw new BetterAuthError("baseURL is required when crossSubdomainCookies are enabled.");
  function createCookie(cookieName, overrideAttributes = {}) {
    const prefix = options.advanced?.cookiePrefix || "better-auth";
    const name = options.advanced?.cookies?.[cookieName]?.name || `${prefix}.${cookieName}`;
    const attributes = options.advanced?.cookies?.[cookieName]?.attributes ?? {};
    return {
      name: `${secureCookiePrefix}${name}`,
      attributes: {
        secure: !!secureCookiePrefix,
        sameSite: "lax",
        path: "/",
        httpOnly: true,
        ...crossSubdomainEnabled ? { domain } : {},
        ...options.advanced?.defaultCookieAttributes,
        ...overrideAttributes,
        ...attributes
      }
    };
  }
  return createCookie;
}
function getCookies(options) {
  const createCookie = createCookieGetter(options);
  const sessionToken = createCookie("session_token", { maxAge: options.session?.expiresIn || sec("7d") });
  const sessionData = createCookie("session_data", { maxAge: options.session?.cookieCache?.maxAge || 300 });
  const accountData = createCookie("account_data", { maxAge: options.session?.cookieCache?.maxAge || 300 });
  const dontRememberToken = createCookie("dont_remember");
  return {
    sessionToken: {
      name: sessionToken.name,
      attributes: sessionToken.attributes
    },
    /**
    * This cookie is used to store the session data in the cookie
    * This is useful for when you want to cache the session in the cookie
    */
    sessionData: {
      name: sessionData.name,
      attributes: sessionData.attributes
    },
    dontRememberToken: {
      name: dontRememberToken.name,
      attributes: dontRememberToken.attributes
    },
    accountData: {
      name: accountData.name,
      attributes: accountData.attributes
    }
  };
}
async function setCookieCache(ctx, session2, dontRememberMe) {
  if (!ctx.context.options.session?.cookieCache?.enabled) return;
  const filteredSession = filterOutputFields(session2.session, ctx.context.options.session?.additionalFields);
  const filteredUser = parseUserOutput(ctx.context.options, session2.user);
  const versionConfig = ctx.context.options.session?.cookieCache?.version;
  let version = "1";
  if (versionConfig) {
    if (typeof versionConfig === "string") version = versionConfig;
    else if (typeof versionConfig === "function") {
      const result = versionConfig(session2.session, session2.user);
      version = isPromise(result) ? await result : result;
    }
  }
  const sessionData = {
    session: filteredSession,
    user: filteredUser,
    updatedAt: Date.now(),
    version
  };
  const options = {
    ...ctx.context.authCookies.sessionData.attributes,
    maxAge: dontRememberMe ? void 0 : ctx.context.authCookies.sessionData.attributes.maxAge
  };
  const expiresAtDate = getDate(options.maxAge || 60, "sec").getTime();
  const strategy = ctx.context.options.session?.cookieCache?.strategy || "compact";
  let data;
  if (strategy === "jwe") data = await symmetricEncodeJWT(sessionData, ctx.context.secretConfig, "better-auth-session", options.maxAge || 300);
  else if (strategy === "jwt") {
    const cookieCacheSigner = ctx.context.sessionConfig.cookieCacheSigner;
    data = cookieCacheSigner ? await cookieCacheSigner.sign(ctx, sessionData, options.maxAge || 300) : await signJWT(sessionData, ctx.context.secret, options.maxAge || 300);
  } else data = base64Url.encode(JSON.stringify({
    session: sessionData,
    expiresAt: expiresAtDate,
    signature: await createHMAC("SHA-256", "base64urlnopad").sign(ctx.context.secret, JSON.stringify({
      ...sessionData,
      expiresAt: expiresAtDate
    }))
  }), { padding: false });
  const sessionStore = createSessionStore(ctx.context.authCookies.sessionData.name, options, ctx);
  sessionStore.setCookies(sessionStore.chunk(data, options));
  if (ctx.context.options.account?.storeAccountCookie && !hasPendingSetCookie(ctx, ctx.context.authCookies.accountData.name)) {
    const accountData = await getAccountCookie(ctx);
    if (accountData) if (!shouldBindAccountCookieToSessionUser(ctx.context.options) || accountData.userId === session2.user.id) await setAccountCookie(ctx, accountData);
    else {
      expireCookie(ctx, ctx.context.authCookies.accountData);
      const accountStore = createAccountStore(ctx.context.authCookies.accountData.name, ctx.context.authCookies.accountData.attributes, ctx);
      accountStore.setCookies(accountStore.clean());
    }
  }
}
async function decodeCookieCache(ctx, value) {
  const strategy = ctx.context.options.session?.cookieCache?.strategy || "compact";
  if (strategy === "jwe") {
    const decoded = await symmetricDecodeJWT(value, ctx.context.secretConfig, "better-auth-session");
    const payload2 = parseCookieCachePayload(decoded);
    if (!payload2) return null;
    return {
      session: payload2,
      expiresAt: decoded?.exp ? decoded.exp * 1e3 : Date.now()
    };
  }
  if (strategy === "jwt") {
    const cookieCacheSigner = ctx.context.sessionConfig.cookieCacheSigner;
    if (cookieCacheSigner) {
      const verified = await cookieCacheSigner.verify(ctx, value);
      if (!verified) return null;
      return {
        session: verified.payload,
        expiresAt: verified.expiresAt
      };
    }
    const decoded = await verifyJWT(value, ctx.context.secret);
    const payload2 = parseCookieCachePayload(decoded);
    if (!payload2) return null;
    return {
      session: payload2,
      expiresAt: decoded?.exp ? decoded.exp * 1e3 : Date.now()
    };
  }
  const parsed = parseCompactCookieCache(safeJSONParse(binary.decode(base64Url.decode(value))));
  if (!parsed) return null;
  if (!await createHMAC("SHA-256", "base64urlnopad").verify(ctx.context.secret, JSON.stringify({
    ...parsed.session,
    expiresAt: parsed.expiresAt
  }), parsed.signature)) return null;
  const payload = parseCookieCachePayload(parsed.session);
  return payload ? {
    session: payload,
    expiresAt: parsed.expiresAt
  } : null;
}
async function setSessionCookie(ctx, session2, dontRememberMe, overrides) {
  const dontRememberMeCookie = await ctx.getSignedCookie(ctx.context.authCookies.dontRememberToken.name, ctx.context.secret);
  dontRememberMe = dontRememberMe !== void 0 ? dontRememberMe : !!dontRememberMeCookie;
  const options = ctx.context.authCookies.sessionToken.attributes;
  const maxAge = dontRememberMe ? void 0 : ctx.context.sessionConfig.expiresIn;
  await ctx.setSignedCookie(ctx.context.authCookies.sessionToken.name, session2.session.token, ctx.context.secret, {
    ...options,
    maxAge,
    ...overrides
  });
  if (dontRememberMe) await ctx.setSignedCookie(ctx.context.authCookies.dontRememberToken.name, "true", ctx.context.secret, ctx.context.authCookies.dontRememberToken.attributes);
  await setCookieCache(ctx, session2, dontRememberMe);
  ctx.context.setNewSession(session2);
}
function removeSetCookieEntries(ctx, cookieName) {
  const scoped = ctx;
  const targets = /* @__PURE__ */ new Set();
  if (scoped.responseHeaders) targets.add(scoped.responseHeaders);
  if (scoped.context?.responseHeaders) targets.add(scoped.context.responseHeaders);
  const exact = `${cookieName}=`;
  const chunk = `${cookieName}.`;
  for (const headers of targets) {
    const existing = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : splitSetCookieHeader(headers.get("set-cookie") || "");
    if (!existing.length) continue;
    const survivors = existing.filter((entry) => !entry.startsWith(exact) && !entry.startsWith(chunk));
    if (survivors.length === existing.length) continue;
    headers.delete("set-cookie");
    for (const entry of survivors) headers.append("set-cookie", entry);
  }
}
function hasPendingSetCookie(ctx, cookieName) {
  const scoped = ctx;
  const targets = /* @__PURE__ */ new Set();
  if (scoped.responseHeaders) targets.add(scoped.responseHeaders);
  if (scoped.context?.responseHeaders) targets.add(scoped.context.responseHeaders);
  const exact = `${cookieName}=`;
  const chunk = `${cookieName}.`;
  for (const headers of targets) if ((typeof headers.getSetCookie === "function" ? headers.getSetCookie() : splitSetCookieHeader(headers.get("set-cookie") || "")).some((entry) => entry.startsWith(exact) || entry.startsWith(chunk))) return true;
  return false;
}
function expireCookie(ctx, cookie) {
  removeSetCookieEntries(ctx, cookie.name);
  ctx.setCookie(cookie.name, "", {
    ...cookie.attributes,
    maxAge: 0
  });
}
function deleteSessionCookie(ctx, skipDontRememberMe) {
  expireCookie(ctx, ctx.context.authCookies.sessionToken);
  expireCookie(ctx, ctx.context.authCookies.sessionData);
  if (ctx.context.options.account?.storeAccountCookie) {
    expireCookie(ctx, ctx.context.authCookies.accountData);
    const accountStore = createAccountStore(ctx.context.authCookies.accountData.name, ctx.context.authCookies.accountData.attributes, ctx);
    const cleanCookies2 = accountStore.clean();
    accountStore.setCookies(cleanCookies2);
  }
  if (ctx.context.oauthConfig.storeStateStrategy === "cookie") expireCookie(ctx, ctx.context.createAuthCookie("oauth_state"));
  const sessionStore = createSessionStore(ctx.context.authCookies.sessionData.name, ctx.context.authCookies.sessionData.attributes, ctx);
  const cleanCookies = sessionStore.clean();
  sessionStore.setCookies(cleanCookies);
  expireCookie(ctx, ctx.context.authCookies.dontRememberToken);
}
const stateDataSchema = z.looseObject({
  callbackURL: z.string(),
  codeVerifier: z.string(),
  errorURL: z.string().optional(),
  newUserURL: z.string().optional(),
  expiresAt: z.number(),
  /**
  * CSRF nonce returned to the OAuth provider. When using cookie state storage,
  * this must match the callback `state` query parameter.
  */
  oauthState: z.string().optional(),
  link: z.object({
    email: z.string(),
    userId: z.coerce.string()
  }).optional(),
  requestSignUp: z.boolean().optional(),
  /**
  * OIDC nonce sent as the authorization request `nonce` parameter when the
  * provider requires an ID token to be bound to this redirect flow.
  */
  idTokenNonce: z.string().optional(),
  /**
  * Server-controlled values that ride the state across the provider redirect.
  * Populated only by `generateState` from `addOAuthServerContext`, never from
  * the request body, so it is safe to trust on the callback.
  */
  serverContext: z.record(z.string(), z.unknown()).optional()
});
new Set(Object.keys(stateDataSchema.shape));
var StateError = class extends BetterAuthError {
  code;
  details;
  /**
  * The per-flow `errorCallbackURL` recovered from the parsed state, when the
  * failure happened after the state was successfully parsed (for example a
  * nonce or state-cookie mismatch). It was origin-validated at sign-in, so
  * the callback can safely redirect there instead of the default error page.
  * Absent when the state could not be parsed at all.
  */
  errorURL;
  constructor(message, options) {
    super(message, options);
    this.code = options.code;
    this.details = options.details;
    this.errorURL = options.errorURL;
  }
};
async function generateGenericState(c, stateData, settings) {
  const state = generateRandomString(32);
  if (c.context.oauthConfig.storeStateStrategy === "cookie") {
    const payload = {
      ...stateData,
      oauthState: state
    };
    const encryptedData = await symmetricEncrypt({
      key: c.context.secretConfig,
      data: JSON.stringify(payload)
    });
    const stateCookie2 = c.context.createAuthCookie("oauth_state", { maxAge: 600 });
    c.setCookie(stateCookie2.name, encryptedData, stateCookie2.attributes);
    return {
      state,
      codeVerifier: stateData.codeVerifier
    };
  }
  const stateCookie = c.context.createAuthCookie("state", { maxAge: 300 });
  await c.setSignedCookie(stateCookie.name, state, c.context.secret, stateCookie.attributes);
  const expiresAt = /* @__PURE__ */ new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);
  if (!await c.context.internalAdapter.createVerificationValue({
    value: JSON.stringify({
      ...stateData,
      oauthState: state
    }),
    identifier: state,
    expiresAt
  })) throw new StateError("Unable to create verification. Make sure the database adapter is properly working and there is a verification table in the database", { code: "state_generation_error" });
  return {
    state,
    codeVerifier: stateData.codeVerifier
  };
}
async function parseGenericState(c, state, settings) {
  if (!state) throw new StateError("State not found in OAuth callback", { code: "state_not_found" });
  const storeStateStrategy = c.context.oauthConfig.storeStateStrategy;
  let parsedData;
  if (storeStateStrategy === "cookie") {
    const stateCookie = c.context.createAuthCookie("oauth_state");
    const encryptedData = c.getCookie(stateCookie.name);
    if (!encryptedData) throw new StateError("State mismatch: auth state cookie not found", {
      code: "state_mismatch",
      details: { state }
    });
    try {
      const decryptedData = await symmetricDecrypt({
        key: c.context.secretConfig,
        data: encryptedData
      });
      parsedData = stateDataSchema.parse(JSON.parse(decryptedData));
    } catch (error2) {
      throw new StateError("State invalid: Failed to decrypt or parse auth state", {
        code: "state_invalid",
        details: { state },
        cause: error2
      });
    }
    if (!parsedData.oauthState || parsedData.oauthState !== state) throw new StateError("State mismatch: OAuth state parameter does not match stored state", {
      code: "state_security_mismatch",
      details: { state },
      errorURL: parsedData.errorURL
    });
    expireCookie(c, stateCookie);
  } else {
    const data = await c.context.internalAdapter.findVerificationValue(state);
    if (!data) throw new StateError("State mismatch: verification not found", {
      code: "state_mismatch",
      details: { state }
    });
    parsedData = stateDataSchema.parse(JSON.parse(data.value));
    if (parsedData.oauthState !== void 0 && parsedData.oauthState !== state) throw new StateError("State mismatch: OAuth state parameter does not match stored state", {
      code: "state_security_mismatch",
      details: { state },
      errorURL: parsedData.errorURL
    });
    const stateCookie = c.context.createAuthCookie("state");
    const stateCookieValue = await c.getSignedCookie(stateCookie.name, c.context.secret);
    if (!c.context.oauthConfig.skipStateCookieCheck && (!stateCookieValue || stateCookieValue !== state)) throw new StateError("State mismatch: State not persisted correctly", {
      code: "state_security_mismatch",
      details: { state },
      errorURL: parsedData.errorURL
    });
    expireCookie(c, stateCookie);
    await c.context.internalAdapter.deleteVerificationByIdentifier(state);
  }
  if (parsedData.expiresAt < Date.now()) throw new StateError("Invalid state: request expired", {
    code: "state_mismatch",
    details: { expiresAt: parsedData.expiresAt },
    errorURL: parsedData.errorURL
  });
  return parsedData;
}
const OAUTH_CALLBACK_ERROR_CODES = {
  NO_CODE: "no_code",
  PROVIDER_NOT_FOUND: "oauth_provider_not_found",
  ISSUER_MISMATCH: "issuer_mismatch",
  INVALID_CODE: "invalid_code",
  NONCE_BINDING_MISSING: "nonce_binding_missing",
  UNABLE_TO_GET_USER_INFO: "unable_to_get_user_info",
  NO_CALLBACK_URL: "no_callback_url",
  UNABLE_TO_LINK_ACCOUNT: "unable_to_link_account",
  EMAIL_DOES_NOT_MATCH: "email_does_not_match",
  ACCOUNT_ALREADY_LINKED_TO_DIFFERENT_USER: "account_already_linked_to_different_user",
  EMAIL_NOT_FOUND: "email_not_found",
  EMAIL_NOT_VERIFIED: "email_not_verified"
};
const HANDLING_DOCS_URL = "https://www.better-auth.com/docs/concepts/oauth#handling-providers-without-email";
function redirectOnError(ctx, errorURL, error2, description) {
  const params = new URLSearchParams({ error: error2 });
  const redirectURL = appendQueryParams(errorURL, params);
  throw ctx.redirect(redirectURL);
}
function missingEmailLogMessage(providerId, options) {
  return `${options?.source === "generic" ? `Generic OAuth provider "${providerId}"` : `Provider "${providerId}"`} did not return an email${options?.source === "id_token" ? " in the id token" : ""}. Either request the provider's email scope, or create a placeholder via \`mapProfileToUser\`. See ${HANDLING_DOCS_URL}`;
}
const { get: getRawOAuthState, set: setOAuthState } = defineRequestState(() => null);
const { get: getOAuthServerContext, set: setOAuthServerContext } = defineRequestState(() => null);
function generateIdTokenNonce(provider) {
  return provider.requiresIdTokenNonce ? generateRandomString(32) : void 0;
}
async function generateState(c, options) {
  const callbackURL = c.body?.callbackURL || c.context.options.baseURL;
  if (!callbackURL) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.CALLBACK_URL_REQUIRED);
  const codeVerifier = options?.codeVerifier ?? generateRandomString(128);
  const pendingServerContext = await getOAuthServerContext();
  const serverContext = pendingServerContext && Object.keys(pendingServerContext).length ? pendingServerContext : void 0;
  const stateData = {
    ...options?.additionalData ? options.additionalData : {},
    callbackURL,
    codeVerifier,
    errorURL: c.body?.errorCallbackURL,
    newUserURL: c.body?.newUserCallbackURL,
    link: options?.link,
    serverContext,
    expiresAt: Date.now() + 600 * 1e3,
    requestSignUp: c.body?.requestSignUp,
    idTokenNonce: options?.idTokenNonce
  };
  await setOAuthState(stateData);
  try {
    return generateGenericState(c, stateData);
  } catch (error2) {
    c.context.logger.error("Failed to create verification", error2);
    throw new APIError("INTERNAL_SERVER_ERROR", {
      message: "Unable to create verification",
      cause: error2
    });
  }
}
async function parseState(c) {
  const state = c.query.state || c.body?.state;
  const errorURL = c.context.options.onAPIError?.errorURL || `${c.context.baseURL}/error`;
  let parsedData;
  try {
    parsedData = await parseGenericState(c, state);
  } catch (error2) {
    c.context.logger.error("Failed to parse state", error2);
    let code = "internal_server_error";
    let redirectErrorURL = errorURL;
    if (error2 instanceof StateError) {
      code = error2.code === "state_security_mismatch" ? "state_mismatch" : error2.code;
      redirectErrorURL = error2.errorURL || errorURL;
    }
    redirectOnError(c, redirectErrorURL, code);
  }
  if (!parsedData.errorURL) parsedData.errorURL = errorURL;
  if (parsedData) await setOAuthState(parsedData);
  return parsedData;
}
const HIDE_METADATA = { scope: "server" };
const normalizePath = (path) => {
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
  }
  const segments = [];
  for (const segment of decoded.split("/")) if (segment === "..") segments.pop();
  else if (segment !== "." && segment !== "") segments.push(segment);
  return segments.length > 0 ? `/${segments.join("/")}` : "";
};
const parseCustomSchemeOrigin = (value) => {
  const schemeEnd = value.indexOf(":");
  if (schemeEnd <= 0) return null;
  const scheme = value.slice(0, schemeEnd).toLowerCase();
  let rest = value.slice(schemeEnd + 1);
  let authority = "";
  if (rest.startsWith("//")) {
    rest = rest.slice(2);
    const authorityEnd = rest.search(/[/?#]/);
    if (authorityEnd === -1) {
      authority = rest;
      rest = "";
    } else {
      authority = rest.slice(0, authorityEnd);
      rest = rest.slice(authorityEnd);
    }
  }
  const path = normalizePath(rest.replace(/[?#].*$/, ""));
  return {
    scheme,
    authority: authority.toLowerCase(),
    path
  };
};
const RELATIVE_URL_PARSER_ORIGIN = "https://better-auth.invalid";
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/;
const ENCODED_PATH_SEPARATOR_PATTERN = /%2[fF]|%5[cC]/;
const isSafeRelativeURL = (value) => {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || CONTROL_CHARACTER_PATTERN.test(value)) return false;
  const pathEnd = value.search(/[?#]/);
  const path = pathEnd === -1 ? value : value.slice(0, pathEnd);
  if (ENCODED_PATH_SEPARATOR_PATTERN.test(path)) return false;
  try {
    return new URL(value, RELATIVE_URL_PARSER_ORIGIN).origin === RELATIVE_URL_PARSER_ORIGIN;
  } catch {
    return false;
  }
};
const matchesOriginPattern = (url, pattern, settings) => {
  if (url.startsWith("/")) return settings?.allowRelativePaths === true && isSafeRelativeURL(url);
  if (pattern.includes("*") || pattern.includes("?")) {
    if (pattern.includes("://")) return wildcardMatch(pattern)(getOrigin(url) || url);
    const host = getHost(url);
    if (!host) return false;
    return wildcardMatch(pattern)(host);
  }
  const protocol = getProtocol(url);
  if (protocol === "http:" || protocol === "https:" || !protocol) return pattern === getOrigin(url);
  const parsed = parseCustomSchemeOrigin(url);
  const parsedPattern = parseCustomSchemeOrigin(pattern);
  if (!parsed || !parsedPattern || parsed.scheme !== parsedPattern.scheme) return false;
  if (parsedPattern.authority && parsed.authority !== parsedPattern.authority) return false;
  if (!parsedPattern.path) return true;
  return parsed.path === parsedPattern.path || parsed.path.startsWith(`${parsedPattern.path}/`);
};
function shouldSkipCSRFForBackwardCompat(ctx) {
  return ctx.context.skipOriginCheck === true && ctx.context.options.advanced?.disableCSRFCheck === void 0;
}
function shouldSkipOriginCheck(ctx) {
  const skipOriginCheck = ctx.context.skipOriginCheck;
  if (skipOriginCheck === true) return true;
  if (Array.isArray(skipOriginCheck) && ctx.request) try {
    const basePath = new URL(ctx.context.baseURL).pathname;
    const currentPath = normalizePathname(ctx.request.url, basePath);
    return skipOriginCheck.some((skipPath) => {
      const normalizedSkipPath = skipPath.replace(/\/+$/, "");
      return currentPath === normalizedSkipPath || currentPath.startsWith(`${normalizedSkipPath}/`);
    });
  } catch {
  }
  return false;
}
const logBackwardCompatWarning = deprecate(function logBackwardCompatWarning2() {
}, "disableOriginCheck: true currently also disables CSRF checks. In a future version, disableOriginCheck will ONLY disable URL validation. To keep CSRF disabled, add disableCSRFCheck: true to your config.");
const originCheckMiddleware = createAuthMiddleware(async (ctx) => {
  if (ctx.request?.method === "GET" || ctx.request?.method === "OPTIONS" || ctx.request?.method === "HEAD" || !ctx.request) return;
  await validateOrigin(ctx);
  if (shouldSkipOriginCheck(ctx)) return;
  const { body, query } = ctx;
  const callbackURL = body?.callbackURL || query?.callbackURL;
  const redirectURL = body?.redirectTo;
  const errorCallbackURL = body?.errorCallbackURL;
  const newUserCallbackURL = body?.newUserCallbackURL;
  const validateURL = (url, label) => {
    if (!url) return;
    if (typeof url !== "string") throw APIError.fromStatus("BAD_REQUEST", { message: `Invalid ${label}: expected a string` });
    if (!ctx.context.isTrustedOrigin(url, { allowRelativePaths: label !== "origin" })) {
      ctx.context.logger.error(`Invalid ${label}: ${url}`);
      ctx.context.logger.info(`If it's a valid URL, please add ${url} to trustedOrigins in your auth config
`, `Current list of trustedOrigins: ${ctx.context.trustedOrigins}`);
      if (label === "origin") throw APIError.from("FORBIDDEN", BASE_ERROR_CODES.INVALID_ORIGIN);
      if (label === "callbackURL") throw APIError.from("FORBIDDEN", BASE_ERROR_CODES.INVALID_CALLBACK_URL);
      if (label === "redirectURL") throw APIError.from("FORBIDDEN", BASE_ERROR_CODES.INVALID_REDIRECT_URL);
      if (label === "errorCallbackURL") throw APIError.from("FORBIDDEN", BASE_ERROR_CODES.INVALID_ERROR_CALLBACK_URL);
      if (label === "newUserCallbackURL") throw APIError.from("FORBIDDEN", BASE_ERROR_CODES.INVALID_NEW_USER_CALLBACK_URL);
      throw APIError.fromStatus("FORBIDDEN", { message: `Invalid ${label}` });
    }
  };
  callbackURL && validateURL(callbackURL, "callbackURL");
  redirectURL && validateURL(redirectURL, "redirectURL");
  errorCallbackURL && validateURL(errorCallbackURL, "errorCallbackURL");
  newUserCallbackURL && validateURL(newUserCallbackURL, "newUserCallbackURL");
});
const originCheck = (getValue) => createAuthMiddleware(async (ctx) => {
  if (!ctx.request) return;
  if (shouldSkipOriginCheck(ctx)) return;
  const callbackURL = getValue(ctx);
  const validateURL = (url, label) => {
    if (!url) return;
    if (!ctx.context.isTrustedOrigin(url, { allowRelativePaths: label !== "origin" })) {
      ctx.context.logger.error(`Invalid ${label}: ${url}`);
      ctx.context.logger.info(`If it's a valid URL, please add ${url} to trustedOrigins in your auth config
`, `Current list of trustedOrigins: ${ctx.context.trustedOrigins}`);
      throw APIError.from("FORBIDDEN", BASE_ERROR_CODES.INVALID_CALLBACK_URL);
    }
  };
  const callbacks = Array.isArray(callbackURL) ? callbackURL : [callbackURL];
  for (const url of callbacks) validateURL(url, "callbackURL");
});
async function validateOrigin(ctx, forceValidate = false) {
  const headers = ctx.request?.headers;
  if (!headers || !ctx.request) return;
  const origin = headers.get("origin");
  const originHeader = origin || headers.get("referer") || "";
  const useCookies = headers.has("cookie");
  if (ctx.context.skipCSRFCheck) return;
  if (shouldSkipCSRFForBackwardCompat(ctx)) {
    ctx.context.options.advanced?.disableOriginCheck === true && logBackwardCompatWarning();
    return;
  }
  if (shouldSkipOriginCheck(ctx)) return;
  if (!(forceValidate || useCookies)) return;
  const inferredBaseURL = origin === "null" && headers.get("sec-fetch-site") === "same-origin" ? getBaseURL(void 0, ctx.context.options.basePath, ctx.request, false, ctx.context.options.advanced?.trustedProxyHeaders) : void 0;
  const originToValidate = (inferredBaseURL ? getOrigin(inferredBaseURL) : void 0) ?? originHeader;
  if (!originToValidate || originToValidate === "null") throw APIError.from("FORBIDDEN", BASE_ERROR_CODES.MISSING_OR_NULL_ORIGIN);
  const trustedOrigins = Array.isArray(ctx.context.options.trustedOrigins) ? ctx.context.trustedOrigins : [...ctx.context.trustedOrigins, ...(await ctx.context.options.trustedOrigins?.(ctx.request))?.filter((v) => Boolean(v)) || []];
  if (!trustedOrigins.some((origin2) => matchesOriginPattern(originToValidate, origin2))) {
    ctx.context.logger.error(`Invalid origin: ${originToValidate}`);
    ctx.context.logger.info(`If it's a valid URL, please add ${originToValidate} to trustedOrigins in your auth config
`, `Current list of trustedOrigins: ${trustedOrigins}`);
    throw APIError.from("FORBIDDEN", BASE_ERROR_CODES.INVALID_ORIGIN);
  }
}
const formCsrfMiddleware = createAuthMiddleware(async (ctx) => {
  if (!ctx.request) return;
  await validateFormCsrf(ctx);
});
async function validateFormCsrf(ctx) {
  const req = ctx.request;
  if (!req) return;
  if (ctx.context.skipCSRFCheck) return;
  if (shouldSkipCSRFForBackwardCompat(ctx)) return;
  const headers = req.headers;
  if (headers.has("cookie")) return await validateOrigin(ctx);
  const site = headers.get("Sec-Fetch-Site");
  const mode = headers.get("Sec-Fetch-Mode");
  const dest = headers.get("Sec-Fetch-Dest");
  if (Boolean(site && site.trim() || mode && mode.trim() || dest && dest.trim())) {
    if (site === "cross-site" && mode === "navigate") {
      ctx.context.logger.error("Blocked cross-site navigation login attempt (CSRF protection)", {
        secFetchSite: site,
        secFetchMode: mode,
        secFetchDest: dest
      });
      throw APIError.from("FORBIDDEN", BASE_ERROR_CODES.CROSS_SITE_NAVIGATION_LOGIN_BLOCKED);
    }
    return await validateOrigin(ctx, true);
  }
  if (headers.get("origin") || headers.get("referer")) return await validateOrigin(ctx, true);
}
const memory = /* @__PURE__ */ new Map();
const MEMORY_STORE_MAX_ENTRIES = 1e5;
function pruneMemoryStore() {
  const now2 = Date.now();
  for (const [key, entry] of memory) if (now2 >= entry.expiresAt) memory.delete(key);
  if (memory.size <= MEMORY_STORE_MAX_ENTRIES) return;
  const overflow = memory.size - MEMORY_STORE_MAX_ENTRIES;
  let removed = 0;
  for (const key of memory.keys()) {
    memory.delete(key);
    if (++removed >= overflow) break;
  }
}
function decideConsume(data, rule, now2) {
  const windowInMs = rule.window * 1e3;
  if (!data) return {
    next: {
      key: "",
      count: 1,
      lastRequest: now2
    },
    update: false,
    allowed: true,
    retryAfter: null
  };
  if (now2 - data.lastRequest >= windowInMs) return {
    next: {
      ...data,
      count: 1,
      lastRequest: now2
    },
    update: true,
    allowed: true,
    retryAfter: null
  };
  if (data.count >= rule.max) return {
    next: data,
    update: true,
    allowed: false,
    retryAfter: getRetryAfter(data.lastRequest, rule.window)
  };
  return {
    next: {
      ...data,
      count: data.count + 1,
      lastRequest: now2
    },
    update: true,
    allowed: true,
    retryAfter: null
  };
}
function rateLimitResponse(retryAfter) {
  return new Response(JSON.stringify({ message: "Too many requests. Please try again later." }), {
    status: 429,
    statusText: "Too Many Requests",
    headers: { "X-Retry-After": retryAfter.toString() }
  });
}
function getRetryAfter(lastRequest, window) {
  const now2 = Date.now();
  const windowInMs = window * 1e3;
  return Math.ceil((lastRequest + windowInMs - now2) / 1e3);
}
function createDatabaseStorageWrapper(ctx) {
  const model = "rateLimit";
  const db2 = ctx.adapter;
  let longestObservedWindow = Math.max(...getConfiguredRateLimitWindows(ctx));
  const readRow = async (key) => {
    const data = (await db2.findMany({
      model,
      where: [{
        field: "key",
        value: key
      }]
    }))[0];
    if (typeof data?.lastRequest === "bigint") data.lastRequest = Number(data.lastRequest);
    return data;
  };
  const consume = async (key, rule) => {
    if (rule.window > longestObservedWindow) longestObservedWindow = rule.window;
    const windowInMs = rule.window * 1e3;
    const data = await readRow(key);
    const now2 = Date.now();
    if (!data) try {
      await db2.create({
        model,
        data: {
          key,
          count: 1,
          lastRequest: now2
        }
      });
      return {
        allowed: true,
        retryAfter: null
      };
    } catch (error2) {
      if (!await readRow(key)) throw error2;
      return consume(key, rule);
    }
    if (now2 - data.lastRequest >= windowInMs) {
      if (await db2.incrementOne({
        model,
        where: [{
          field: "key",
          value: key
        }, {
          field: "lastRequest",
          operator: "lte",
          value: data.lastRequest
        }],
        increment: {},
        set: {
          count: 1,
          lastRequest: now2
        }
      })) {
        await deleteExpiredRows(now2);
        return {
          allowed: true,
          retryAfter: null
        };
      }
      return consume(key, rule);
    }
    const windowStart = now2 - windowInMs;
    if (await db2.incrementOne({
      model,
      where: [
        {
          field: "key",
          value: key
        },
        {
          field: "lastRequest",
          operator: "gt",
          value: windowStart
        },
        {
          field: "count",
          operator: "lt",
          value: rule.max
        }
      ],
      increment: { count: 1 },
      set: { lastRequest: now2 }
    })) return {
      allowed: true,
      retryAfter: null
    };
    const fresh = await readRow(key);
    if (!fresh) return consume(key, rule);
    if (now2 - fresh.lastRequest >= windowInMs) return consume(key, rule);
    return {
      allowed: false,
      retryAfter: getRetryAfter(fresh.lastRequest, rule.window)
    };
  };
  const deleteExpiredRows = async (now2) => {
    const cutoff = now2 - longestObservedWindow * 1e3;
    await ctx.runInBackgroundOrAwait(db2.deleteMany({
      model,
      where: [{
        field: "lastRequest",
        operator: "lt",
        value: cutoff
      }]
    }).then(() => void 0).catch((e) => ctx.logger.error("Error pruning rate limit rows", e)));
  };
  return { consume };
}
function getConfiguredRateLimitWindows(ctx) {
  const windows = [ctx.rateLimit.window, ...getDefaultSpecialRules().map((rule) => rule.window)];
  for (const plugin of ctx.options.plugins || []) if (plugin.rateLimit) windows.push(...plugin.rateLimit.map((rule) => rule.window));
  if (ctx.rateLimit.customRules) {
    for (const customRule of Object.values(ctx.rateLimit.customRules)) if (customRule && typeof customRule !== "function") windows.push(customRule.window);
  }
  const validWindows = windows.filter((window) => Number.isFinite(window) && window > 0);
  return validWindows.length > 0 ? validWindows : [ctx.rateLimit.window];
}
function getRateLimitStorage(ctx, rateLimitSettings) {
  if (ctx.options.rateLimit?.customStorage) return ctx.options.rateLimit.customStorage;
  const storage = ctx.rateLimit.storage;
  if (storage === "secondary-storage") {
    const ttlFor = (window) => window ?? ctx.options.rateLimit?.window ?? 10;
    const increment = ctx.options.secondaryStorage?.increment;
    if (!increment) throw new BetterAuthError("Secondary-storage rate limiting requires SecondaryStorage.increment.");
    return { consume: async (key, rule) => {
      if (await increment(key, ttlFor(rule.window)) <= rule.max) return {
        allowed: true,
        retryAfter: null
      };
      return {
        allowed: false,
        retryAfter: rule.window
      };
    } };
  } else if (storage === "memory") {
    const ttlFor = (window) => window ?? ctx.options.rateLimit?.window ?? 10;
    return { async consume(key, rule) {
      pruneMemoryStore();
      const now2 = Date.now();
      const entry = memory.get(key);
      const decision = decideConsume(entry && now2 < entry.expiresAt ? entry.data : void 0, rule, now2);
      if (decision.allowed) memory.set(key, {
        data: {
          ...decision.next,
          key
        },
        expiresAt: now2 + ttlFor(rule.window) * 1e3
      });
      return {
        allowed: decision.allowed,
        retryAfter: decision.retryAfter
      };
    } };
  }
  return createDatabaseStorageWrapper(ctx);
}
let ipWarningLogged = false;
const NO_TRUSTED_IP_KEY = "no-trusted-ip";
async function resolveRateLimitConfig(req, ctx) {
  const basePath = new URL(ctx.baseURL).pathname;
  const path = normalizePathname(req.url, basePath);
  let currentWindow = ctx.rateLimit.window;
  let currentMax = ctx.rateLimit.max;
  const ip = getIP(req, ctx.options);
  if (!ip && ctx.options.advanced?.ipAddress?.disableIpTracking) return null;
  if (!ip && !ipWarningLogged) {
    ctx.logger.warn("Rate limiting could not determine a client IP and is falling back to a single shared per-path bucket. Ensure your runtime forwards a trusted client IP header, then set `advanced.ipAddress.ipAddressHeaders` or `advanced.ipAddress.trustedProxies` so the address can be resolved.");
    ipWarningLogged = true;
  }
  const key = createRateLimitKey(ip ?? NO_TRUSTED_IP_KEY, path);
  const specialRule = getDefaultSpecialRules().find((rule) => rule.pathMatcher(path));
  if (specialRule) {
    currentWindow = specialRule.window;
    currentMax = specialRule.max;
  }
  for (const plugin of ctx.options.plugins || []) if (plugin.rateLimit) {
    const matchedRule = plugin.rateLimit.find((rule) => rule.pathMatcher(path));
    if (matchedRule) {
      currentWindow = matchedRule.window;
      currentMax = matchedRule.max;
      break;
    }
  }
  if (ctx.rateLimit.customRules) {
    const _path = Object.keys(ctx.rateLimit.customRules).find((p) => {
      if (p.includes("*")) return wildcardMatch(p)(path);
      return p === path;
    });
    if (_path) {
      const customRule = ctx.rateLimit.customRules[_path];
      const resolved = typeof customRule === "function" ? await customRule(req, {
        window: currentWindow,
        max: currentMax
      }) : customRule;
      if (resolved) {
        currentWindow = resolved.window;
        currentMax = resolved.max;
      }
      if (resolved === false) return null;
    }
  }
  return {
    key,
    currentWindow,
    currentMax
  };
}
async function onRequestRateLimit(req, ctx) {
  if (!ctx.rateLimit.enabled) return;
  const config = await resolveRateLimitConfig(req, ctx);
  if (!config) return;
  const { key, currentWindow, currentMax } = config;
  const storage = getRateLimitStorage(ctx);
  const rule = {
    window: currentWindow,
    max: currentMax
  };
  const { allowed, retryAfter } = await storage.consume(key, rule);
  if (!allowed) return rateLimitResponse(retryAfter ?? currentWindow);
}
function getDefaultSpecialRules() {
  return [{
    pathMatcher(path) {
      return path.startsWith("/sign-in") || path.startsWith("/sign-up") || path.startsWith("/change-password") || path.startsWith("/change-email");
    },
    window: 10,
    max: 3
  }, {
    pathMatcher(path) {
      return path === "/request-password-reset" || path === "/send-verification-email" || path.startsWith("/forget-password") || path === "/email-otp/send-verification-otp" || path === "/email-otp/request-password-reset";
    },
    window: 60,
    max: 3
  }];
}
const { get: getShouldSkipSessionRefresh, set: setShouldSkipSessionRefresh } = defineRequestState(() => false);
const getSession = () => createAuthEndpoint("/get-session", {
  method: ["GET", "POST"],
  operationId: "getSession",
  query: getSessionQuerySchema,
  requireHeaders: true,
  metadata: { openapi: {
    operationId: "getSession",
    description: "Get the current session",
    responses: { "200": {
      description: "Success",
      content: { "application/json": { schema: {
        type: ["object", "null"],
        properties: {
          session: { $ref: "#/components/schemas/Session" },
          user: { $ref: "#/components/schemas/User" }
        },
        required: ["session", "user"]
      } } }
    } }
  } }
}, async (ctx) => {
  ctx.setHeader("cache-control", "no-store");
  ctx.setHeader("pragma", "no-cache");
  const deferSessionRefresh = ctx.context.options.session?.deferSessionRefresh;
  const isPostRequest = ctx.method === "POST";
  if (isPostRequest && !deferSessionRefresh) throw APIError.from("METHOD_NOT_ALLOWED", BASE_ERROR_CODES.METHOD_NOT_ALLOWED_DEFER_SESSION_REQUIRED);
  try {
    const sessionCookieToken = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret);
    if (!sessionCookieToken) return null;
    const sessionDataCookie = getChunkedCookie(ctx, ctx.context.authCookies.sessionData.name);
    const sessionDataPayload = sessionDataCookie ? await decodeCookieCache(ctx, sessionDataCookie) : null;
    if (sessionDataCookie && !sessionDataPayload) expireCookie(ctx, ctx.context.authCookies.sessionData);
    const dontRememberMe = await ctx.getSignedCookie(ctx.context.authCookies.dontRememberToken.name, ctx.context.secret);
    if (sessionDataPayload?.session && ctx.context.options.session?.cookieCache?.enabled && !ctx.query?.disableCookieCache) {
      const session3 = sessionDataPayload.session;
      let shouldExpireCookieCache = session3.session.token !== sessionCookieToken;
      if (!shouldExpireCookieCache) {
        const versionConfig = ctx.context.options.session?.cookieCache?.version;
        let expectedVersion = "1";
        if (versionConfig) {
          if (typeof versionConfig === "string") expectedVersion = versionConfig;
          else if (typeof versionConfig === "function") {
            const result = versionConfig(session3.session, session3.user);
            expectedVersion = result instanceof Promise ? await result : result;
          }
        }
        shouldExpireCookieCache = (session3.version || "1") !== expectedVersion;
      }
      if (!shouldExpireCookieCache) {
        const now2 = Date.now();
        const cachedSessionExpiresAt = new Date(session3.session.expiresAt).getTime();
        shouldExpireCookieCache = sessionDataPayload.expiresAt < now2 || !Number.isFinite(cachedSessionExpiresAt) || cachedSessionExpiresAt < now2;
      }
      if (shouldExpireCookieCache) expireCookie(ctx, ctx.context.authCookies.sessionData);
      else {
        const cookieRefreshCache = ctx.context.sessionConfig.cookieRefreshCache;
        if (cookieRefreshCache === false) {
          ctx.context.session = session3;
          const parsedSession3 = parseSessionOutput(ctx.context.options, {
            ...session3.session,
            expiresAt: new Date(session3.session.expiresAt),
            createdAt: new Date(session3.session.createdAt),
            updatedAt: new Date(session3.session.updatedAt)
          });
          const parsedUser3 = parseUserOutput(ctx.context.options, {
            ...session3.user,
            createdAt: new Date(session3.user.createdAt),
            updatedAt: new Date(session3.user.updatedAt)
          });
          return ctx.json({
            session: parsedSession3,
            user: parsedUser3
          });
        }
        const timeUntilExpiry = sessionDataPayload.expiresAt - Date.now();
        const updateAge2 = cookieRefreshCache.updateAge * 1e3;
        const shouldSkipSessionRefresh2 = await getShouldSkipSessionRefresh();
        if (timeUntilExpiry < updateAge2 && !shouldSkipSessionRefresh2) {
          const refreshedSession = {
            session: { ...session3.session },
            user: session3.user,
            updatedAt: Date.now()
          };
          await setCookieCache(ctx, refreshedSession, false);
          const sessionTokenOptions = ctx.context.authCookies.sessionToken.attributes;
          const sessionTokenMaxAge = dontRememberMe ? void 0 : ctx.context.sessionConfig.expiresIn;
          await ctx.setSignedCookie(ctx.context.authCookies.sessionToken.name, session3.session.token, ctx.context.secret, {
            ...sessionTokenOptions,
            maxAge: sessionTokenMaxAge
          });
          const parsedRefreshedSession = parseSessionOutput(ctx.context.options, {
            ...refreshedSession.session,
            expiresAt: new Date(refreshedSession.session.expiresAt),
            createdAt: new Date(refreshedSession.session.createdAt),
            updatedAt: new Date(refreshedSession.session.updatedAt)
          });
          const parsedRefreshedUser = parseUserOutput(ctx.context.options, {
            ...refreshedSession.user,
            createdAt: new Date(refreshedSession.user.createdAt),
            updatedAt: new Date(refreshedSession.user.updatedAt)
          });
          ctx.context.session = {
            session: parsedRefreshedSession,
            user: parsedRefreshedUser
          };
          return ctx.json({
            session: parsedRefreshedSession,
            user: parsedRefreshedUser
          });
        }
        const parsedSession2 = parseSessionOutput(ctx.context.options, {
          ...session3.session,
          expiresAt: new Date(session3.session.expiresAt),
          createdAt: new Date(session3.session.createdAt),
          updatedAt: new Date(session3.session.updatedAt)
        });
        const parsedUser2 = parseUserOutput(ctx.context.options, {
          ...session3.user,
          createdAt: new Date(session3.user.createdAt),
          updatedAt: new Date(session3.user.updatedAt)
        });
        ctx.context.session = {
          session: parsedSession2,
          user: parsedUser2
        };
        return ctx.json({
          session: parsedSession2,
          user: parsedUser2
        });
      }
    }
    const session2 = await ctx.context.internalAdapter.findSession(sessionCookieToken);
    ctx.context.session = session2;
    if (!session2 || session2.session.expiresAt < /* @__PURE__ */ new Date()) {
      deleteSessionCookie(ctx);
      if (session2) {
        if (!deferSessionRefresh || isPostRequest) await ctx.context.internalAdapter.deleteSession(session2.session.token);
      }
      return ctx.json(null);
    }
    if (dontRememberMe || ctx.query?.disableRefresh) {
      const parsedSession2 = parseSessionOutput(ctx.context.options, session2.session);
      const parsedUser2 = parseUserOutput(ctx.context.options, session2.user);
      return ctx.json({
        session: parsedSession2,
        user: parsedUser2
      });
    }
    const expiresIn = ctx.context.sessionConfig.expiresIn;
    const updateAge = ctx.context.sessionConfig.updateAge;
    const shouldBeUpdated = session2.session.expiresAt.valueOf() - expiresIn * 1e3 + updateAge * 1e3 <= Date.now();
    const disableRefresh = ctx.query?.disableRefresh || ctx.context.options.session?.disableSessionRefresh;
    const shouldSkipSessionRefresh = await getShouldSkipSessionRefresh();
    const needsRefresh = shouldBeUpdated && !disableRefresh && !shouldSkipSessionRefresh;
    if (deferSessionRefresh && !isPostRequest) {
      await setCookieCache(ctx, session2, !!dontRememberMe);
      const parsedSession2 = parseSessionOutput(ctx.context.options, session2.session);
      const parsedUser2 = parseUserOutput(ctx.context.options, session2.user);
      return ctx.json({
        session: parsedSession2,
        user: parsedUser2,
        needsRefresh
      });
    }
    if (needsRefresh) {
      const updatedSession = await ctx.context.internalAdapter.updateSession(session2.session.token, {
        expiresAt: getDate(ctx.context.sessionConfig.expiresIn, "sec"),
        updatedAt: /* @__PURE__ */ new Date()
      });
      if (!updatedSession) {
        deleteSessionCookie(ctx);
        throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.FAILED_TO_GET_SESSION);
      }
      const maxAge = ctx.context.sessionConfig.expiresIn;
      await setSessionCookie(ctx, {
        session: updatedSession,
        user: session2.user
      }, false, { maxAge });
      const parsedUpdatedSession = parseSessionOutput(ctx.context.options, updatedSession);
      const parsedUser2 = parseUserOutput(ctx.context.options, session2.user);
      return ctx.json({
        session: parsedUpdatedSession,
        user: parsedUser2
      });
    }
    await setCookieCache(ctx, session2, !!dontRememberMe);
    const parsedSession = parseSessionOutput(ctx.context.options, session2.session);
    const parsedUser = parseUserOutput(ctx.context.options, session2.user);
    return ctx.json({
      session: parsedSession,
      user: parsedUser
    });
  } catch (error2) {
    if (isAPIError(error2)) throw error2;
    ctx.context.logger.error("INTERNAL_SERVER_ERROR", error2);
    throw APIError.from("INTERNAL_SERVER_ERROR", BASE_ERROR_CODES.FAILED_TO_GET_SESSION);
  }
});
const isStateful = (ctx) => hasServerSessionStore(ctx.context.options);
const getSessionFromCtx = async (ctx, config) => {
  if (ctx.context.session) return ctx.context.session;
  const session2 = await getSession()({
    ...ctx,
    method: "GET",
    asResponse: false,
    headers: ctx.headers,
    returnHeaders: true,
    returnStatus: false,
    query: {
      ...config,
      ...ctx.query,
      disableCookieCache: config?.disableCookieCache || ctx.query?.disableCookieCache,
      disableRefresh: config?.disableRefresh || ctx.query?.disableRefresh
    }
  }).catch(() => {
    return null;
  });
  if (!session2) {
    ctx.context.session = null;
    return null;
  }
  if (session2.headers) session2.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "cache-control" || lowerKey === "pragma") return;
    if (lowerKey === "set-cookie") ctx.responseHeaders.append(key, value);
    else ctx.responseHeaders.set(key, value);
  });
  ctx.context.session = session2.response;
  return session2.response;
};
const getAuthoritativeSessionFromCtx = async (ctx) => {
  if (!isStateful(ctx)) return getSessionFromCtx(ctx);
  ctx.context.session = null;
  return getSessionFromCtx(ctx, { disableCookieCache: true });
};
const sessionMiddleware = createAuthMiddleware(async (ctx) => {
  const session2 = await getSessionFromCtx(ctx);
  if (!session2?.session) throw APIError.from("UNAUTHORIZED", {
    message: "Unauthorized",
    code: "UNAUTHORIZED"
  });
  return { session: session2 };
});
const sensitiveSessionMiddleware = createAuthMiddleware(async (ctx) => {
  const session2 = await getAuthoritativeSessionFromCtx(ctx);
  if (!session2?.session) throw APIError.from("UNAUTHORIZED", {
    message: "Unauthorized",
    code: "UNAUTHORIZED"
  });
  return { session: session2 };
});
createAuthMiddleware(async (ctx) => {
  const session2 = await getSessionFromCtx(ctx);
  if (!session2?.session && (ctx.request || ctx.headers)) throw APIError.from("UNAUTHORIZED", {
    message: "Unauthorized",
    code: "UNAUTHORIZED"
  });
  return { session: session2 };
});
const freshSessionMiddleware = createAuthMiddleware(async (ctx) => {
  const session2 = await getSessionFromCtx(ctx);
  if (!session2?.session) throw APIError.from("UNAUTHORIZED", {
    message: "Unauthorized",
    code: "UNAUTHORIZED"
  });
  if (ctx.context.sessionConfig.freshAge !== 0) {
    const createdAt = new Date(session2.session.createdAt).getTime();
    const freshAge = ctx.context.sessionConfig.freshAge * 1e3;
    if (Date.now() - createdAt >= freshAge) throw APIError.from("FORBIDDEN", BASE_ERROR_CODES.SESSION_NOT_FRESH);
  }
  return { session: session2 };
});
const listSessions = () => createAuthEndpoint("/list-sessions", {
  method: "GET",
  operationId: "listUserSessions",
  use: [freshSessionMiddleware],
  requireHeaders: true,
  metadata: { openapi: {
    operationId: "listUserSessions",
    description: "List all active sessions for the user",
    responses: { "200": {
      description: "Success",
      content: { "application/json": { schema: {
        type: "array",
        items: { $ref: "#/components/schemas/Session" }
      } } }
    } }
  } }
}, async (ctx) => {
  try {
    const activeSessions = (await ctx.context.internalAdapter.listSessions(ctx.context.session.user.id, { onlyActiveSessions: true })).filter((session2) => {
      return session2.expiresAt > /* @__PURE__ */ new Date();
    });
    return ctx.json(activeSessions.map((session2) => parseSessionOutput(ctx.context.options, session2)));
  } catch (e) {
    ctx.context.logger.error(e);
    throw ctx.error("INTERNAL_SERVER_ERROR");
  }
});
const revokeSession = createAuthEndpoint("/revoke-session", {
  method: "POST",
  body: z.object({ token: z.string().meta({ description: "The token to revoke" }) }),
  use: [sensitiveSessionMiddleware],
  requireHeaders: true,
  metadata: { openapi: {
    description: "Revoke a single session",
    requestBody: { content: { "application/json": { schema: {
      type: "object",
      properties: { token: {
        type: "string",
        description: "The token to revoke"
      } },
      required: ["token"]
    } } } },
    responses: { "200": {
      description: "Success",
      content: { "application/json": { schema: {
        type: "object",
        properties: { status: {
          type: "boolean",
          description: "Indicates if the session was revoked successfully"
        } },
        required: ["status"]
      } } }
    } }
  } }
}, async (ctx) => {
  const token = ctx.body.token;
  if ((await ctx.context.internalAdapter.findSession(token))?.session.userId === ctx.context.session.user.id) try {
    await ctx.context.internalAdapter.deleteSession(token);
  } catch (error2) {
    ctx.context.logger.error(error2 && typeof error2 === "object" && "name" in error2 ? error2.name : "", error2);
    throw APIError.from("INTERNAL_SERVER_ERROR", {
      message: "Internal Server Error",
      code: "INTERNAL_SERVER_ERROR"
    });
  }
  return ctx.json({ status: true });
});
const revokeSessions = createAuthEndpoint("/revoke-sessions", {
  method: "POST",
  use: [sensitiveSessionMiddleware],
  requireHeaders: true,
  metadata: { openapi: {
    description: "Revoke all sessions for the user",
    responses: { "200": {
      description: "Success",
      content: { "application/json": { schema: {
        type: "object",
        properties: { status: {
          type: "boolean",
          description: "Indicates if all sessions were revoked successfully"
        } },
        required: ["status"]
      } } }
    } }
  } }
}, async (ctx) => {
  try {
    await ctx.context.internalAdapter.deleteUserSessions(ctx.context.session.user.id);
  } catch (error2) {
    ctx.context.logger.error(error2 && typeof error2 === "object" && "name" in error2 ? error2.name : "", error2);
    throw APIError.from("INTERNAL_SERVER_ERROR", {
      message: "Internal Server Error",
      code: "INTERNAL_SERVER_ERROR"
    });
  }
  return ctx.json({ status: true });
});
const revokeOtherSessions = createAuthEndpoint("/revoke-other-sessions", {
  method: "POST",
  requireHeaders: true,
  use: [sensitiveSessionMiddleware],
  metadata: { openapi: {
    description: "Revoke all other sessions for the user except the current one",
    responses: { "200": {
      description: "Success",
      content: { "application/json": { schema: {
        type: "object",
        properties: { status: {
          type: "boolean",
          description: "Indicates if all other sessions were revoked successfully"
        } },
        required: ["status"]
      } } }
    } }
  } }
}, async (ctx) => {
  const session2 = ctx.context.session;
  if (!session2.user) throw APIError.from("UNAUTHORIZED", {
    message: "Unauthorized",
    code: "UNAUTHORIZED"
  });
  const otherSessions = (await ctx.context.internalAdapter.listSessions(session2.user.id)).filter((session3) => {
    return session3.expiresAt > /* @__PURE__ */ new Date();
  }).filter((session3) => session3.token !== ctx.context.session.session.token);
  await Promise.all(otherSessions.map((session3) => ctx.context.internalAdapter.deleteSession(session3.token)));
  return ctx.json({ status: true });
});
function assertValidUserInfoSource(source) {
  if (!source?.method) throw new APIError("FORBIDDEN", {
    code: "validation_source_missing",
    message: "User validation source is required"
  });
  if (source.method === "oauth" && !source.oauth?.providerId) throw new APIError("FORBIDDEN", {
    code: "validation_source_missing",
    message: "OAuth user validation source requires oauth.providerId"
  });
  if ((source.method === "sso-oidc" || source.method === "sso-saml") && !source.sso?.providerId) throw new APIError("FORBIDDEN", {
    code: "validation_source_missing",
    message: "SSO user validation source requires sso.providerId"
  });
}
async function assertValidUserInfo(ctx, data) {
  const validate = ctx.context.options.user?.validateUserInfo;
  if (!validate) return;
  assertValidUserInfoSource(data.source);
  let result;
  try {
    result = await validate(data, ctx);
  } catch (error2) {
    ctx.context.logger.error("validateUserInfo callback threw", error2);
    throw new APIError("FORBIDDEN", {
      code: "validation_failed",
      message: "User validation failed"
    });
  }
  if (result?.error) throw new APIError("FORBIDDEN", {
    code: result.error,
    message: result.errorDescription || result.error
  });
}
const defaultKeyHasher = async (identifier) => {
  const hash = await createHash("SHA-256").digest(new TextEncoder().encode(identifier));
  return base64Url.encode(new Uint8Array(hash), { padding: false });
};
async function processIdentifier(identifier, option) {
  if (!option || option === "plain") return identifier;
  if (option === "hashed") return defaultKeyHasher(identifier);
  if (typeof option === "object" && "hash" in option) return option.hash(identifier);
  return identifier;
}
function getStorageOption(identifier, config) {
  if (!config) return;
  if (typeof config === "object" && "default" in config) {
    if (config.overrides) {
      for (const [prefix, option] of Object.entries(config.overrides)) if (identifier.startsWith(prefix)) return option;
    }
    return config.default;
  }
  return config;
}
function getWithHooks(adapter, ctx) {
  const hooksEntries = ctx.hooks;
  async function createWithHooks(data, model, customCreateFn) {
    const context = tryGetCurrentAuthEndpointContext();
    let actualData = data;
    for (const { source, hooks } of hooksEntries) {
      const toRun = hooks[model]?.create?.before;
      if (toRun) {
        const result = await withSpan(`db create.before ${model}`, {
          [ATTR_HOOK_TYPE]: "create.before",
          [ATTR_DB_COLLECTION_NAME]: model,
          [ATTR_CONTEXT]: source
        }, () => toRun(actualData, context));
        if (result === false) return null;
        if (typeof result === "object" && "data" in result) actualData = {
          ...actualData,
          ...result.data
        };
      }
    }
    let created = null;
    if (!customCreateFn || customCreateFn.executeMainFn) created = await (await getCurrentAdapter(adapter)).create({
      model,
      data: actualData,
      forceAllowId: true
    });
    if (customCreateFn?.fn) created = await customCreateFn.fn(created ?? actualData);
    for (const { source, hooks } of hooksEntries) {
      const toRun = hooks[model]?.create?.after;
      if (toRun) await queueAfterTransactionHook(async () => {
        await withSpan(`db create.after ${model}`, {
          [ATTR_HOOK_TYPE]: "create.after",
          [ATTR_DB_COLLECTION_NAME]: model,
          [ATTR_CONTEXT]: source
        }, () => toRun(created, context));
      });
    }
    return created;
  }
  async function updateWithHooks(data, where, model, customUpdateFn) {
    const context = tryGetCurrentAuthEndpointContext();
    let actualData = data;
    for (const { source, hooks } of hooksEntries) {
      const toRun = hooks[model]?.update?.before;
      if (toRun) {
        const result = await withSpan(`db update.before ${model}`, {
          [ATTR_HOOK_TYPE]: "update.before",
          [ATTR_DB_COLLECTION_NAME]: model,
          [ATTR_CONTEXT]: source
        }, () => toRun(data, context));
        if (result === false) return null;
        if (typeof result === "object" && "data" in result) actualData = {
          ...actualData,
          ...result.data
        };
      }
    }
    const customUpdated = customUpdateFn ? await customUpdateFn.fn(actualData) : null;
    const updated = !customUpdateFn || customUpdateFn.executeMainFn ? await (await getCurrentAdapter(adapter)).update({
      model,
      update: actualData,
      where
    }) : customUpdated;
    for (const { source, hooks } of hooksEntries) {
      const toRun = hooks[model]?.update?.after;
      if (toRun) await queueAfterTransactionHook(async () => {
        await withSpan(`db update.after ${model}`, {
          [ATTR_HOOK_TYPE]: "update.after",
          [ATTR_DB_COLLECTION_NAME]: model,
          [ATTR_CONTEXT]: source
        }, () => toRun(updated, context));
      });
    }
    return updated;
  }
  async function updateManyWithHooks(data, where, model, customUpdateFn) {
    const context = tryGetCurrentAuthEndpointContext();
    let actualData = data;
    for (const { source, hooks } of hooksEntries) {
      const toRun = hooks[model]?.update?.before;
      if (toRun) {
        const result = await withSpan(`db updateMany.before ${model}`, {
          [ATTR_HOOK_TYPE]: "updateMany.before",
          [ATTR_DB_COLLECTION_NAME]: model,
          [ATTR_CONTEXT]: source
        }, () => toRun(data, context));
        if (result === false) return null;
        if (typeof result === "object" && "data" in result) actualData = {
          ...actualData,
          ...result.data
        };
      }
    }
    const customUpdated = customUpdateFn ? await customUpdateFn.fn(actualData) : null;
    const updated = !customUpdateFn || customUpdateFn.executeMainFn ? await (await getCurrentAdapter(adapter)).updateMany({
      model,
      update: actualData,
      where
    }) : customUpdated;
    for (const { source, hooks } of hooksEntries) {
      const toRun = hooks[model]?.update?.after;
      if (toRun) await queueAfterTransactionHook(async () => {
        await withSpan(`db updateMany.after ${model}`, {
          [ATTR_HOOK_TYPE]: "updateMany.after",
          [ATTR_DB_COLLECTION_NAME]: model,
          [ATTR_CONTEXT]: source
        }, () => toRun(updated, context));
      });
    }
    return updated;
  }
  async function deleteWithHooks(where, model, customDeleteFn) {
    const context = tryGetCurrentAuthEndpointContext();
    let entityToDelete = null;
    try {
      entityToDelete = (await (await getCurrentAdapter(adapter)).findMany({
        model,
        where,
        limit: 1
      }))[0] || null;
    } catch {
    }
    if (entityToDelete) for (const { source, hooks } of hooksEntries) {
      const toRun = hooks[model]?.delete?.before;
      if (toRun) {
        if (await withSpan(`db delete.before ${model}`, {
          [ATTR_HOOK_TYPE]: "delete.before",
          [ATTR_DB_COLLECTION_NAME]: model,
          [ATTR_CONTEXT]: source
        }, () => toRun(entityToDelete, context)) === false) return null;
      }
    }
    const customDeleted = customDeleteFn ? await customDeleteFn.fn(where) : null;
    const deleted = (!customDeleteFn || customDeleteFn.executeMainFn) && entityToDelete ? await (await getCurrentAdapter(adapter)).delete({
      model,
      where
    }) : customDeleted;
    if (entityToDelete) for (const { source, hooks } of hooksEntries) {
      const toRun = hooks[model]?.delete?.after;
      if (toRun) await queueAfterTransactionHook(async () => {
        await withSpan(`db delete.after ${model}`, {
          [ATTR_HOOK_TYPE]: "delete.after",
          [ATTR_DB_COLLECTION_NAME]: model,
          [ATTR_CONTEXT]: source
        }, () => toRun(entityToDelete, context));
      });
    }
    return deleted;
  }
  async function deleteManyWithHooks(where, model, customDeleteFn) {
    const context = tryGetCurrentAuthEndpointContext();
    let entitiesToDelete = [];
    try {
      entitiesToDelete = await (await getCurrentAdapter(adapter)).findMany({
        model,
        where
      });
    } catch {
    }
    for (const entity of entitiesToDelete) for (const { source, hooks } of hooksEntries) {
      const toRun = hooks[model]?.delete?.before;
      if (toRun) {
        if (await withSpan(`db delete.before ${model}`, {
          [ATTR_HOOK_TYPE]: "delete.before",
          [ATTR_DB_COLLECTION_NAME]: model,
          [ATTR_CONTEXT]: source
        }, () => toRun(entity, context)) === false) return null;
      }
    }
    const customDeleted = customDeleteFn ? await customDeleteFn.fn(where) : null;
    const deleted = !customDeleteFn || customDeleteFn.executeMainFn ? await (await getCurrentAdapter(adapter)).deleteMany({
      model,
      where
    }) : customDeleted;
    for (const entity of entitiesToDelete) for (const { source, hooks } of hooksEntries) {
      const toRun = hooks[model]?.delete?.after;
      if (toRun) await queueAfterTransactionHook(async () => {
        await withSpan(`db delete.after ${model}`, {
          [ATTR_HOOK_TYPE]: "delete.after",
          [ATTR_DB_COLLECTION_NAME]: model,
          [ATTR_CONTEXT]: source
        }, () => toRun(entity, context));
      });
    }
    return deleted;
  }
  async function consumeOneWithHooks(model, hookWhere, consumeFn, preSnapshot) {
    const context = tryGetCurrentAuthEndpointContext();
    const beforeHooks = hooksEntries.flatMap(({ source, hooks }) => {
      const fn = hooks[model]?.delete?.before;
      return fn ? [{
        source,
        fn
      }] : [];
    });
    let snapshot = preSnapshot ?? null;
    if (beforeHooks.length) {
      if (!snapshot) try {
        snapshot = (await (await getCurrentAdapter(adapter)).findMany({
          model,
          where: hookWhere,
          limit: 1
        }))[0] || null;
      } catch {
      }
      if (snapshot) {
        for (const { source, fn } of beforeHooks) if (await withSpan(`db delete.before ${model}`, {
          [ATTR_HOOK_TYPE]: "delete.before",
          [ATTR_DB_COLLECTION_NAME]: model,
          [ATTR_CONTEXT]: source
        }, () => fn(snapshot, context)) === false) return null;
      }
    }
    const consumed = await consumeFn();
    if (!consumed) return null;
    for (const { source, hooks } of hooksEntries) {
      const toRun = hooks[model]?.delete?.after;
      if (toRun) await queueAfterTransactionHook(async () => {
        await withSpan(`db delete.after ${model}`, {
          [ATTR_HOOK_TYPE]: "delete.after",
          [ATTR_DB_COLLECTION_NAME]: model,
          [ATTR_CONTEXT]: source
        }, () => toRun(consumed, context));
      });
    }
    return consumed;
  }
  return {
    createWithHooks,
    updateWithHooks,
    updateManyWithHooks,
    deleteWithHooks,
    deleteManyWithHooks,
    consumeOneWithHooks
  };
}
function getTTLSeconds(expiresAt, now2 = Date.now()) {
  const expiresMs = typeof expiresAt === "number" ? expiresAt : expiresAt.getTime();
  return Math.max(Math.floor((expiresMs - now2) / 1e3), 0);
}
const createInternalAdapter = (adapter, ctx) => {
  const logger2 = ctx.logger;
  const options = ctx.options;
  const secondaryStorage = options.secondaryStorage;
  const verificationConsumeLocks = /* @__PURE__ */ new Map();
  const sessionExpiration = options.session?.expiresIn || 3600 * 24 * 7;
  const { createWithHooks, updateWithHooks, updateManyWithHooks, deleteWithHooks, deleteManyWithHooks, consumeOneWithHooks } = getWithHooks(adapter, ctx);
  const endPreservedSessions = (where) => {
    const liveSessions = [...where, {
      field: "expiresAt",
      value: /* @__PURE__ */ new Date(),
      operator: "gt"
    }];
    return deleteManyWithHooks(liveSessions, "session", {
      fn: async () => {
        await (await getCurrentAdapter(adapter)).updateMany({
          model: "session",
          where: liveSessions,
          update: { expiresAt: /* @__PURE__ */ new Date() }
        });
      },
      executeMainFn: false
    });
  };
  async function refreshUserSessions(user2) {
    if (!secondaryStorage) return;
    const listRaw = await secondaryStorage.get(`active-sessions-${user2.id}`);
    if (!listRaw) return;
    const now2 = Date.now();
    const validSessions = (safeJSONParse(listRaw) || []).filter((s) => s.expiresAt > now2);
    await Promise.all(validSessions.map(async ({ token }) => {
      const cached = await secondaryStorage.get(token);
      if (!cached) return;
      const parsed = safeJSONParse(cached);
      if (!parsed) return;
      const sessionTTL = getTTLSeconds(parsed.session.expiresAt, now2);
      await secondaryStorage.set(token, JSON.stringify({
        session: parsed.session,
        user: user2
      }), Math.floor(sessionTTL));
    }));
  }
  async function getActiveSessionReferences(userId) {
    if (!secondaryStorage) return [];
    const activeSessions = await secondaryStorage.get(`active-sessions-${userId}`);
    return activeSessions ? safeJSONParse(activeSessions) || [] : [];
  }
  async function deleteCachedUserSessions(userId, sessionReferences) {
    if (!secondaryStorage) return;
    const deletedTokens = new Set(sessionReferences.map((session2) => session2.token));
    for (const { token } of sessionReferences) await secondaryStorage.delete(token);
    const activeSessionsKey = `active-sessions-${userId}`;
    const currentSessionReferences = await getActiveSessionReferences(userId);
    const now2 = Date.now();
    const remainingSessionReferences = currentSessionReferences.filter((session2) => session2.expiresAt > now2 && !deletedTokens.has(session2.token));
    remainingSessionReferences.sort((a, b) => a.expiresAt - b.expiresAt);
    const furthestExpiration = remainingSessionReferences.at(-1)?.expiresAt;
    if (furthestExpiration) {
      await secondaryStorage.set(activeSessionsKey, JSON.stringify(remainingSessionReferences), getTTLSeconds(furthestExpiration, now2));
      return;
    }
    await secondaryStorage.delete(activeSessionsKey);
  }
  async function queueCachedUserSessionDeletion(userId, sessionReferences) {
    if (!secondaryStorage) return;
    const references = sessionReferences ?? await getActiveSessionReferences(userId);
    await queueAfterTransactionHook(() => deleteCachedUserSessions(userId, references), { onError(error2) {
      logger2.error("Failed to delete committed user sessions from secondary storage", error2);
    } });
  }
  async function withVerificationConsumeLock(key, fn) {
    const previous = verificationConsumeLocks.get(key) ?? Promise.resolve();
    let release;
    const current = new Promise((resolve) => {
      release = resolve;
    });
    const next = previous.catch(() => {
    }).then(() => current);
    verificationConsumeLocks.set(key, next);
    await previous.catch(() => {
    });
    try {
      return await fn();
    } finally {
      release();
      if (verificationConsumeLocks.get(key) === next) verificationConsumeLocks.delete(key);
    }
  }
  return {
    createOAuthUser: async (user2, account2) => {
      return runWithTransaction(adapter, async () => {
        const createdUser = await createWithHooks({
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          ...user2,
          email: user2.email?.toLowerCase()
        }, "user", void 0);
        if (!createdUser) throw new APIError("BAD_REQUEST", { message: "Failed to create user" });
        return {
          user: createdUser,
          account: await createWithHooks({
            ...account2,
            userId: createdUser.id,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }, "account", void 0)
        };
      });
    },
    createUser: async (user2, source) => {
      const data = {
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        ...user2,
        email: user2.email?.toLowerCase()
      };
      if (options.user?.validateUserInfo) {
        const validationSource = {
          ...source,
          action: "create-user"
        };
        assertValidUserInfoSource(validationSource);
        let endpointContext;
        try {
          endpointContext = getCurrentAuthEndpointContext();
        } catch (error2) {
          logger2.error("Unable to run validateUserInfo: missing endpoint context", error2);
          throw new APIError("FORBIDDEN", {
            code: "validation_context_missing",
            message: "User validation requires an endpoint context"
          });
        }
        await assertValidUserInfo(endpointContext, {
          user: data,
          source: validationSource
        });
      }
      return await createWithHooks(data, "user", void 0);
    },
    createAccount: async (account2) => {
      return await createWithHooks({
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        ...account2
      }, "account", void 0);
    },
    listSessions: async (userId, options2) => {
      if (secondaryStorage) {
        const currentList = await secondaryStorage.get(`active-sessions-${userId}`);
        if (!currentList) return [];
        const list = safeJSONParse(currentList) || [];
        const now2 = Date.now();
        const seenTokens = /* @__PURE__ */ new Set();
        const sessions = [];
        for (const { token, expiresAt } of list) {
          if (expiresAt <= now2 || seenTokens.has(token)) continue;
          seenTokens.add(token);
          const data = await secondaryStorage.get(token);
          if (!data) continue;
          try {
            const parsed = typeof data === "string" ? JSON.parse(data) : data;
            if (!parsed?.session) continue;
            sessions.push(parseSessionOutput(ctx.options, {
              ...parsed.session,
              expiresAt: new Date(parsed.session.expiresAt)
            }));
          } catch {
            continue;
          }
        }
        return sessions;
      }
      return await (await getCurrentAdapter(adapter)).findMany({
        model: "session",
        where: [{
          field: "userId",
          value: userId
        }, ...options2?.onlyActiveSessions ? [{
          field: "expiresAt",
          value: /* @__PURE__ */ new Date(),
          operator: "gt"
        }] : []]
      });
    },
    listUsers: async (limit, offset, sortBy, where) => {
      return await (await getCurrentAdapter(adapter)).findMany({
        model: "user",
        limit,
        offset,
        sortBy,
        where
      });
    },
    countTotalUsers: async (where) => {
      const total = await (await getCurrentAdapter(adapter)).count({
        model: "user",
        where
      });
      if (typeof total === "string") return parseInt(total);
      return total;
    },
    deleteUser: async (userId) => {
      const sessionReferences = await getActiveSessionReferences(userId);
      if (!secondaryStorage || options.session?.storeSessionInDatabase) await deleteManyWithHooks([{
        field: "userId",
        value: userId
      }], "session", void 0);
      await deleteManyWithHooks([{
        field: "userId",
        value: userId
      }], "account", void 0);
      if (await deleteWithHooks([{
        field: "id",
        value: userId
      }], "user", void 0) !== null) await queueCachedUserSessionDeletion(userId, sessionReferences);
    },
    createSession: async (userId, dontRememberMe, override, overrideAll, storageOptions) => {
      const headers = await (async () => {
        const ctx2 = tryGetCurrentAuthEndpointContext();
        return ctx2?.headers || ctx2?.request?.headers;
      })();
      const storeInDb = options.session?.storeSessionInDatabase;
      const databaseSessionFallbackEnabled = storeInDb === true && options.session?.preserveSessionInDatabase !== true;
      const { id: _, ...rest } = override || {};
      let sessionId;
      if (secondaryStorage && !storeInDb) {
        const generatedId = ctx.generateId({ model: "session" });
        sessionId = generatedId !== false ? generatedId : generateId();
      }
      const defaultAdditionalFields = getSessionDefaultFields(options);
      const data = {
        ...sessionId ? { id: sessionId } : {},
        ipAddress: headers ? getIP(headers, options) || "" : "",
        userAgent: headers?.get("user-agent") || "",
        ...rest,
        /**
        * If the user doesn't want to be remembered
        * set the session to expire in 1 day.
        * The cookie will be set to expire at the end of the session
        */
        expiresAt: dontRememberMe ? getDate(3600 * 24, "sec") : getDate(sessionExpiration, "sec"),
        userId,
        token: generateId(32),
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        ...defaultAdditionalFields,
        ...overrideAll ? rest : {}
      };
      const mirrorSessionToSecondaryStorage = async (sessionData) => {
        if (!secondaryStorage) return sessionData;
        const currentList = await secondaryStorage.get(`active-sessions-${userId}`);
        let list = [];
        const now2 = Date.now();
        if (currentList) {
          list = safeJSONParse(currentList) || [];
          list = list.filter((session2) => session2.expiresAt > now2 && session2.token !== data.token);
        }
        const sorted = [...list, {
          token: data.token,
          expiresAt: data.expiresAt.getTime()
        }].sort((a, b) => a.expiresAt - b.expiresAt);
        const furthestSessionTTL = getTTLSeconds(sorted.at(-1)?.expiresAt ?? data.expiresAt.getTime(), now2);
        if (furthestSessionTTL > 0) await secondaryStorage.set(`active-sessions-${userId}`, JSON.stringify(sorted), furthestSessionTTL);
        const user2 = await (await getCurrentAdapter(adapter)).findOne({
          model: "user",
          where: [{
            field: "id",
            value: userId
          }]
        });
        const sessionTTL = getTTLSeconds(data.expiresAt, now2);
        if (sessionTTL > 0) await secondaryStorage.set(data.token, JSON.stringify({
          session: sessionData,
          user: user2
        }), sessionTTL);
        return sessionData;
      };
      const res = await createWithHooks(data, "session", secondaryStorage ? {
        fn: async (sessionData) => {
          return storageOptions?.deferSecondaryStorageWrites ? sessionData : mirrorSessionToSecondaryStorage(sessionData);
        },
        executeMainFn: storeInDb
      } : void 0);
      if (secondaryStorage && storageOptions?.deferSecondaryStorageWrites && res) await queueAfterTransactionHook(async () => {
        await mirrorSessionToSecondaryStorage(res);
      }, databaseSessionFallbackEnabled ? { onError(error2) {
        logger2.error("Failed to mirror committed session to secondary storage", error2);
      } } : void 0);
      return res;
    },
    findSession: async (token) => {
      if (secondaryStorage) {
        const sessionStringified = await secondaryStorage.get(token);
        if (!sessionStringified && (!options.session?.storeSessionInDatabase || ctx.options.session?.preserveSessionInDatabase)) return null;
        if (sessionStringified) {
          const s = safeJSONParse(sessionStringified);
          if (!s) return null;
          return {
            session: parseSessionOutput(ctx.options, {
              ...s.session,
              expiresAt: new Date(s.session.expiresAt),
              createdAt: new Date(s.session.createdAt),
              updatedAt: new Date(s.session.updatedAt)
            }),
            user: parseUserOutput(ctx.options, {
              ...s.user,
              createdAt: new Date(s.user.createdAt),
              updatedAt: new Date(s.user.updatedAt)
            })
          };
        }
      }
      const result = await (await getCurrentAdapter(adapter)).findOne({
        model: "session",
        where: [{
          value: token,
          field: "token"
        }],
        join: { user: true }
      });
      if (!result) return null;
      const { user: user2, ...session2 } = result;
      if (!user2) return null;
      return {
        session: parseSessionOutput(ctx.options, session2),
        user: parseUserOutput(ctx.options, user2)
      };
    },
    findSessions: async (sessionTokens, options2) => {
      if (secondaryStorage) {
        const sessions2 = [];
        for (const sessionToken of sessionTokens) {
          const sessionStringified = await secondaryStorage.get(sessionToken);
          if (sessionStringified) try {
            const s = typeof sessionStringified === "string" ? JSON.parse(sessionStringified) : sessionStringified;
            if (!s) continue;
            const expiresAt = new Date(s.session.expiresAt);
            if (options2?.onlyActiveSessions && expiresAt <= /* @__PURE__ */ new Date()) continue;
            const session2 = {
              session: {
                ...s.session,
                expiresAt: new Date(s.session.expiresAt)
              },
              user: {
                ...s.user,
                createdAt: new Date(s.user.createdAt),
                updatedAt: new Date(s.user.updatedAt)
              }
            };
            sessions2.push(session2);
          } catch {
            continue;
          }
        }
        return sessions2;
      }
      const sessions = await (await getCurrentAdapter(adapter)).findMany({
        model: "session",
        where: [{
          field: "token",
          value: sessionTokens,
          operator: "in"
        }, ...options2?.onlyActiveSessions ? [{
          field: "expiresAt",
          value: /* @__PURE__ */ new Date(),
          operator: "gt"
        }] : []],
        join: { user: true }
      });
      if (!sessions.length) return [];
      if (sessions.some((session2) => !session2.user)) return [];
      return sessions.map((_session) => {
        const { user: user2, ...session2 } = _session;
        return {
          session: session2,
          user: user2
        };
      });
    },
    updateSession: async (sessionToken, session2) => {
      return await updateWithHooks(session2, [{
        field: "token",
        value: sessionToken
      }], "session", secondaryStorage ? {
        async fn(data) {
          const currentSession = await secondaryStorage.get(sessionToken);
          if (!currentSession) return null;
          const parsedSession = safeJSONParse(currentSession);
          if (!parsedSession) return null;
          const mergedSession = {
            ...parsedSession.session,
            ...data,
            expiresAt: new Date(data.expiresAt ?? parsedSession.session.expiresAt),
            createdAt: new Date(parsedSession.session.createdAt),
            updatedAt: new Date(data.updatedAt ?? parsedSession.session.updatedAt)
          };
          const updatedSession = parseSessionOutput(ctx.options, mergedSession);
          const now2 = Date.now();
          const expiresMs = new Date(updatedSession.expiresAt).getTime();
          const sessionTTL = getTTLSeconds(expiresMs, now2);
          if (sessionTTL > 0) {
            await secondaryStorage.set(sessionToken, JSON.stringify({
              session: updatedSession,
              user: parsedSession.user
            }), sessionTTL);
            const listKey = `active-sessions-${updatedSession.userId}`;
            const listRaw = await secondaryStorage.get(listKey);
            const sorted = (listRaw ? safeJSONParse(listRaw) || [] : []).filter((s) => s.token !== sessionToken && s.expiresAt > now2).concat([{
              token: sessionToken,
              expiresAt: expiresMs
            }]).sort((a, b) => a.expiresAt - b.expiresAt);
            const furthestSessionExp = sorted.at(-1)?.expiresAt;
            if (furthestSessionExp && furthestSessionExp > now2) await secondaryStorage.set(listKey, JSON.stringify(sorted), getTTLSeconds(furthestSessionExp, now2));
            else await secondaryStorage.delete(listKey);
          }
          return updatedSession;
        },
        executeMainFn: options.session?.storeSessionInDatabase
      } : void 0);
    },
    deleteSession: async (token) => {
      if (secondaryStorage) {
        const data = await secondaryStorage.get(token);
        if (data) {
          const { session: session2 } = safeJSONParse(data) ?? {};
          if (!session2) {
            logger2.error("Session not found in secondary storage");
            return;
          }
          const userId = session2.userId;
          const currentList = await secondaryStorage.get(`active-sessions-${userId}`);
          if (currentList) {
            const list = safeJSONParse(currentList) || [];
            const now2 = Date.now();
            const filtered = list.filter((session3) => session3.expiresAt > now2 && session3.token !== token);
            const furthestSessionExp = filtered.sort((a, b) => a.expiresAt - b.expiresAt).at(-1)?.expiresAt;
            if (filtered.length > 0 && furthestSessionExp && furthestSessionExp > Date.now()) await secondaryStorage.set(`active-sessions-${userId}`, JSON.stringify(filtered), getTTLSeconds(furthestSessionExp, now2));
            else await secondaryStorage.delete(`active-sessions-${userId}`);
          } else logger2.error("Active sessions list not found in secondary storage");
        }
        await secondaryStorage.delete(token);
        if (!options.session?.storeSessionInDatabase) return;
        if (ctx.options.session?.preserveSessionInDatabase) {
          await endPreservedSessions([{
            field: "token",
            value: token
          }]);
          return;
        }
      }
      await deleteWithHooks([{
        field: "token",
        value: token
      }], "session", void 0);
    },
    deleteAccounts: async (userId) => {
      await deleteManyWithHooks([{
        field: "userId",
        value: userId
      }], "account", void 0);
    },
    /**
    * Delete an account by its primary key.
    *
    * @param id - The account row's primary key, not its accountId.
    */
    deleteAccount: async (id) => {
      await deleteWithHooks([{
        field: "id",
        value: id
      }], "account", void 0);
    },
    deleteUserSessions: async (userId) => {
      const sessionReferences = await getActiveSessionReferences(userId);
      if (secondaryStorage) {
        if (!options.session?.storeSessionInDatabase) {
          await queueCachedUserSessionDeletion(userId, sessionReferences);
          return;
        }
        if (ctx.options.session?.preserveSessionInDatabase) {
          if (await endPreservedSessions([{
            field: "userId",
            value: userId
          }]) !== null) await queueCachedUserSessionDeletion(userId, sessionReferences);
          return;
        }
      }
      if (await deleteManyWithHooks([{
        field: "userId",
        value: userId
      }], "session", void 0) !== null) await queueCachedUserSessionDeletion(userId, sessionReferences);
    },
    deleteSessions: async (sessionTokens) => {
      if (secondaryStorage) {
        await Promise.all(sessionTokens.map((token) => secondaryStorage.delete(token)));
        if (!options.session?.storeSessionInDatabase) return;
        if (ctx.options.session?.preserveSessionInDatabase) {
          await endPreservedSessions([{
            field: "token",
            value: sessionTokens,
            operator: "in"
          }]);
          return;
        }
      }
      await deleteManyWithHooks([{
        field: "token",
        value: sessionTokens,
        operator: "in"
      }], "session", void 0);
    },
    findAccountOwnerByKey: async ({ issuer, accountId }) => {
      const accountWithUser = await (await getCurrentAdapter(adapter)).findOne({
        model: "account",
        where: [{
          field: "issuer",
          value: issuer
        }, {
          field: "accountId",
          value: accountId
        }],
        join: { user: true }
      });
      if (!accountWithUser) return null;
      const { user: user2, ...account2 } = accountWithUser;
      return user2 ? {
        kind: "owned",
        user: user2,
        account: account2
      } : {
        kind: "orphaned",
        account: account2
      };
    },
    findUserByEmail: async (email, options2) => {
      const result = await (await getCurrentAdapter(adapter)).findOne({
        model: "user",
        where: [{
          value: email.toLowerCase(),
          field: "email"
        }],
        join: { ...options2?.includeAccounts ? { account: true } : {} }
      });
      if (!result) return null;
      const { account: accounts, ...user2 } = result;
      return {
        user: user2,
        accounts: accounts ?? []
      };
    },
    findUserById: async (userId) => {
      if (!userId) return null;
      return await (await getCurrentAdapter(adapter)).findOne({
        model: "user",
        where: [{
          field: "id",
          value: userId
        }]
      });
    },
    linkAccount: async (account2) => {
      return await createWithHooks({
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        ...account2
      }, "account", void 0);
    },
    updateUser: async (userId, data) => {
      const user2 = await updateWithHooks({
        ...data,
        ...data.email ? { email: data.email.toLowerCase() } : {}
      }, [{
        field: "id",
        value: userId
      }], "user", void 0);
      await queueAfterTransactionHook(() => refreshUserSessions(user2), { onError(error2) {
        logger2.error("Failed to refresh committed user sessions in secondary storage", error2);
      } });
      return user2;
    },
    updateUserByEmail: async (email, data) => {
      const user2 = await updateWithHooks({
        ...data,
        ...data.email ? { email: data.email.toLowerCase() } : {}
      }, [{
        field: "email",
        value: email.toLowerCase()
      }], "user", void 0);
      await queueAfterTransactionHook(() => refreshUserSessions(user2), { onError(error2) {
        logger2.error("Failed to refresh committed user sessions in secondary storage", error2);
      } });
      return user2;
    },
    updatePassword: async (userId, password) => {
      await updateManyWithHooks({ password }, [
        {
          field: "userId",
          value: userId
        },
        {
          field: "providerId",
          value: "credential"
        },
        {
          field: "issuer",
          value: createLocalAccountIssuer("credential")
        },
        {
          field: "accountId",
          value: userId
        }
      ], "account", void 0);
    },
    findAccounts: async (userId) => {
      return await (await getCurrentAdapter(adapter)).findMany({
        model: "account",
        where: [{
          field: "userId",
          value: userId
        }]
      });
    },
    findCredentialAccount: async (userId) => {
      return (await getCurrentAdapter(adapter)).findOne({
        model: "account",
        where: [
          {
            field: "userId",
            value: userId
          },
          {
            field: "providerId",
            value: "credential"
          },
          {
            field: "issuer",
            value: createLocalAccountIssuer("credential")
          },
          {
            field: "accountId",
            value: userId
          }
        ]
      });
    },
    findAccountByKey: async ({ issuer, accountId }) => {
      return await (await getCurrentAdapter(adapter)).findOne({
        model: "account",
        where: [{
          field: "issuer",
          value: issuer
        }, {
          field: "accountId",
          value: accountId
        }]
      });
    },
    findAccountByUserId: async (userId) => {
      return await (await getCurrentAdapter(adapter)).findMany({
        model: "account",
        where: [{
          field: "userId",
          value: userId
        }]
      });
    },
    updateAccount: async (id, data) => {
      return await updateWithHooks(data, [{
        field: "id",
        value: id
      }], "account", void 0);
    },
    createVerificationValue: async (data) => {
      const storageOption = getStorageOption(data.identifier, options.verification?.storeIdentifier);
      const storedIdentifier = await processIdentifier(data.identifier, storageOption);
      return await createWithHooks({
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        ...data,
        identifier: storedIdentifier
      }, "verification", secondaryStorage ? {
        async fn(verificationData) {
          const ttl = getTTLSeconds(verificationData.expiresAt);
          if (ttl > 0) await secondaryStorage.set(`verification:${storedIdentifier}`, JSON.stringify(verificationData), ttl);
          return verificationData;
        },
        executeMainFn: options.verification?.storeInDatabase
      } : void 0);
    },
    findVerificationValue: async (identifier) => {
      const storageOption = getStorageOption(identifier, options.verification?.storeIdentifier);
      const storedIdentifier = await processIdentifier(identifier, storageOption);
      if (secondaryStorage) {
        const cached = await secondaryStorage.get(`verification:${storedIdentifier}`);
        if (cached) {
          const parsed = safeJSONParse(cached);
          if (parsed) return parsed;
        }
        if (storageOption && storageOption !== "plain") {
          const plainCached = await secondaryStorage.get(`verification:${identifier}`);
          if (plainCached) {
            const parsed = safeJSONParse(plainCached);
            if (parsed) return parsed;
          }
        }
        if (!options.verification?.storeInDatabase) return null;
      }
      const currentAdapter = await getCurrentAdapter(adapter);
      async function findByIdentifier(id) {
        return currentAdapter.findMany({
          model: "verification",
          where: [{
            field: "identifier",
            value: id
          }],
          sortBy: {
            field: "createdAt",
            direction: "desc"
          },
          limit: 1
        });
      }
      let verification2 = await findByIdentifier(storedIdentifier);
      if (!verification2.length && storageOption && storageOption !== "plain") verification2 = await findByIdentifier(identifier);
      if (!options.verification?.disableCleanup) await deleteManyWithHooks([{
        field: "expiresAt",
        value: /* @__PURE__ */ new Date(),
        operator: "lt"
      }], "verification", void 0);
      return verification2[0] || null;
    },
    deleteVerificationByIdentifier: async (identifier) => {
      const storedIdentifier = await processIdentifier(identifier, getStorageOption(identifier, options.verification?.storeIdentifier));
      if (secondaryStorage) await secondaryStorage.delete(`verification:${storedIdentifier}`);
      if (!secondaryStorage || options.verification?.storeInDatabase) await deleteWithHooks([{
        field: "identifier",
        value: storedIdentifier
      }], "verification", void 0);
    },
    /**
    * Atomically consume a single-use verification row by `identifier` and
    * return it. The first concurrent caller receives the latest row for the
    * identifier; every other caller racing against it receives `null`.
    *
    * Race-safe replacement for the `findVerificationValue` then
    * `deleteVerificationByIdentifier` pair. Callers MUST gate any state
    * change (issue session, mint token, change password) on a non-null
    * return value, because consuming one row invalidates the whole
    * identifier and stale rows cannot be replayed.
    *
    * Rows past their `expiresAt` are treated as already invalid: the row
    * is still deleted (so it cannot be replayed later) but `null` is
    * returned. Callers do not need their own `expiresAt` gate.
    *
    * The secondary-storage-only path (`storeInDatabase: false`) consumes
    * through `getAndDelete`, which is required on `SecondaryStorage` so
    * single-use values are not read and deleted as separate operations.
    */
    consumeVerificationValue: async (identifier) => {
      const storageOption = getStorageOption(identifier, options.verification?.storeIdentifier);
      const storedIdentifier = await processIdentifier(identifier, storageOption);
      const identifiersToTry = storageOption && storageOption !== "plain" ? [storedIdentifier, identifier] : [storedIdentifier];
      const hydrateCachedVerification = (raw) => {
        if (!raw) return null;
        const candidate = typeof raw === "string" ? safeJSONParse(raw) : typeof raw === "object" ? raw : null;
        if (!candidate) return null;
        const expiresAt = new Date(candidate.expiresAt);
        if (!Number.isFinite(expiresAt.getTime())) return null;
        return {
          ...candidate,
          expiresAt
        };
      };
      let consumed = null;
      if (secondaryStorage && !options.verification?.storeInDatabase) {
        const consumeCacheKey = async (key) => {
          return hydrateCachedVerification(await secondaryStorage.getAndDelete(key));
        };
        for (const stored of identifiersToTry) {
          const cached = await consumeCacheKey(`verification:${stored}`);
          if (!cached) continue;
          await Promise.all(identifiersToTry.filter((candidate) => candidate !== stored).map((candidate) => secondaryStorage.delete(`verification:${candidate}`)));
          consumed = cached;
          break;
        }
      } else {
        const consumeByIdentifier = async (id) => withVerificationConsumeLock(`verification:${id}`, () => runWithTransaction(adapter, async () => {
          const txAdapter = await getCurrentAdapter(adapter);
          const where = [{
            field: "identifier",
            value: id
          }];
          const latest = (await txAdapter.findMany({
            model: "verification",
            where,
            sortBy: {
              field: "createdAt",
              direction: "desc"
            },
            limit: 1
          }))[0] ?? null;
          if (!latest) return null;
          return consumeOneWithHooks("verification", [{
            field: "id",
            value: latest.id
          }], async () => {
            const row = await txAdapter.consumeOne({
              model: "verification",
              where: [{
                field: "id",
                value: latest.id
              }]
            });
            if (!row) return null;
            await txAdapter.deleteMany({
              model: "verification",
              where
            });
            return row;
          }, latest);
        }));
        for (const stored of identifiersToTry) {
          consumed = await consumeByIdentifier(stored);
          if (consumed) break;
        }
        if (consumed && secondaryStorage) await Promise.all(identifiersToTry.map((stored) => secondaryStorage.delete(`verification:${stored}`)));
      }
      if (!consumed || consumed.expiresAt < /* @__PURE__ */ new Date()) return null;
      return consumed;
    },
    /**
    * First-writer-wins create keyed by a deterministic primary key derived
    * from `identifier`. Returns `true` when this caller created the row and
    * `false` when a row for the same identifier already existed.
    *
    * The dual of `consumeVerificationValue`: where consume races to delete a
    * marker exactly once, reserve races to create a marker exactly once. Use
    * it for replay tombstones (a SAML assertion id, a JWT `jti`) where the
    * first caller wins and every later caller must observe that the marker is
    * already taken.
    *
    * The `verification.identifier` column is non-unique, so uniqueness comes
    * from a deterministic primary key (`SHA-256` of `reserve:<identifier>`).
    * The database path is atomic: the primary key turns the INSERT into the
    * first-writer-wins gate, and a duplicate is detected portably by
    * re-reading the row rather than matching adapter-specific errors.
    * Secondary-storage-only verification cannot enforce the deterministic
    * primary-key gate, so this operation fails closed unless verification is
    * backed by the database.
    *
    * The atomic guarantee requires the configured adapter to reject a
    * duplicate primary key on insert, which every real database enforces. The
    * in-memory adapter does not enforce primary-key uniqueness, so reservation
    * is best-effort there (it is intended for development and tests).
    */
    reserveVerificationValue: async (data) => {
      const reservationId = base64Url.encode(new Uint8Array(await createHash("SHA-256").digest(new TextEncoder().encode("reserve:" + data.identifier))), { padding: false });
      const storageOption = getStorageOption(data.identifier, options.verification?.storeIdentifier);
      const storedIdentifier = await processIdentifier(data.identifier, storageOption);
      if (secondaryStorage && !options.verification?.storeInDatabase) throw new BetterAuthError("reserveVerificationValue requires database-backed verification storage. Set verification.storeInDatabase to true for flows that reserve verification values.");
      try {
        await adapter.create({
          model: "verification",
          data: {
            id: reservationId,
            identifier: storedIdentifier,
            value: data.value,
            expiresAt: data.expiresAt,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          },
          forceAllowId: true
        });
      } catch (error2) {
        if (await adapter.findOne({
          model: "verification",
          where: [{
            field: "id",
            value: reservationId
          }]
        })) return false;
        throw error2;
      }
      if (secondaryStorage) {
        const ttl = getTTLSeconds(data.expiresAt);
        if (ttl > 0) await secondaryStorage.set(`verification:${storedIdentifier}`, JSON.stringify({
          id: reservationId,
          identifier: storedIdentifier,
          value: data.value,
          expiresAt: data.expiresAt
        }), ttl);
      }
      return true;
    },
    updateVerificationByIdentifier: async (identifier, data) => {
      const storedIdentifier = await processIdentifier(identifier, getStorageOption(identifier, options.verification?.storeIdentifier));
      if (secondaryStorage) {
        const cached = await secondaryStorage.get(`verification:${storedIdentifier}`);
        if (cached) {
          const parsed = safeJSONParse(cached);
          if (parsed) {
            const updated = {
              ...parsed,
              ...data
            };
            const expiresAt = updated.expiresAt ?? parsed.expiresAt;
            const ttl = getTTLSeconds(expiresAt instanceof Date ? expiresAt : new Date(expiresAt));
            if (ttl > 0) await secondaryStorage.set(`verification:${storedIdentifier}`, JSON.stringify(updated), ttl);
            if (!options.verification?.storeInDatabase) return updated;
          }
        }
      }
      if (!secondaryStorage || options.verification?.storeInDatabase) return await updateWithHooks(data, [{
        field: "identifier",
        value: storedIdentifier
      }], "verification", void 0);
      return data;
    },
    refreshUserSessions
  };
};
async function runPluginInit(context) {
  let options = context.options;
  const plugins = options.plugins || [];
  const pluginTrustedOrigins = [];
  const dbHooks = [];
  for (const plugin of plugins) if (plugin.init) {
    const initPromise = plugin.init(context);
    let result;
    if (isPromise(initPromise)) result = await initPromise;
    else result = initPromise;
    if (typeof result === "object") {
      if (result.options) {
        const { databaseHooks, trustedOrigins, ...restOpts } = result.options;
        if (databaseHooks) dbHooks.push({
          source: `plugin:${plugin.id}`,
          hooks: databaseHooks
        });
        if (trustedOrigins) pluginTrustedOrigins.push(trustedOrigins);
        options = defu(options, restOpts);
      }
      if (result.context) Object.assign(context, result.context);
    }
  }
  if (pluginTrustedOrigins.length > 0) {
    const allSources = [...options.trustedOrigins ? [options.trustedOrigins] : [], ...pluginTrustedOrigins];
    const staticOrigins = allSources.filter(Array.isArray).flat();
    const dynamicOrigins = allSources.filter((s) => typeof s === "function");
    if (dynamicOrigins.length > 0) options.trustedOrigins = async (request) => {
      const resolved = await Promise.all(dynamicOrigins.map((fn) => fn(request)));
      return [...staticOrigins, ...resolved.flat()].filter((v) => typeof v === "string" && v !== "");
    };
    else options.trustedOrigins = staticOrigins;
  }
  if (options.databaseHooks) dbHooks.push({
    source: "user",
    hooks: options.databaseHooks
  });
  context.internalAdapter = createInternalAdapter(context.adapter, {
    options,
    logger: context.logger,
    hooks: dbHooks,
    generateId: context.generateId
  });
  context.options = options;
}
function getInternalPlugins(options) {
  const plugins = [];
  if (options.advanced?.crossSubDomainCookies?.enabled) ;
  return plugins;
}
async function getTrustedOrigins(options, request) {
  const trustedOrigins = [];
  if (isDynamicBaseURLConfig(options.baseURL)) {
    const allowedHosts = options.baseURL.allowedHosts;
    const proto = options.baseURL.protocol;
    for (const host of allowedHosts) if (!host.includes("://")) {
      if (!proto || proto === "https" || proto === "auto") trustedOrigins.push(`https://${host}`);
      if (proto === "http" || proto === "auto" || isLoopbackHost(host)) trustedOrigins.push(`http://${host}`);
    } else trustedOrigins.push(host);
    if (options.baseURL.fallback) try {
      trustedOrigins.push(new URL(options.baseURL.fallback).origin);
    } catch {
    }
  } else {
    const baseURL = getBaseURL(typeof options.baseURL === "string" ? options.baseURL : void 0, options.basePath, request);
    if (baseURL) trustedOrigins.push(new URL(baseURL).origin);
  }
  if (options.trustedOrigins) {
    if (Array.isArray(options.trustedOrigins)) trustedOrigins.push(...options.trustedOrigins);
    if (typeof options.trustedOrigins === "function") {
      const validOrigins = await options.trustedOrigins(request);
      trustedOrigins.push(...validOrigins);
    }
  }
  const envTrustedOrigins = env.BETTER_AUTH_TRUSTED_ORIGINS;
  if (envTrustedOrigins) trustedOrigins.push(...envTrustedOrigins.split(","));
  return trustedOrigins.filter((v) => Boolean(v));
}
function pickSource(input) {
  if (isRequestLike(input?.request)) return input.request;
  if (!input?.headers) return void 0;
  const headers = input.headers instanceof Headers ? input.headers : new Headers(input.headers);
  if (!headers.has("host") && !headers.has("x-forwarded-host")) return;
  return headers;
}
function resolveDynamicTrustedProxyHeaders(options) {
  return options.advanced?.trustedProxyHeaders ?? false;
}
async function resolveRequestContext(ctx, source, trustedProxyHeaders) {
  const dynamicBaseURLConfig = ctx.options.baseURL;
  const baseURL = resolveBaseURL(dynamicBaseURLConfig, ctx.options.basePath || "/api/auth", source, void 0, trustedProxyHeaders);
  if (!baseURL) throw new BetterAuthError("Could not resolve base URL from request. Check your allowedHosts config.");
  const resolved = Object.create(Object.getPrototypeOf(ctx), Object.getOwnPropertyDescriptors(ctx));
  resolved.baseURL = baseURL;
  resolved.options = {
    ...ctx.options,
    baseURL: getOrigin(baseURL) || void 0
  };
  const trustedOriginOptions = {
    ...resolved.options,
    baseURL: dynamicBaseURLConfig
  };
  const needsRequest = typeof ctx.options.trustedOrigins === "function" || typeof ctx.options.account?.accountLinking?.trustedProviders === "function";
  let callbackRequest;
  if (needsRequest) if (isRequestLike(source)) callbackRequest = source;
  else if (source) callbackRequest = new Request(baseURL, { headers: source });
  else callbackRequest = void 0;
  else callbackRequest = void 0;
  resolved.trustedOrigins = await getTrustedOrigins(trustedOriginOptions, callbackRequest);
  resolved.trustedProviders = await getTrustedProviders(resolved.options, callbackRequest);
  if (ctx.options.advanced?.crossSubDomainCookies?.enabled) {
    resolved.authCookies = getCookies(resolved.options);
    resolved.createAuthCookie = createCookieGetter(resolved.options);
  }
  return resolved;
}
async function getAwaitableValue(arr, item) {
  if (!arr) return void 0;
  for (const val of arr) {
    const value = typeof val === "function" ? await val() : val;
    if (value[item.field ?? "id"] === item.value) return value;
  }
}
async function getTrustedProviders(options, request) {
  const trustedProviders = options.account?.accountLinking?.trustedProviders;
  if (!trustedProviders) return [];
  if (Array.isArray(trustedProviders)) return trustedProviders.filter((v) => Boolean(v));
  return (await trustedProviders(request) ?? []).filter((v) => Boolean(v));
}
function toOAuthProfileRecord(profile) {
  return profile;
}
async function resolveOAuthAccountKey(provider, tokens, profile) {
  const accountKeyContext = {
    tokens,
    profile
  };
  const accountSubject = provider.accountSubject;
  const resolvedSubject = await accountSubject(accountKeyContext);
  const accountId = String(resolvedSubject);
  if (typeof resolvedSubject === "number" && !Number.isFinite(resolvedSubject) || accountId.trim().length === 0 || accountId === "undefined" || accountId === "null") throw new BetterAuthError("OAUTH_ACCOUNT_SUBJECT_INVALID");
  const accountIssuer = provider.accountIssuer;
  const issuer = accountIssuer === void 0 ? createOAuthAccountIssuer(provider.id) : typeof accountIssuer === "function" ? await accountIssuer(accountKeyContext) : accountIssuer;
  if (typeof issuer !== "string" || issuer.trim().length === 0 || issuer === "undefined" || issuer === "null") throw new BetterAuthError("OAUTH_ACCOUNT_ISSUER_INVALID");
  return {
    issuer,
    accountId
  };
}
async function resolveOAuthAccountKeyForAPI(provider, tokens, profile) {
  try {
    return await resolveOAuthAccountKey(provider, tokens, profile);
  } catch {
    throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.FAILED_TO_GET_USER_INFO);
  }
}
function isLikelyEncrypted(token) {
  if (token.startsWith("$ba$")) return true;
  return token.length % 2 === 0 && /^[0-9a-f]+$/i.test(token);
}
function decryptOAuthToken(token, ctx) {
  if (!token) return token;
  if (ctx.options.account?.encryptOAuthTokens) {
    if (!isLikelyEncrypted(token)) return token;
    return symmetricDecrypt({
      key: ctx.secretConfig,
      data: token
    });
  }
  return token;
}
function setTokenUtil(token, ctx) {
  if (ctx.options.account?.encryptOAuthTokens && token) return symmetricEncrypt({
    key: ctx.secretConfig,
    data: token
  });
  return token;
}
function getOAuthCallbackPath(provider) {
  if (!provider.callbackPath) return `/callback/${provider.id}`;
  return provider.callbackPath.startsWith("/") ? provider.callbackPath : `/${provider.callbackPath}`;
}
function safeCloneRequest(request) {
  if (!request) return;
  try {
    return request.clone();
  } catch {
    return new Request(request.url, {
      cache: request.cache,
      credentials: request.credentials,
      headers: request.headers,
      integrity: request.integrity,
      keepalive: request.keepalive,
      method: request.method,
      mode: request.mode,
      redirect: request.redirect,
      referrer: request.referrer,
      referrerPolicy: request.referrerPolicy,
      signal: request.signal
    });
  }
}
async function createEmailVerificationToken(secret, email, updateTo, expiresIn = 3600, extraPayload) {
  return await signJWT({
    email: email.toLowerCase(),
    updateTo: updateTo?.toLowerCase(),
    ...extraPayload
  }, secret, expiresIn);
}
async function sendVerificationEmailFn(ctx, user2) {
  if (!ctx.context.options.emailVerification?.sendVerificationEmail) {
    ctx.context.logger.error("Verification email isn't enabled.");
    throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.VERIFICATION_EMAIL_NOT_ENABLED);
  }
  const token = await createEmailVerificationToken(ctx.context.secret, user2.email, void 0, ctx.context.options.emailVerification?.expiresIn);
  const callbackURL = ctx.body.callbackURL ? encodeURIComponent(ctx.body.callbackURL) : encodeURIComponent("/");
  const url = `${ctx.context.baseURL}/verify-email?token=${token}&callbackURL=${callbackURL}`;
  await ctx.context.options.emailVerification.sendVerificationEmail({
    user: user2,
    url,
    token
  }, ctx.request);
}
const sendVerificationEmail = createAuthEndpoint("/send-verification-email", {
  method: "POST",
  operationId: "sendVerificationEmail",
  cloneRequest: true,
  body: z.object({
    email: z.email().meta({ description: "The email to send the verification email to" }),
    callbackURL: z.string().meta({ description: "The URL to use for email verification callback" }).optional()
  }),
  metadata: { openapi: {
    operationId: "sendVerificationEmail",
    description: "Send a verification email to the user",
    requestBody: { content: { "application/json": { schema: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "The email to send the verification email to",
          example: "user@example.com"
        },
        callbackURL: {
          type: "string",
          description: "The URL to use for email verification callback",
          example: "https://example.com/callback",
          nullable: true
        }
      },
      required: ["email"]
    } } } },
    responses: {
      "200": {
        description: "Success",
        content: { "application/json": { schema: {
          type: "object",
          properties: { status: {
            type: "boolean",
            description: "Indicates if the email was sent successfully",
            example: true
          } }
        } } }
      },
      "400": {
        description: "Bad Request",
        content: { "application/json": { schema: {
          type: "object",
          properties: { message: {
            type: "string",
            description: "Error message",
            example: "Verification email isn't enabled"
          } }
        } } }
      }
    }
  } }
}, async (ctx) => {
  if (!ctx.context.options.emailVerification?.sendVerificationEmail) {
    ctx.context.logger.error("Verification email isn't enabled.");
    throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.VERIFICATION_EMAIL_NOT_ENABLED);
  }
  const { email } = ctx.body;
  const session2 = await getSessionFromCtx(ctx);
  if (!session2) {
    const MINIMUM_MS = 500;
    const start = Date.now();
    const user2 = await ctx.context.internalAdapter.findUserByEmail(email);
    let error2;
    if (!user2 || user2.user.emailVerified) await createEmailVerificationToken(ctx.context.secret, email, void 0, ctx.context.options.emailVerification?.expiresIn);
    else try {
      await sendVerificationEmailFn(ctx, user2.user);
    } catch (e) {
      error2 = e;
    }
    const remaining = MINIMUM_MS - (Date.now() - start);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    if (error2) throw error2;
    return ctx.json({ status: true });
  }
  if (session2?.user.email.toLowerCase() !== email.toLowerCase()) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.EMAIL_MISMATCH);
  if (session2?.user.emailVerified) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.EMAIL_ALREADY_VERIFIED);
  await sendVerificationEmailFn(ctx, session2.user);
  return ctx.json({ status: true });
});
const verifyEmail = createAuthEndpoint("/verify-email", {
  method: "GET",
  operationId: "verifyEmail",
  query: z.object({
    token: z.string().meta({ description: "The token to verify the email" }),
    callbackURL: z.string().meta({ description: "The URL to redirect to after email verification" }).optional()
  }),
  use: [originCheck((ctx) => ctx.query.callbackURL)],
  metadata: { openapi: {
    description: "Verify the email of the user",
    parameters: [{
      name: "token",
      in: "query",
      description: "The token to verify the email",
      required: true,
      schema: { type: "string" }
    }, {
      name: "callbackURL",
      in: "query",
      description: "The URL to redirect to after email verification",
      required: false,
      schema: { type: "string" }
    }],
    responses: { "200": {
      description: "Success",
      content: { "application/json": { schema: {
        type: "object",
        properties: {
          user: {
            type: "object",
            $ref: "#/components/schemas/User"
          },
          status: {
            type: "boolean",
            description: "Indicates if the email was verified successfully"
          }
        },
        required: ["user", "status"]
      } } }
    } }
  } }
}, async (ctx) => {
  function redirectOnError2(error2) {
    if (ctx.query.callbackURL) {
      const params = new URLSearchParams({ error: error2.code });
      const redirectURL = appendQueryParams(ctx.query.callbackURL, params);
      throw ctx.redirect(redirectURL);
    }
    throw APIError.from("UNAUTHORIZED", error2);
  }
  const { token } = ctx.query;
  let jwt;
  try {
    jwt = await jwtVerify(token, new TextEncoder().encode(ctx.context.secret), { algorithms: ["HS256"] });
  } catch (e) {
    if (e instanceof JWTExpired) return redirectOnError2(BASE_ERROR_CODES.TOKEN_EXPIRED);
    return redirectOnError2(BASE_ERROR_CODES.INVALID_TOKEN);
  }
  const parsed = z.object({
    email: z.email(),
    updateTo: z.string().optional(),
    requestType: z.string().optional()
  }).parse(jwt.payload);
  const user2 = await ctx.context.internalAdapter.findUserByEmail(parsed.email);
  if (!user2) return redirectOnError2(BASE_ERROR_CODES.USER_NOT_FOUND);
  if (parsed.updateTo) {
    const session2 = await getSessionFromCtx(ctx);
    if (session2 && session2.user.email !== parsed.email) return redirectOnError2(BASE_ERROR_CODES.INVALID_USER);
    switch (parsed.requestType) {
      /**
      * User clicks confirmation -> sends verification to new email
      */
      case "change-email-confirmation": {
        const newToken = await createEmailVerificationToken(ctx.context.secret, parsed.email, parsed.updateTo, ctx.context.options.emailVerification?.expiresIn, { requestType: "change-email-verification" });
        const updateCallbackURL = ctx.query.callbackURL ? encodeURIComponent(ctx.query.callbackURL) : encodeURIComponent("/");
        const url = `${ctx.context.baseURL}/verify-email?token=${newToken}&callbackURL=${updateCallbackURL}`;
        if (ctx.context.options.emailVerification?.sendVerificationEmail) await ctx.context.runInBackgroundOrAwait(ctx.context.options.emailVerification.sendVerificationEmail({
          user: {
            ...user2.user,
            email: parsed.updateTo
          },
          url,
          token: newToken
        }, safeCloneRequest(ctx.request)));
        if (ctx.query.callbackURL) throw ctx.redirect(ctx.query.callbackURL);
        return ctx.json({ status: true });
      }
      /**
      * User clicks verification -> updates email
      */
      case "change-email-verification": {
        let activeSession = session2;
        if (!activeSession) {
          const newSession = await ctx.context.internalAdapter.createSession(user2.user.id);
          if (!newSession) throw APIError.from("INTERNAL_SERVER_ERROR", BASE_ERROR_CODES.FAILED_TO_CREATE_SESSION);
          activeSession = {
            session: newSession,
            user: user2.user
          };
        }
        const updatedUser2 = await ctx.context.internalAdapter.updateUserByEmail(parsed.email, {
          email: parsed.updateTo,
          emailVerified: true
        });
        if (ctx.context.options.emailVerification?.afterEmailVerification) await ctx.context.options.emailVerification.afterEmailVerification(updatedUser2, ctx.request);
        await setSessionCookie(ctx, {
          session: activeSession.session,
          user: {
            ...activeSession.user,
            email: parsed.updateTo,
            emailVerified: true
          }
        });
        if (ctx.query.callbackURL) throw ctx.redirect(ctx.query.callbackURL);
        return ctx.json({
          status: true,
          user: parseUserOutput(ctx.context.options, updatedUser2)
        });
      }
      /**
      * Legacy flow
      *
      * - skips two-step verification
      * - updates email immediately
      */
      default: {
        let activeSession = session2;
        if (!activeSession) {
          const newSession = await ctx.context.internalAdapter.createSession(user2.user.id);
          if (!newSession) throw APIError.from("INTERNAL_SERVER_ERROR", BASE_ERROR_CODES.FAILED_TO_CREATE_SESSION);
          activeSession = {
            session: newSession,
            user: user2.user
          };
        }
        const updatedUser2 = await ctx.context.internalAdapter.updateUserByEmail(parsed.email, {
          email: parsed.updateTo,
          emailVerified: false
        });
        const newToken = await createEmailVerificationToken(ctx.context.secret, parsed.updateTo);
        const updateCallbackURL = ctx.query.callbackURL ? encodeURIComponent(ctx.query.callbackURL) : encodeURIComponent("/");
        if (ctx.context.options.emailVerification?.sendVerificationEmail) await ctx.context.runInBackgroundOrAwait(ctx.context.options.emailVerification.sendVerificationEmail({
          user: updatedUser2,
          url: `${ctx.context.baseURL}/verify-email?token=${newToken}&callbackURL=${updateCallbackURL}`,
          token: newToken
        }, safeCloneRequest(ctx.request)));
        await setSessionCookie(ctx, {
          session: activeSession.session,
          user: {
            ...activeSession.user,
            email: parsed.updateTo,
            emailVerified: false
          }
        });
        if (ctx.query.callbackURL) throw ctx.redirect(ctx.query.callbackURL);
        return ctx.json({
          status: true,
          user: parseUserOutput(ctx.context.options, updatedUser2)
        });
      }
    }
  }
  if (user2.user.emailVerified) {
    if (ctx.query.callbackURL) throw ctx.redirect(ctx.query.callbackURL);
    return ctx.json({
      status: true,
      user: null
    });
  }
  if (ctx.context.options.emailVerification?.beforeEmailVerification) await ctx.context.options.emailVerification.beforeEmailVerification(user2.user, ctx.request);
  const updatedUser = await ctx.context.internalAdapter.updateUserByEmail(parsed.email, { emailVerified: true });
  if (ctx.context.options.emailVerification?.afterEmailVerification) await ctx.context.options.emailVerification.afterEmailVerification(updatedUser, ctx.request);
  if (ctx.context.options.emailVerification?.autoSignInAfterVerification) {
    const currentSession = await getSessionFromCtx(ctx);
    if (!currentSession || currentSession.user.email !== parsed.email) {
      const session2 = await ctx.context.internalAdapter.createSession(user2.user.id);
      if (!session2) throw APIError.from("INTERNAL_SERVER_ERROR", BASE_ERROR_CODES.FAILED_TO_CREATE_SESSION);
      await setSessionCookie(ctx, {
        session: session2,
        user: {
          ...user2.user,
          emailVerified: true
        }
      });
    } else await setSessionCookie(ctx, {
      session: currentSession.session,
      user: {
        ...currentSession.user,
        emailVerified: true
      }
    });
  }
  if (ctx.query.callbackURL) throw ctx.redirect(ctx.query.callbackURL);
  return ctx.json({
    status: true,
    user: null
  });
});
async function handleOAuthUserInfo(c, opts) {
  const { userInfo, account: account2, callbackURL, disableSignUp, overrideUserInfo } = opts;
  const source = opts.source ?? {
    method: "oauth",
    oauth: { providerId: account2.providerId }
  };
  const requireExactAccountBinding = !!opts.selectedUser || opts.requireExactAccountBinding === true;
  let pendingAccountCookie = null;
  const accountOwner = await c.context.internalAdapter.findAccountOwnerByKey({
    issuer: account2.issuer,
    accountId: account2.accountId
  }).catch((e) => {
    c.context.logger.error("Better auth was unable to query your database.\nError: ", e);
    redirectOnError(c, c.context.options.onAPIError?.errorURL || `${c.context.baseURL}/error`, "internal_server_error");
  });
  if (accountOwner?.kind === "orphaned") {
    c.context.logger.error("OAuth account references a missing user. Repair the account before retrying authentication.");
    return {
      error: "unable to link account",
      data: null,
      isRegister: false
    };
  }
  const dbUser = await (async () => {
    if (accountOwner?.kind === "owned") {
      if (opts.selectedUser && accountOwner.user.id !== opts.selectedUser.userId) throw new APIError("CONFLICT", {
        code: "account_ownership_conflict",
        message: "Account is already linked to another user"
      });
      if (requireExactAccountBinding && accountOwner.account.providerId !== account2.providerId) throw new APIError("CONFLICT", {
        code: "account_provider_conflict",
        message: "Account is already linked through another provider"
      });
      return {
        user: accountOwner.user,
        linkedAccount: accountOwner.account,
        accounts: [accountOwner.account]
      };
    }
    if (opts.selectedUser) {
      const selectedUser = await c.context.internalAdapter.findUserById(opts.selectedUser.userId);
      if (!selectedUser) throw new APIError("NOT_FOUND", {
        code: "user_not_found",
        message: "User not found"
      });
      return {
        user: selectedUser,
        linkedAccount: null,
        accounts: []
      };
    }
    const emailMatch = await c.context.internalAdapter.findUserByEmail(userInfo.email.toLowerCase(), { includeAccounts: true });
    if (!emailMatch) return null;
    return {
      user: emailMatch.user,
      linkedAccount: null,
      accounts: emailMatch.accounts
    };
  })().catch((e) => {
    if (isAPIError(e)) throw e;
    c.context.logger.error("Better auth was unable to query your database.\nError: ", e);
    redirectOnError(c, c.context.options.onAPIError?.errorURL || `${c.context.baseURL}/error`, "internal_server_error");
  });
  let user2 = dbUser?.user;
  const isRegister = !user2;
  if (dbUser) {
    const linkedAccount = dbUser.linkedAccount ?? dbUser.accounts.find((acc) => acc.issuer === account2.issuer && acc.accountId === account2.accountId);
    if (!linkedAccount) {
      const accountLinking = c.context.options.account?.accountLinking;
      const isTrustedProvider = opts.isTrustedProvider || opts.trustProviderByName !== false && c.context.trustedProviders.includes(account2.providerId);
      const requireLocalEmailVerified = accountLinking?.requireLocalEmailVerified ?? true;
      if (!opts.selectedUser && (!isTrustedProvider && !userInfo.emailVerified || requireLocalEmailVerified && !dbUser.user.emailVerified || accountLinking?.enabled === false || accountLinking?.disableImplicitLinking === true)) {
        if (isDevelopment()) c.context.logger.warn(`User already exist but account isn't linked to ${account2.providerId}. To read more about how account linking works in Better Auth see https://www.better-auth.com/docs/concepts/users-accounts#account-linking.`);
        return {
          error: "account not linked",
          data: null
        };
      }
      try {
        const { id: _accountId, ...providerUserInfo } = userInfo;
        await assertValidUserInfo(c, {
          user: {
            ...providerUserInfo,
            id: dbUser.user.id,
            email: userInfo.email.toLowerCase()
          },
          source: {
            ...source,
            action: "link-account"
          }
        });
        const createdAccount = await c.context.internalAdapter.linkAccount({
          providerId: account2.providerId,
          issuer: account2.issuer,
          accountId: account2.accountId,
          userId: dbUser.user.id,
          accessToken: await setTokenUtil(account2.accessToken, c.context),
          refreshToken: await setTokenUtil(account2.refreshToken, c.context),
          idToken: account2.idToken,
          accessTokenExpiresAt: account2.accessTokenExpiresAt,
          refreshTokenExpiresAt: account2.refreshTokenExpiresAt,
          scope: account2.scope
        });
        if (!createdAccount) return {
          error: "unable to link account",
          data: null
        };
        if (requireExactAccountBinding && (createdAccount.issuer !== account2.issuer || createdAccount.accountId !== account2.accountId || createdAccount.providerId !== account2.providerId || createdAccount.userId !== dbUser.user.id)) throw new APIError("CONFLICT", {
          code: "account_hook_binding_conflict",
          message: "Account hook changed the selected authentication binding"
        });
        if (c.context.options.account?.storeAccountCookie) if (opts.deferNonDatabaseWrites) pendingAccountCookie = createdAccount;
        else await setAccountCookie(c, createdAccount);
      } catch (e) {
        if (isAPIError(e)) throw e;
        c.context.logger.error("Unable to link account", e);
        return {
          error: "unable to link account",
          data: null
        };
      }
      if (!opts.selectedUser && userInfo.emailVerified && !dbUser.user.emailVerified && userInfo.email.toLowerCase() === dbUser.user.email) await c.context.internalAdapter.updateUser(dbUser.user.id, { emailVerified: true });
      if (!opts.selectedUser) user2 = await applyUpdateUserInfoOnLink(c, dbUser.user.id, userInfo) ?? user2;
    } else {
      const { id: _accountId, ...providerUserInfo } = userInfo;
      await assertValidUserInfo(c, {
        user: {
          ...providerUserInfo,
          id: dbUser.user.id,
          email: userInfo.email.toLowerCase()
        },
        source: {
          ...source,
          action: "sign-in"
        }
      });
      const freshTokens = c.context.options.account?.updateAccountOnSignIn !== false ? Object.fromEntries(Object.entries({
        providerId: account2.providerId,
        idToken: account2.idToken,
        accessToken: await setTokenUtil(account2.accessToken, c.context),
        refreshToken: await setTokenUtil(account2.refreshToken, c.context),
        accessTokenExpiresAt: account2.accessTokenExpiresAt,
        refreshTokenExpiresAt: account2.refreshTokenExpiresAt
      }).filter(([_, value]) => value !== void 0)) : {};
      if (c.context.options.account?.storeAccountCookie) {
        const accountCookie = {
          ...linkedAccount,
          ...freshTokens
        };
        if (opts.deferNonDatabaseWrites) pendingAccountCookie = accountCookie;
        else await setAccountCookie(c, accountCookie);
      }
      if (Object.keys(freshTokens).length > 0) {
        const updatedAccount = await c.context.internalAdapter.updateAccount(linkedAccount.id, freshTokens);
        if (!updatedAccount) return {
          error: "unable to update account",
          data: null
        };
        if (requireExactAccountBinding && (updatedAccount.issuer !== account2.issuer || updatedAccount.accountId !== account2.accountId || updatedAccount.providerId !== account2.providerId || updatedAccount.userId !== dbUser.user.id)) throw new APIError("CONFLICT", {
          code: "account_hook_binding_conflict",
          message: "Account hook changed the selected authentication binding"
        });
        if (opts.deferNonDatabaseWrites && pendingAccountCookie) pendingAccountCookie = updatedAccount;
      }
      if (!opts.selectedUser && userInfo.emailVerified && !dbUser.user.emailVerified && userInfo.email.toLowerCase() === dbUser.user.email) await c.context.internalAdapter.updateUser(dbUser.user.id, { emailVerified: true });
    }
    if (opts.selectedUser ? opts.selectedUser.profile === "update" : overrideUserInfo) {
      const { id: _id, email: _email, emailVerified: _emailVerified, name, image, ...providerProfile } = userInfo;
      const additionalUserFields = parseAdditionalUserInputFromProviderProfile(c.context.options, providerProfile, "update");
      const updatedUser = await c.context.internalAdapter.updateUser(dbUser.user.id, {
        name,
        image,
        ...additionalUserFields,
        email: userInfo.email.toLowerCase(),
        emailVerified: userInfo.email.toLowerCase() === dbUser.user.email ? dbUser.user.emailVerified || userInfo.emailVerified : userInfo.emailVerified
      });
      if (updatedUser == null) c.context.logger.warn("Could not update user info during OAuth sign in; preserving existing user for session.");
      if (opts.selectedUser && updatedUser && updatedUser.id !== opts.selectedUser.userId) throw new APIError("CONFLICT", {
        code: "user_hook_selection_conflict",
        message: "User hook changed the selected user"
      });
      user2 = updatedUser ?? user2;
    }
  } else {
    if (disableSignUp) return {
      error: "signup disabled",
      data: null,
      isRegister: false
    };
    try {
      const { id: _id, email: _email, emailVerified: _emailVerified, name, image, ...providerProfile } = userInfo;
      const additionalUserFields = parseAdditionalUserInputFromProviderProfile(c.context.options, providerProfile, "create");
      const accountData = {
        accessToken: await setTokenUtil(account2.accessToken, c.context),
        refreshToken: await setTokenUtil(account2.refreshToken, c.context),
        idToken: account2.idToken,
        accessTokenExpiresAt: account2.accessTokenExpiresAt,
        refreshTokenExpiresAt: account2.refreshTokenExpiresAt,
        scope: account2.scope,
        providerId: account2.providerId,
        issuer: account2.issuer,
        accountId: account2.accountId
      };
      const { createdUser, createdAccount } = await runWithTransaction(c.context.adapter, async () => {
        const createdUser2 = await c.context.internalAdapter.createUser({
          name,
          image,
          ...additionalUserFields,
          email: userInfo.email.toLowerCase(),
          emailVerified: userInfo.emailVerified
        }, source);
        return {
          createdUser: createdUser2,
          createdAccount: await c.context.internalAdapter.createAccount({
            ...accountData,
            userId: createdUser2.id
          })
        };
      });
      if (requireExactAccountBinding && (createdAccount.issuer !== account2.issuer || createdAccount.accountId !== account2.accountId || createdAccount.providerId !== account2.providerId || createdAccount.userId !== createdUser.id)) throw new APIError("CONFLICT", {
        code: "account_hook_binding_conflict",
        message: "Account hook changed the selected authentication binding"
      });
      user2 = createdUser;
      if (c.context.options.account?.storeAccountCookie) if (opts.deferNonDatabaseWrites) pendingAccountCookie = createdAccount;
      else await setAccountCookie(c, createdAccount);
    } catch (e) {
      if (isAPIError(e)) throw e;
      c.context.logger.error("Unable to create OAuth user", e);
      return {
        error: "unable to create user",
        data: null,
        isRegister: false
      };
    }
  }
  if (!user2) return {
    error: "unable to create user",
    data: null,
    isRegister: false
  };
  const requireEmailVerification = c.context.socialProviders.find((p) => p.id === account2.providerId)?.options?.requireEmailVerification;
  if (isRegister && !user2.emailVerified && (c.context.options.emailVerification?.sendOnSignUp ?? requireEmailVerification)) await dispatchVerificationEmail(c, user2, callbackURL, opts.deferNonDatabaseWrites);
  if (requireEmailVerification && !user2.emailVerified) {
    if (!isRegister && c.context.options.emailVerification?.sendOnSignIn) await dispatchVerificationEmail(c, user2, callbackURL, opts.deferNonDatabaseWrites);
    return {
      error: OAUTH_CALLBACK_ERROR_CODES.EMAIL_NOT_VERIFIED,
      data: null,
      isRegister
    };
  }
  const session2 = await c.context.internalAdapter.createSession(user2.id, void 0, void 0, void 0, { deferSecondaryStorageWrites: opts.deferNonDatabaseWrites === true });
  if (!session2) return {
    error: "unable to create session",
    data: null,
    isRegister: false
  };
  if (requireExactAccountBinding && session2.userId !== (opts.selectedUser?.userId ?? user2.id)) throw new APIError("CONFLICT", {
    code: "session_hook_user_conflict",
    message: "Session hook changed the selected user"
  });
  return {
    data: {
      session: session2,
      user: user2
    },
    error: null,
    isRegister,
    accountCookie: pendingAccountCookie
  };
}
async function dispatchVerificationEmail(c, user2, callbackURL, deferUntilAfterTransaction) {
  const sendVerificationEmail2 = c.context.options.emailVerification?.sendVerificationEmail;
  if (!sendVerificationEmail2) return;
  const send = async () => {
    try {
      const token = await createEmailVerificationToken(c.context.secret, user2.email, void 0, c.context.options.emailVerification?.expiresIn);
      const url = `${c.context.baseURL}/verify-email?token=${token}&callbackURL=${encodeURIComponent(callbackURL || "/")}`;
      await c.context.runInBackgroundOrAwait(sendVerificationEmail2({
        user: user2,
        url,
        token
      }, c.request));
    } catch (e) {
      c.context.logger.error("Failed to send OAuth verification email", e);
    }
  };
  if (deferUntilAfterTransaction) await queueAfterTransactionHook(send);
  else await send();
}
async function applyUpdateUserInfoOnLink(c, userId, userInfo) {
  if (c.context.options.account?.accountLinking?.updateUserInfoOnLink !== true) return;
  try {
    const { email: _email, emailVerified: _emailVerified, name, image, ...providerProfile } = userInfo;
    const additionalUserFields = parseAdditionalUserInputFromProviderProfile(c.context.options, providerProfile, "update");
    return await c.context.internalAdapter.updateUser(userId, {
      name,
      image,
      ...additionalUserFields
    });
  } catch (e) {
    c.context.logger.warn("Could not update user info on account link", e);
    return;
  }
}
function parseStoredScopes(scope) {
  if (!scope) return [];
  return scope.split(",").map((s) => s.trim()).filter(Boolean);
}
const listUserAccounts = createAuthEndpoint("/list-accounts", {
  method: "GET",
  use: [sessionMiddleware],
  metadata: { openapi: {
    operationId: "listUserAccounts",
    description: "List all accounts linked to the user",
    responses: { "200": {
      description: "Success",
      content: { "application/json": { schema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            providerId: { type: "string" },
            createdAt: {
              type: "string",
              format: "date-time"
            },
            updatedAt: {
              type: "string",
              format: "date-time"
            },
            issuer: { type: "string" },
            accountId: { type: "string" },
            userId: { type: "string" },
            scopes: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: [
            "id",
            "providerId",
            "createdAt",
            "updatedAt",
            "issuer",
            "accountId",
            "userId",
            "scopes"
          ]
        }
      } } }
    } }
  } }
}, async (c) => {
  const session2 = c.context.session;
  const accounts = await c.context.internalAdapter.findAccounts(session2.user.id);
  return c.json(accounts.map((a) => {
    const { scope, ...parsed } = parseAccountOutput(c.context.options, a);
    return {
      ...parsed,
      scopes: parseStoredScopes(scope)
    };
  }));
});
const linkSocialAccount = createAuthEndpoint("/link-social", {
  method: "POST",
  requireHeaders: true,
  body: z.object({
    /**
    * Callback URL to redirect to after the user has signed in.
    */
    callbackURL: z.string().meta({ description: "The URL to redirect to after the user has signed in" }).optional(),
    /**
    * OAuth2 provider to use
    */
    provider: SocialProviderListEnum,
    /**
    * ID Token for direct authentication without redirect
    */
    idToken: z.object({
      token: z.string(),
      nonce: z.string().optional(),
      accessToken: z.string().optional(),
      refreshToken: z.string().optional()
    }).optional(),
    /**
    * Whether to allow sign up for new users
    */
    requestSignUp: z.boolean().optional(),
    /**
    * Additional scopes to request when linking the account.
    * This is useful for requesting additional permissions when
    * linking a social account compared to the initial authentication.
    */
    scopes: z.array(z.string()).meta({ description: "Additional scopes to request from the provider" }).optional(),
    /**
    * The URL to redirect to if there is an error during the link process.
    */
    errorCallbackURL: z.string().meta({ description: "The URL to redirect to if there is an error during the link process" }).optional(),
    /**
    * Disable automatic redirection to the provider
    *
    * This is useful if you want to handle the redirection
    * yourself like in a popup or a different tab.
    */
    disableRedirect: z.boolean().meta({ description: "Disable automatic redirection to the provider. Useful for handling the redirection yourself" }).optional(),
    /**
    * The login hint to forward to the provider authorization endpoint.
    */
    loginHint: z.string().meta({ description: "The login hint to use for the authorization code request" }).optional(),
    /**
    * Extra query parameters to append to the provider authorization URL.
    * Reserved OAuth keys (state, client_id, redirect_uri, response_type,
    * code_challenge, code_challenge_method, nonce, scope) are rejected.
    */
    additionalParams: additionalAuthorizationParamsSchema,
    /**
    * Any additional data to pass through the oauth flow.
    */
    additionalData: z.record(z.string(), z.any()).optional()
  }),
  use: [sessionMiddleware],
  metadata: { openapi: {
    description: "Link a social account to the user",
    operationId: "linkSocialAccount",
    responses: { "200": {
      description: "Success",
      content: { "application/json": { schema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The authorization URL to redirect the user to"
          },
          redirect: {
            type: "boolean",
            description: "Indicates if the user should be redirected to the authorization URL"
          },
          status: { type: "boolean" }
        },
        required: ["redirect"]
      } } }
    } }
  } }
}, async (c) => {
  const session2 = c.context.session;
  const provider = await getAwaitableValue(c.context.socialProviders, { value: c.body.provider });
  if (!provider) {
    c.context.logger.error("Provider not found. Make sure to add the provider in your auth config", { provider: c.body.provider });
    throw APIError.from("NOT_FOUND", BASE_ERROR_CODES.PROVIDER_NOT_FOUND);
  }
  if (c.body.idToken) {
    if (!supportsIdTokenSignIn(provider)) {
      c.context.logger.error("Provider does not support id token verification", { provider: c.body.provider });
      throw APIError.from("NOT_FOUND", BASE_ERROR_CODES.ID_TOKEN_NOT_SUPPORTED);
    }
    const { token, nonce } = c.body.idToken;
    if (!await verifyProviderIdToken(provider, token, nonce, c)) {
      c.context.logger.warn("Invalid id token", { provider: c.body.provider });
      throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.INVALID_TOKEN);
    }
    const linkingUserInfo = await provider.getUserInfo({
      idToken: token,
      accessToken: c.body.idToken.accessToken,
      refreshToken: c.body.idToken.refreshToken
    });
    if (!linkingUserInfo || !linkingUserInfo?.user) {
      c.context.logger.error("Failed to get user info", { provider: c.body.provider });
      throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.FAILED_TO_GET_USER_INFO);
    }
    if (!linkingUserInfo.user.email) {
      c.context.logger.error(missingEmailLogMessage(c.body.provider, { source: "id_token" }), { provider: c.body.provider });
      throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.USER_EMAIL_NOT_FOUND);
    }
    const accountKey = await resolveOAuthAccountKeyForAPI(provider, {
      idToken: token,
      accessToken: c.body.idToken.accessToken,
      refreshToken: c.body.idToken.refreshToken
    }, linkingUserInfo.data);
    const linkedAccount = await c.context.internalAdapter.findAccountByKey(accountKey);
    if (linkedAccount?.userId === session2.user.id) {
      const updateData = Object.fromEntries(Object.entries({
        providerId: provider.id,
        accessToken: await setTokenUtil(c.body.idToken.accessToken, c.context),
        idToken: token,
        refreshToken: await setTokenUtil(c.body.idToken.refreshToken, c.context)
      }).filter(([_, value]) => value !== void 0));
      await c.context.internalAdapter.updateAccount(linkedAccount.id, updateData);
      await applyUpdateUserInfoOnLink(c, session2.user.id, linkingUserInfo.user);
      return c.json({
        url: "",
        status: true,
        redirect: false
      });
    }
    if (linkedAccount) throw APIError.from("CONFLICT", BASE_ERROR_CODES.SOCIAL_ACCOUNT_ALREADY_LINKED);
    if (!c.context.trustedProviders.includes(provider.id) && !linkingUserInfo.user.emailVerified || c.context.options.account?.accountLinking?.enabled === false) throw APIError.from("UNAUTHORIZED", {
      message: "Account not linked - linking not allowed",
      code: "LINKING_NOT_ALLOWED"
    });
    if (linkingUserInfo.user.email?.toLowerCase() !== session2.user.email.toLowerCase() && c.context.options.account?.accountLinking?.allowDifferentEmails !== true) throw APIError.from("UNAUTHORIZED", {
      message: "Account not linked - different emails not allowed",
      code: "LINKING_DIFFERENT_EMAILS_NOT_ALLOWED"
    });
    try {
      await c.context.internalAdapter.createAccount({
        userId: session2.user.id,
        providerId: provider.id,
        ...accountKey,
        accessToken: await setTokenUtil(c.body.idToken.accessToken, c.context),
        idToken: token,
        refreshToken: await setTokenUtil(c.body.idToken.refreshToken, c.context)
      });
    } catch {
      throw APIError.from("EXPECTATION_FAILED", {
        message: "Account not linked - unable to create account",
        code: "LINKING_FAILED"
      });
    }
    await applyUpdateUserInfoOnLink(c, session2.user.id, linkingUserInfo.user);
    return c.json({
      url: "",
      status: true,
      redirect: false
    });
  }
  const idTokenNonce = generateIdTokenNonce(provider);
  const state = await generateState(c, {
    link: {
      userId: session2.user.id,
      email: session2.user.email
    },
    additionalData: c.body.additionalData,
    idTokenNonce
  });
  const url = await provider.createAuthorizationURL({
    state: state.state,
    codeVerifier: state.codeVerifier,
    idTokenNonce,
    redirectURI: `${c.context.baseURL}${getOAuthCallbackPath(provider)}`,
    scopes: c.body.scopes,
    loginHint: c.body.loginHint,
    additionalParams: c.body.additionalParams
  });
  if (!c.body.disableRedirect) c.setHeader("Location", url.toString());
  return c.json({
    url: url.toString(),
    redirect: !c.body.disableRedirect
  });
});
const unlinkAccount = createAuthEndpoint("/unlink-account", {
  method: "POST",
  body: z.object({ accountId: z.string().meta({ description: "The Better Auth account ID to unlink" }) }),
  use: [freshSessionMiddleware],
  metadata: { openapi: {
    description: "Unlink an account",
    responses: { "200": {
      description: "Success",
      content: { "application/json": { schema: {
        type: "object",
        properties: { status: { type: "boolean" } }
      } } }
    } }
  } }
}, async (ctx) => {
  const { accountId } = ctx.body;
  const accounts = await ctx.context.internalAdapter.findAccounts(ctx.context.session.user.id);
  if (accounts.length === 1 && !ctx.context.options.account?.accountLinking?.allowUnlinkingAll) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.FAILED_TO_UNLINK_LAST_ACCOUNT);
  const accountExist = accounts.find((account2) => account2.id === accountId);
  if (!accountExist) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.ACCOUNT_NOT_FOUND);
  await ctx.context.internalAdapter.deleteAccount(accountExist.id);
  return ctx.json({ status: true });
});
async function resolveUserId(ctx, userId) {
  const session2 = await getSessionFromCtx(ctx, { disableCookieCache: isStateful(ctx) });
  if (!session2 && (ctx.request || ctx.headers)) throw ctx.error("UNAUTHORIZED");
  const resolvedUserId = session2?.user?.id || userId;
  if (!resolvedUserId) throw APIError.from("BAD_REQUEST", {
    message: "Either userId or session is required",
    code: "USER_ID_OR_SESSION_REQUIRED"
  });
  return resolvedUserId;
}
const accountSelectionSchema = z.union([z.strictObject({
  accountId: z.string().meta({ description: "The Better Auth account ID" }),
  userId: z.string().meta({ description: "The user ID associated with the account" }).optional()
}), z.strictObject({
  useAccountCookie: z.literal(true).meta({ description: "Select the current OAuth account from its signed cookie" }),
  userId: z.string().meta({ description: "The user ID associated with the account" }).optional()
})]);
function matchesAccountSelection(ctx, account2, { resolvedUserId, selection }) {
  return (!shouldBindAccountCookieToSessionUser(ctx.context.options) || account2.userId === resolvedUserId) && ("accountId" in selection ? account2.id === selection.accountId : true);
}
async function resolveUserAccount(ctx, { resolvedUserId, selection }) {
  if ("accountId" in selection) {
    const account2 = (await ctx.context.internalAdapter.findAccounts(resolvedUserId)).find((candidate) => candidate.id === selection.accountId);
    if (account2) return {
      account: account2,
      accountCookie: null
    };
  } else if (ctx.context.options.account?.storeAccountCookie) {
    const accountCookie = await getAccountCookie(ctx);
    if (accountCookie && matchesAccountSelection(ctx, accountCookie, {
      resolvedUserId,
      selection
    })) return {
      account: accountCookie,
      accountCookie
    };
  }
  throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.ACCOUNT_NOT_FOUND);
}
async function getValidAccessToken(ctx, { resolvedUserId, selection, account: resolvedAccount }) {
  const account2 = resolvedAccount ?? (await resolveUserAccount(ctx, {
    resolvedUserId,
    selection
  })).account;
  if (!matchesAccountSelection(ctx, account2, {
    resolvedUserId,
    selection
  })) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.ACCOUNT_NOT_FOUND);
  const provider = await getAwaitableValue(ctx.context.socialProviders, { value: account2.providerId });
  if (!provider) throw APIError.from("BAD_REQUEST", {
    message: `Provider ${account2.providerId} is not supported.`,
    code: "PROVIDER_NOT_SUPPORTED"
  });
  try {
    let newTokens = null;
    const accessTokenExpired = account2.accessTokenExpiresAt && new Date(account2.accessTokenExpiresAt).getTime() - Date.now() < 5e3;
    if (account2.refreshToken && accessTokenExpired && provider.refreshAccessToken) {
      const refreshToken2 = await decryptOAuthToken(account2.refreshToken, ctx.context);
      newTokens = await provider.refreshAccessToken(refreshToken2, ctx);
      const updatedData = {
        accessToken: await setTokenUtil(newTokens?.accessToken, ctx.context),
        accessTokenExpiresAt: newTokens?.accessTokenExpiresAt,
        refreshToken: newTokens?.refreshToken ? await setTokenUtil(newTokens.refreshToken, ctx.context) : account2.refreshToken,
        refreshTokenExpiresAt: newTokens?.refreshTokenExpiresAt ?? account2.refreshTokenExpiresAt,
        idToken: newTokens?.idToken || account2.idToken
      };
      let updatedAccount = null;
      if (account2.id) updatedAccount = await ctx.context.internalAdapter.updateAccount(account2.id, updatedData);
      if (ctx.context.options.account?.storeAccountCookie) await setAccountCookie(ctx, {
        ...account2,
        ...updatedAccount ?? updatedData
      });
    }
    const accessTokenExpiresAt = (() => {
      if (newTokens?.accessTokenExpiresAt) {
        if (typeof newTokens.accessTokenExpiresAt === "string") return new Date(newTokens.accessTokenExpiresAt);
        return newTokens.accessTokenExpiresAt;
      }
      if (account2.accessTokenExpiresAt) {
        if (typeof account2.accessTokenExpiresAt === "string") return new Date(account2.accessTokenExpiresAt);
        return account2.accessTokenExpiresAt;
      }
    })();
    return {
      accessToken: newTokens?.accessToken ?? await decryptOAuthToken(account2.accessToken ?? "", ctx.context),
      accessTokenExpiresAt,
      scopes: parseStoredScopes(account2.scope),
      idToken: newTokens?.idToken ?? account2.idToken ?? void 0
    };
  } catch (_error) {
    throw APIError.from("BAD_REQUEST", {
      message: "Failed to get a valid access token",
      code: "FAILED_TO_GET_ACCESS_TOKEN"
    });
  }
}
const getAccessToken = createAuthEndpoint("/get-access-token", {
  method: "POST",
  body: accountSelectionSchema,
  metadata: { openapi: {
    description: "Get a valid access token, doing a refresh if needed",
    responses: {
      200: {
        description: "A Valid access token",
        content: { "application/json": { schema: {
          type: "object",
          properties: {
            tokenType: { type: "string" },
            idToken: { type: "string" },
            accessToken: { type: "string" },
            accessTokenExpiresAt: {
              type: "string",
              format: "date-time"
            }
          }
        } } }
      },
      400: { description: "Invalid refresh token or provider configuration" }
    }
  } }
}, async (ctx) => {
  const { userId } = ctx.body;
  const tokens = await getValidAccessToken(ctx, {
    resolvedUserId: await resolveUserId(ctx, userId),
    selection: ctx.body
  });
  return ctx.json(tokens);
});
const refreshToken = createAuthEndpoint("/refresh-token", {
  method: "POST",
  body: accountSelectionSchema,
  metadata: { openapi: {
    description: "Refresh the access token using a refresh token",
    responses: {
      200: {
        description: "Access token refreshed successfully",
        content: { "application/json": { schema: {
          type: "object",
          properties: {
            tokenType: { type: "string" },
            idToken: { type: "string" },
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
            accessTokenExpiresAt: {
              type: "string",
              format: "date-time"
            },
            refreshTokenExpiresAt: {
              type: "string",
              format: "date-time"
            }
          }
        } } }
      },
      400: { description: "Invalid refresh token or provider configuration" }
    }
  } }
}, async (ctx) => {
  const { userId } = ctx.body;
  const { account: account2, accountCookie } = await resolveUserAccount(ctx, {
    resolvedUserId: await resolveUserId(ctx, userId),
    selection: ctx.body
  });
  const provider = await getAwaitableValue(ctx.context.socialProviders, { value: account2.providerId });
  if (!provider) throw APIError.from("BAD_REQUEST", {
    message: `Provider ${account2.providerId} is not supported.`,
    code: "PROVIDER_NOT_SUPPORTED"
  });
  if (!provider.refreshAccessToken) throw APIError.from("BAD_REQUEST", {
    message: `Provider ${account2.providerId} does not support token refreshing.`,
    code: "TOKEN_REFRESH_NOT_SUPPORTED"
  });
  const refreshToken2 = account2.refreshToken ?? void 0;
  if (!refreshToken2) throw APIError.from("BAD_REQUEST", {
    message: "Refresh token not found",
    code: "REFRESH_TOKEN_NOT_FOUND"
  });
  try {
    const decryptedRefreshToken = await decryptOAuthToken(refreshToken2, ctx.context);
    const tokens = await provider.refreshAccessToken(decryptedRefreshToken, ctx);
    const resolvedRefreshToken = tokens.refreshToken ? await setTokenUtil(tokens.refreshToken, ctx.context) : refreshToken2;
    const resolvedRefreshTokenExpiresAt = tokens.refreshTokenExpiresAt ?? account2.refreshTokenExpiresAt;
    const updatedTokenData = {
      accessToken: await setTokenUtil(tokens.accessToken, ctx.context),
      refreshToken: resolvedRefreshToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshTokenExpiresAt: resolvedRefreshTokenExpiresAt,
      idToken: tokens.idToken || account2.idToken
    };
    let updatedAccount = null;
    if (account2.id)
      updatedAccount = await ctx.context.internalAdapter.updateAccount(account2.id, updatedTokenData);
    if (accountCookie?.id === account2.id && ctx.context.options.account?.storeAccountCookie) await setAccountCookie(ctx, {
      ...accountCookie,
      ...updatedAccount ?? updatedTokenData
    });
    const responseScope = updatedAccount?.scope ?? account2.scope;
    return ctx.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? decryptedRefreshToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshTokenExpiresAt: resolvedRefreshTokenExpiresAt,
      scope: responseScope,
      idToken: tokens.idToken || account2.idToken,
      providerId: account2.providerId,
      accountId: account2.id
    });
  } catch (_error) {
    throw APIError.from("BAD_REQUEST", {
      message: "Failed to refresh access token",
      code: "FAILED_TO_REFRESH_ACCESS_TOKEN"
    });
  }
});
const accountInfo = createAuthEndpoint("/account-info", {
  method: "GET",
  metadata: { openapi: {
    description: "Get the account info provided by the provider",
    responses: { "200": {
      description: "Success",
      content: { "application/json": { schema: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: {
                type: "string",
                nullable: true
              },
              image: { type: "string" },
              emailVerified: { type: "boolean" }
            },
            required: ["emailVerified"]
          },
          account: {
            type: "object",
            properties: {
              id: { type: "string" },
              providerId: { type: "string" },
              issuer: { type: "string" },
              accountId: { type: "string" }
            },
            required: [
              "id",
              "providerId",
              "issuer",
              "accountId"
            ],
            additionalProperties: false
          },
          data: {
            type: "object",
            properties: {},
            additionalProperties: true
          }
        },
        required: [
          "user",
          "data",
          "account"
        ],
        additionalProperties: false
      } } }
    } }
  } },
  query: accountSelectionSchema
}, async (ctx) => {
  const { userId } = ctx.query;
  const resolvedUserId = await resolveUserId(ctx, userId);
  const { account: account2 } = await resolveUserAccount(ctx, {
    resolvedUserId,
    selection: ctx.query
  });
  const provider = await getAwaitableValue(ctx.context.socialProviders, { value: account2.providerId });
  if (!provider) throw APIError.from("BAD_REQUEST", {
    message: "Account is not associated with a configured social provider.",
    code: "PROVIDER_NOT_CONFIGURED"
  });
  const tokens = await getValidAccessToken(ctx, {
    resolvedUserId,
    selection: ctx.query,
    account: account2
  });
  if (!tokens.accessToken) throw APIError.from("BAD_REQUEST", {
    message: "Access token not found",
    code: "ACCESS_TOKEN_NOT_FOUND"
  });
  const info2 = await provider.getUserInfo({
    ...tokens,
    accessToken: tokens.accessToken
  });
  if (!info2) throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.FAILED_TO_GET_USER_INFO);
  return ctx.json({
    ...info2,
    account: {
      id: account2.id,
      providerId: account2.providerId,
      issuer: account2.issuer,
      accountId: account2.accountId
    }
  });
});
const schema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
  device_id: z.string().optional(),
  error_description: z.string().optional(),
  state: z.string().optional(),
  user: z.string().optional(),
  iss: z.string().optional()
});
const callbackOAuth = createAuthEndpoint("/callback/:id", {
  method: ["GET", "POST"],
  operationId: "handleOAuthCallback",
  body: schema.optional(),
  query: schema.optional(),
  metadata: {
    ...HIDE_METADATA,
    allowedMediaTypes: ["application/x-www-form-urlencoded", "application/json"]
  }
}, async (c) => {
  let queryOrBody;
  const defaultErrorURL = c.context.options.onAPIError?.errorURL || `${c.context.baseURL}/error`;
  if (c.method === "POST") {
    const postData = c.body ? schema.parse(c.body) : {};
    const queryData = c.query ? schema.parse(c.query) : {};
    const mergedData = schema.parse({
      ...postData,
      ...queryData
    });
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(mergedData)) if (value !== void 0 && value !== null) params.set(key, String(value));
    const redirectURL = `${c.context.baseURL}/callback/${c.params.id}?${params.toString()}`;
    throw c.redirect(redirectURL);
  }
  try {
    if (c.method === "GET") queryOrBody = schema.parse(c.query);
    else if (c.method === "POST") queryOrBody = schema.parse(c.body);
    else throw new Error("Unsupported method");
  } catch (e) {
    c.context.logger.error("INVALID_CALLBACK_REQUEST", e);
    const redirectURL = appendQueryParams(defaultErrorURL, new URLSearchParams({ error: "invalid_callback_request" }));
    throw c.redirect(redirectURL);
  }
  const { code, error: error2, state, error_description, device_id, user: userData, iss } = queryOrBody;
  if (state === void 0 && code) {
    const provider2 = await getAwaitableValue(c.context.socialProviders, { value: c.params.id });
    if (provider2?.allowIdpInitiated) {
      const idTokenNonce2 = generateIdTokenNonce(provider2);
      const { state: freshState, codeVerifier: codeVerifier2 } = await generateState(c, { idTokenNonce: idTokenNonce2 });
      const authUrl = await provider2.createAuthorizationURL({
        state: freshState,
        codeVerifier: codeVerifier2,
        idTokenNonce: idTokenNonce2,
        redirectURI: `${c.context.baseURL}${getOAuthCallbackPath(provider2)}`
      });
      throw c.redirect(authUrl.toString());
    }
  }
  if (!state) {
    c.context.logger.error("State not found", error2);
    const redirectURL = appendQueryParams(defaultErrorURL, new URLSearchParams({ error: "state_not_found" }));
    throw c.redirect(redirectURL);
  }
  const { codeVerifier, callbackURL, link, errorURL, newUserURL, requestSignUp, idTokenNonce } = await parseState(c);
  function redirectOnError2(error3, description) {
    const baseURL = errorURL ?? defaultErrorURL;
    const params = new URLSearchParams({ error: error3 });
    if (description) params.set("error_description", description);
    const redirectURL = appendQueryParams(baseURL, params);
    throw c.redirect(redirectURL);
  }
  if (error2) redirectOnError2(error2, error_description);
  if (!code) {
    c.context.logger.warn("Code not found");
    throw redirectOnError2(OAUTH_CALLBACK_ERROR_CODES.NO_CODE);
  }
  const provider = await getAwaitableValue(c.context.socialProviders, { value: c.params.id });
  if (!provider) {
    c.context.logger.warn("OAuth provider not found", { providerId: c.params.id });
    throw redirectOnError2(OAUTH_CALLBACK_ERROR_CODES.PROVIDER_NOT_FOUND);
  }
  if (iss && provider.issuer && iss !== provider.issuer) {
    c.context.logger.error("OAuth issuer mismatch", {
      expected: provider.issuer,
      received: iss
    });
    throw redirectOnError2(OAUTH_CALLBACK_ERROR_CODES.ISSUER_MISMATCH);
  }
  if (provider.requiresIdTokenNonce && !idTokenNonce) {
    c.context.logger.error("OAuth id_token nonce binding required but no expected nonce was found in state", { providerId: provider.id });
    throw redirectOnError2(OAUTH_CALLBACK_ERROR_CODES.NONCE_BINDING_MISSING);
  }
  let tokens;
  try {
    tokens = await provider.validateAuthorizationCode({
      code,
      codeVerifier,
      deviceId: device_id,
      redirectURI: `${c.context.baseURL}${getOAuthCallbackPath(provider)}`
    });
  } catch (e) {
    c.context.logger.error("", e);
    throw redirectOnError2(OAUTH_CALLBACK_ERROR_CODES.INVALID_CODE);
  }
  if (!tokens) throw redirectOnError2(OAUTH_CALLBACK_ERROR_CODES.INVALID_CODE);
  const parsedUserData = userData ? safeJSONParse(userData) : null;
  const providerResult = await provider.getUserInfo({
    ...tokens,
    ...idTokenNonce ? { expectedIdTokenNonce: idTokenNonce } : {},
    /**
    * The user object from the provider
    * This is only available for some providers like Apple
    */
    user: parsedUserData ?? void 0
  });
  if (!providerResult?.user) {
    c.context.logger.error("Unable to get user info");
    return redirectOnError2(OAUTH_CALLBACK_ERROR_CODES.UNABLE_TO_GET_USER_INFO);
  }
  const userInfo = providerResult.user;
  const providerProfile = toOAuthProfileRecord(providerResult.data);
  let accountKey;
  try {
    accountKey = await resolveOAuthAccountKey(provider, tokens, providerResult.data);
  } catch (error3) {
    c.context.logger.error("Unable to derive provider account identity", {
      providerId: provider.id,
      error: error3
    });
    return redirectOnError2(OAUTH_CALLBACK_ERROR_CODES.UNABLE_TO_GET_USER_INFO);
  }
  const { accountId } = accountKey;
  if (!callbackURL) {
    c.context.logger.error("No callback URL found");
    throw redirectOnError2(OAUTH_CALLBACK_ERROR_CODES.NO_CALLBACK_URL);
  }
  if (link) {
    try {
      await assertValidUserInfo(c, {
        user: {
          ...userInfo,
          id: link.userId,
          email: userInfo.email ?? void 0
        },
        source: {
          action: "link-account",
          method: "oauth",
          oauth: {
            providerId: provider.id,
            profile: providerProfile
          }
        }
      });
    } catch (e) {
      if (isAPIError(e) && e.body?.code) throw redirectOnError2(e.body.code, e.body.message);
      throw e;
    }
    if (!c.context.trustedProviders.includes(provider.id) && !userInfo.emailVerified || c.context.options.account?.accountLinking?.enabled === false) {
      c.context.logger.error("Unable to link account - untrusted provider");
      return redirectOnError2(OAUTH_CALLBACK_ERROR_CODES.UNABLE_TO_LINK_ACCOUNT);
    }
    if (userInfo.email?.toLowerCase() !== link.email.toLowerCase() && c.context.options.account?.accountLinking?.allowDifferentEmails !== true) return redirectOnError2(OAUTH_CALLBACK_ERROR_CODES.EMAIL_DOES_NOT_MATCH);
    const existingAccount = await c.context.internalAdapter.findAccountByKey(accountKey);
    if (existingAccount) {
      if (existingAccount.userId.toString() !== link.userId.toString()) return redirectOnError2(OAUTH_CALLBACK_ERROR_CODES.ACCOUNT_ALREADY_LINKED_TO_DIFFERENT_USER);
      const mergedScope = mergeScopes(existingAccount.scope, tokens.scopes);
      const updateData = Object.fromEntries(Object.entries({
        providerId: provider.id,
        accessToken: await setTokenUtil(tokens.accessToken, c.context),
        refreshToken: await setTokenUtil(tokens.refreshToken, c.context),
        idToken: tokens.idToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        scope: mergedScope || void 0
      }).filter(([_, value]) => value !== void 0));
      await c.context.internalAdapter.updateAccount(existingAccount.id, updateData);
    } else if (!await c.context.internalAdapter.createAccount({
      userId: link.userId,
      providerId: provider.id,
      ...accountKey,
      ...tokens,
      accessToken: await setTokenUtil(tokens.accessToken, c.context),
      refreshToken: await setTokenUtil(tokens.refreshToken, c.context),
      scope: tokens.scopes?.join(",")
    })) return redirectOnError2(OAUTH_CALLBACK_ERROR_CODES.UNABLE_TO_LINK_ACCOUNT);
    await applyUpdateUserInfoOnLink(c, link.userId, userInfo);
    let toRedirectTo2;
    try {
      toRedirectTo2 = callbackURL.toString();
    } catch {
      toRedirectTo2 = callbackURL;
    }
    throw c.redirect(toRedirectTo2);
  }
  if (!userInfo.email) {
    c.context.logger.error(missingEmailLogMessage(provider.id));
    return redirectOnError2(OAUTH_CALLBACK_ERROR_CODES.EMAIL_NOT_FOUND);
  }
  const accountData = {
    providerId: provider.id,
    ...accountKey,
    ...tokens,
    scope: tokens.scopes?.join(",")
  };
  let result;
  try {
    result = await handleOAuthUserInfo(c, {
      userInfo: {
        ...userInfo,
        id: accountId,
        email: userInfo.email,
        name: userInfo.name || ""
      },
      account: accountData,
      callbackURL,
      disableSignUp: provider.disableImplicitSignUp && !requestSignUp || provider.options?.disableSignUp,
      overrideUserInfo: provider.options?.overrideUserInfoOnSignIn,
      source: {
        method: "oauth",
        oauth: {
          providerId: provider.id,
          profile: providerProfile
        }
      }
    });
  } catch (e) {
    if (isAPIError(e) && e.body?.code) redirectOnError2(e.body.code, e.body.message);
    throw e;
  }
  if (result.error) {
    c.context.logger.error(result.error.split(" ").join("_"));
    return redirectOnError2(result.error.split(" ").join("_"));
  }
  const { session: session2, user: user2 } = result.data;
  await setSessionCookie(c, {
    session: session2,
    user: user2
  });
  let toRedirectTo;
  try {
    toRedirectTo = (result.isRegister ? newUserURL || callbackURL : callbackURL).toString();
  } catch {
    toRedirectTo = result.isRegister ? newUserURL || callbackURL : callbackURL;
  }
  throw c.redirect(toRedirectTo);
});
function sanitize(input) {
  return input.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/&(?!amp;|lt;|gt;|quot;|#39;|#x[0-9a-fA-F]+;|#[0-9]+;)/g, "&amp;");
}
const html = (options, code = "Unknown", description = null) => {
  const custom = options.onAPIError?.customizeDefaultErrorPage;
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Error</title>
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        font-family: ${custom?.font?.defaultFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"};
        background: ${custom?.colors?.background || "var(--background)"};
        color: var(--foreground);
        margin: 0;
      }
      :root,
      :host {
        --spacing: 0.25rem;
        --container-md: 28rem;
        --text-sm: ${custom?.size?.textSm || "0.875rem"};
        --text-sm--line-height: calc(1.25 / 0.875);
        --text-2xl: ${custom?.size?.text2xl || "1.5rem"};
        --text-2xl--line-height: calc(2 / 1.5);
        --text-4xl: ${custom?.size?.text4xl || "2.25rem"};
        --text-4xl--line-height: calc(2.5 / 2.25);
        --text-6xl: ${custom?.size?.text6xl || "3rem"};
        --text-6xl--line-height: 1;
        --font-weight-medium: 500;
        --font-weight-semibold: 600;
        --font-weight-bold: 700;
        --default-transition-duration: 150ms;
        --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        --radius: ${custom?.size?.radiusSm || "0.625rem"};
        --default-mono-font-family: ${custom?.font?.monoFamily || "var(--font-geist-mono)"};
        --primary: ${custom?.colors?.primary || "black"};
        --primary-foreground: ${custom?.colors?.primaryForeground || "white"};
        --background: ${custom?.colors?.background || "white"};
        --foreground: ${custom?.colors?.foreground || "oklch(0.271 0 0)"};
        --border: ${custom?.colors?.border || "oklch(0.89 0 0)"};
        --destructive: ${custom?.colors?.destructive || "oklch(0.55 0.15 25.723)"};
        --muted-foreground: ${custom?.colors?.mutedForeground || "oklch(0.545 0 0)"};
        --corner-border: ${custom?.colors?.cornerBorder || "#404040"};
      }

      button, .btn {
        cursor: pointer;
        background: none;
        border: none;
        color: inherit;
        font: inherit;
        transition: all var(--default-transition-duration)
          var(--default-transition-timing-function);
      }
      button:hover, .btn:hover {
        opacity: 0.8;
      }

      @media (prefers-color-scheme: dark) {
        :root,
        :host {
          --primary: ${custom?.colors?.primary || "white"};
          --primary-foreground: ${custom?.colors?.primaryForeground || "black"};
          --background: ${custom?.colors?.background || "oklch(0.15 0 0)"};
          --foreground: ${custom?.colors?.foreground || "oklch(0.98 0 0)"};
          --border: ${custom?.colors?.border || "oklch(0.27 0 0)"};
          --destructive: ${custom?.colors?.destructive || "oklch(0.65 0.15 25.723)"};
          --muted-foreground: ${custom?.colors?.mutedForeground || "oklch(0.65 0 0)"};
          --corner-border: ${custom?.colors?.cornerBorder || "#a0a0a0"};
        }
      }
      @media (max-width: 640px) {
        :root, :host {
          --text-6xl: 2.5rem;
          --text-2xl: 1.25rem;
          --text-sm: 0.8125rem;
        }
      }
      @media (max-width: 480px) {
        :root, :host {
          --text-6xl: 2rem;
          --text-2xl: 1.125rem;
        }
      }
    </style>
  </head>
  <body style="width: 100vw; min-height: 100vh; overflow-x: hidden; overflow-y: auto;">
    <div
        style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1.5rem;
            position: relative;
            width: 100%;
            min-height: 100vh;
            padding: 1rem;
        "
        >
${custom?.disableBackgroundGrid ? "" : `
      <div
        style="
          position: absolute;
          inset: 0;
          background-image: linear-gradient(to right, ${custom?.colors?.gridColor || "var(--border)"} 1px, transparent 1px),
            linear-gradient(to bottom, ${custom?.colors?.gridColor || "var(--border)"} 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.6;
          pointer-events: none;
          width: 100vw;
          height: 100vh;
        "
      ></div>
      <div
        style="
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${custom?.colors?.background || "var(--background)"};
          mask-image: radial-gradient(ellipse at center, transparent 20%, black);
          -webkit-mask-image: radial-gradient(ellipse at center, transparent 20%, black);
          pointer-events: none;
        "
      ></div>
`}

<div
  style="
    position: relative;
    z-index: 10;
    border: 2px solid var(--border);
    background: ${custom?.colors?.cardBackground || "var(--background)"};
    padding: 1.5rem;
    max-width: 42rem;
    width: 100%;
  "
>
    ${custom?.disableCornerDecorations ? "" : `
        <!-- Corner decorations -->
        <div
          style="
            position: absolute;
            top: -2px;
            left: -2px;
            width: 2rem;
            height: 2rem;
            border-top: 4px solid var(--corner-border);
            border-left: 4px solid var(--corner-border);
          "
        ></div>
        <div
          style="
            position: absolute;
            top: -2px;
            right: -2px;
            width: 2rem;
            height: 2rem;
            border-top: 4px solid var(--corner-border);
            border-right: 4px solid var(--corner-border);
          "
        ></div>
  
        <div
          style="
            position: absolute;
            bottom: -2px;
            left: -2px;
            width: 2rem;
            height: 2rem;
            border-bottom: 4px solid var(--corner-border);
            border-left: 4px solid var(--corner-border);
          "
        ></div>
        <div
          style="
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 2rem;
            height: 2rem;
            border-bottom: 4px solid var(--corner-border);
            border-right: 4px solid var(--corner-border);
          "
        ></div>`}

        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="margin-bottom: 1.5rem;">
            <div
              style="
                display: inline-block;
                border: 2px solid ${custom?.disableTitleBorder ? "transparent" : custom?.colors?.titleBorder || "var(--destructive)"};
                padding: 0.375rem 1rem;
              "
            >
              <h1
                style="
                  font-size: var(--text-6xl);
                  font-weight: var(--font-weight-semibold);
                  color: ${custom?.colors?.titleColor || "var(--foreground)"};
                  letter-spacing: -0.02em;
                  margin: 0;
                "
              >
                ERROR
              </h1>
            </div>
            <div
              style="
                height: 2px;
                background-color: var(--border);
                width: calc(100% + 3rem);
                margin-left: -1.5rem;
                margin-top: 1.5rem;
              "
            ></div>
          </div>

          <h2
            style="
              font-size: var(--text-2xl);
              font-weight: var(--font-weight-semibold);
              color: var(--foreground);
              margin: 0 0 1rem;
            "
          >
            Something went wrong
          </h2>

          <div
            style="
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                border: 2px solid var(--border);
                background-color: var(--muted);
                padding: 0.375rem 0.75rem;
                margin: 0 0 1rem;
                flex-wrap: wrap;
                justify-content: center;
            "
            >
            <span
                style="
                font-size: 0.75rem;
                color: var(--muted-foreground);
                font-weight: var(--font-weight-semibold);
                "
            >
                CODE:
            </span>
            <span
                style="
                font-size: var(--text-sm);
                font-family: var(--default-mono-font-family, monospace);
                color: var(--foreground);
                word-break: break-all;
                "
            >
                ${sanitize(code)}
            </span>
            </div>

          <p
            style="
              color: var(--muted-foreground);
              max-width: 28rem;
              margin: 0 auto;
              font-size: var(--text-sm);
              line-height: 1.5;
              text-wrap: pretty;
            "
          >
            ${!description ? `We encountered an unexpected error. Please try again or return to the home page. If you're a developer, you can find <a href='https://better-auth.com/docs/reference/errors/${encodeURIComponent(code)}' target='_blank' rel="noopener noreferrer" style='color: var(--foreground); text-decoration: underline;'>more information about the error</a>.` : description}
          </p>
        </div>

        <div
          style="
            display: flex;
            gap: 0.75rem;
            margin-top: 1.5rem;
            justify-content: center;
            flex-wrap: wrap;
          "
        >
          <a
            href="/"
            style="
              text-decoration: none;
            "
          >
            <div
              style="
                border: 2px solid var(--border);
                background: var(--primary);
                color: var(--primary-foreground);
                padding: 0.5rem 1rem;
                border-radius: 0;
                white-space: nowrap;
              "
              class="btn"
            >
              Go Home
            </div>
          </a>
          <a
            href="https://better-auth.com/docs/reference/errors/${encodeURIComponent(code)}?askai=${encodeURIComponent(`What does the error code ${code} mean?`)}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              text-decoration: none;
            "
          >
            <div
              style="
                border: 2px solid var(--border);
                background: transparent;
                color: var(--foreground);
                padding: 0.5rem 1rem;
                border-radius: 0;
                white-space: nowrap;
              "
              class="btn"
            >
              Ask AI
            </div>
          </a>
        </div>
      </div>
    </div>
  </body>
</html>`;
};
const error = createAuthEndpoint("/error", {
  method: "GET",
  metadata: {
    ...HIDE_METADATA,
    openapi: {
      description: "Displays an error page",
      responses: { "200": {
        description: "Success",
        content: { "text/html": { schema: {
          type: "string",
          description: "The HTML content of the error page"
        } } }
      } }
    }
  }
}, async (c) => {
  const url = new URL(c.request?.url || "");
  const unsanitizedCode = url.searchParams.get("error") || "UNKNOWN";
  const unsanitizedDescription = url.searchParams.get("error_description") || null;
  const safeCode = /^[\'A-Za-z0-9_-]+$/.test(unsanitizedCode) ? unsanitizedCode : "UNKNOWN";
  const safeDescription = unsanitizedDescription ? sanitize(unsanitizedDescription) : null;
  const params = new URLSearchParams();
  params.set("error", safeCode);
  if (unsanitizedDescription) params.set("error_description", unsanitizedDescription);
  const options = c.context.options;
  const errorURL = options.onAPIError?.errorURL;
  if (errorURL) {
    const redirectURL = appendQueryParams(errorURL, params);
    return new Response(null, {
      status: 302,
      headers: { Location: redirectURL }
    });
  }
  if (isProduction && !options.onAPIError?.customizeDefaultErrorPage) return new Response(null, {
    status: 302,
    headers: { Location: `/?${params.toString()}` }
  });
  return new Response(html(c.context.options, safeCode, safeDescription), { headers: { "Content-Type": "text/html" } });
});
const ok = createAuthEndpoint("/ok", {
  method: "GET",
  metadata: {
    ...HIDE_METADATA,
    openapi: {
      description: "Check if the API is working",
      responses: { "200": {
        description: "API is working",
        content: { "application/json": { schema: {
          type: "object",
          properties: { ok: {
            type: "boolean",
            description: "Indicates if the API is working"
          } },
          required: ["ok"]
        } } }
      } }
    }
  }
}, async (ctx) => {
  return ctx.json({ ok: true });
});
async function validatePassword(ctx, data) {
  const credentialAccount = await ctx.context.internalAdapter.findCredentialAccount(data.userId);
  const currentPassword = credentialAccount?.password;
  if (!credentialAccount || !currentPassword) return false;
  return await ctx.context.password.verify({
    hash: currentPassword,
    password: data.password
  });
}
async function checkPassword(userId, c) {
  const credentialAccount = await c.context.internalAdapter.findCredentialAccount(userId);
  const currentPassword = credentialAccount?.password;
  const password = c.body.password;
  if (!credentialAccount || !currentPassword || !password) {
    if (password) await c.context.password.hash(password);
    throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.INVALID_PASSWORD);
  }
  if (!await c.context.password.verify({
    hash: currentPassword,
    password
  })) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.INVALID_PASSWORD);
  return true;
}
function redirectError(ctx, callbackURL, query) {
  const url = callbackURL ? new URL(callbackURL, ctx.baseURL) : new URL(`${ctx.baseURL}/error`);
  if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.href;
}
function redirectCallback(ctx, callbackURL, query) {
  const url = new URL(callbackURL, ctx.baseURL);
  if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.href;
}
const requestPasswordReset = createAuthEndpoint("/request-password-reset", {
  method: "POST",
  body: z.object({
    /**
    * The email address of the user to send a password reset email to.
    */
    email: z.email().meta({ description: "The email address of the user to send a password reset email to" }),
    /**
    * The URL to redirect the user to reset their password.
    * If the token isn't valid or expired, it'll be redirected with a query parameter `?
    * error=INVALID_TOKEN`. If the token is valid, it'll be redirected with a query parameter `?
    * token=VALID_TOKEN
    */
    redirectTo: z.string().meta({ description: "The URL to redirect the user to reset their password. If the token isn't valid or expired, it'll be redirected with a query parameter `?error=INVALID_TOKEN`. If the token is valid, it'll be redirected with a query parameter `?token=VALID_TOKEN" }).optional()
  }),
  metadata: { openapi: {
    operationId: "requestPasswordReset",
    description: "Send a password reset email to the user",
    responses: { "200": {
      description: "Success",
      content: { "application/json": { schema: {
        type: "object",
        properties: {
          status: { type: "boolean" },
          message: { type: "string" }
        }
      } } }
    } }
  } },
  use: [originCheck((ctx) => ctx.body.redirectTo)]
}, async (ctx) => {
  if (!ctx.context.options.emailAndPassword?.sendResetPassword) {
    ctx.context.logger.error("Reset password isn't enabled.Please pass an emailAndPassword.sendResetPassword function in your auth config!");
    throw APIError.from("BAD_REQUEST", {
      message: "Reset password isn't enabled",
      code: "RESET_PASSWORD_DISABLED"
    });
  }
  const { email, redirectTo } = ctx.body;
  const user2 = await ctx.context.internalAdapter.findUserByEmail(email, { includeAccounts: true });
  if (!user2) {
    generateId(24);
    await ctx.context.internalAdapter.findVerificationValue("dummy-verification-token");
    ctx.context.logger.warn("Reset Password: User not found");
    return ctx.json({
      status: true,
      message: "If this email exists in our system, check your email for the reset link"
    });
  }
  const expiresAt = getDate(ctx.context.options.emailAndPassword.resetPasswordTokenExpiresIn || 3600 * 1, "sec");
  const verificationToken = generateId(24);
  await ctx.context.internalAdapter.createVerificationValue({
    value: user2.user.id,
    identifier: `reset-password:${verificationToken}`,
    expiresAt
  });
  const callbackURL = redirectTo ? encodeURIComponent(redirectTo) : "";
  const url = `${ctx.context.baseURL}/reset-password/${verificationToken}?callbackURL=${callbackURL}`;
  await ctx.context.runInBackgroundOrAwait(ctx.context.options.emailAndPassword.sendResetPassword({
    user: user2.user,
    url,
    token: verificationToken
  }, ctx.request));
  return ctx.json({
    status: true,
    message: "If this email exists in our system, check your email for the reset link"
  });
});
const requestPasswordResetCallback = createAuthEndpoint("/reset-password/:token", {
  method: "GET",
  operationId: "resetPasswordCallback",
  query: z.object({ callbackURL: z.string().meta({ description: "The URL to redirect the user to reset their password" }) }),
  use: [originCheck((ctx) => ctx.query.callbackURL)],
  metadata: { openapi: {
    operationId: "resetPasswordCallback",
    description: "Redirects the user to the callback URL with the token",
    parameters: [{
      name: "token",
      in: "path",
      required: true,
      description: "The token to reset the password",
      schema: { type: "string" }
    }, {
      name: "callbackURL",
      in: "query",
      required: true,
      description: "The URL to redirect the user to reset their password",
      schema: { type: "string" }
    }],
    responses: { "200": {
      description: "Success",
      content: { "application/json": { schema: {
        type: "object",
        properties: { token: { type: "string" } }
      } } }
    } }
  } }
}, async (ctx) => {
  const { token } = ctx.params;
  const { callbackURL } = ctx.query;
  if (!token || !callbackURL) throw ctx.redirect(redirectError(ctx.context, callbackURL, { error: "INVALID_TOKEN" }));
  const verification2 = await ctx.context.internalAdapter.findVerificationValue(`reset-password:${token}`);
  if (!verification2 || verification2.expiresAt < /* @__PURE__ */ new Date()) throw ctx.redirect(redirectError(ctx.context, callbackURL, { error: "INVALID_TOKEN" }));
  throw ctx.redirect(redirectCallback(ctx.context, callbackURL, { token }));
});
const resetPassword = createAuthEndpoint("/reset-password", {
  method: "POST",
  operationId: "resetPassword",
  query: z.object({ token: z.string().optional() }).optional(),
  body: z.object({
    newPassword: z.string().meta({ description: "The new password to set" }),
    token: z.string().meta({ description: "The token to reset the password" }).optional()
  }),
  metadata: { openapi: {
    operationId: "resetPassword",
    description: "Reset the password for a user",
    responses: { "200": {
      description: "Success",
      content: { "application/json": { schema: {
        type: "object",
        properties: { status: { type: "boolean" } }
      } } }
    } }
  } }
}, async (ctx) => {
  const token = ctx.body.token || ctx.query?.token;
  if (!token) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.INVALID_TOKEN);
  const { newPassword } = ctx.body;
  const minLength = ctx.context.password?.config.minPasswordLength;
  const maxLength = ctx.context.password?.config.maxPasswordLength;
  if (newPassword.length < minLength) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.PASSWORD_TOO_SHORT);
  if (newPassword.length > maxLength) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.PASSWORD_TOO_LONG);
  const id = `reset-password:${token}`;
  const verification2 = await ctx.context.internalAdapter.consumeVerificationValue(id);
  if (!verification2) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.INVALID_TOKEN);
  const userId = verification2.value;
  const user2 = await ctx.context.internalAdapter.findUserById(userId);
  if (!user2) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.USER_NOT_FOUND);
  const hashedPassword = await ctx.context.password.hash(newPassword);
  if (!await ctx.context.internalAdapter.findCredentialAccount(userId)) await ctx.context.internalAdapter.createAccount({
    userId,
    providerId: "credential",
    issuer: createLocalAccountIssuer("credential"),
    accountId: user2.id,
    password: hashedPassword
  });
  else await ctx.context.internalAdapter.updatePassword(userId, hashedPassword);
  if (ctx.context.options.emailAndPassword?.onPasswordReset) await ctx.context.options.emailAndPassword.onPasswordReset({ user: user2 }, ctx.request);
  if (ctx.context.options.emailAndPassword?.revokeSessionsOnPasswordReset) await ctx.context.internalAdapter.deleteUserSessions(userId);
  return ctx.json({ status: true });
});
const verifyPassword = createAuthEndpoint("/verify-password", {
  method: "POST",
  body: z.object({
    /**
    * The password to verify
    */
    password: z.string().meta({ description: "The password to verify" })
  }),
  metadata: {
    scope: "server",
    openapi: {
      operationId: "verifyPassword",
      description: "Verify the current user's password",
      responses: { "200": {
        description: "Success",
        content: { "application/json": { schema: {
          type: "object",
          properties: { status: { type: "boolean" } }
        } } }
      } }
    }
  },
  use: [sensitiveSessionMiddleware]
}, async (ctx) => {
  const { password } = ctx.body;
  const session2 = ctx.context.session;
  if (!await validatePassword(ctx, {
    password,
    userId: session2.user.id
  })) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.INVALID_PASSWORD);
  return ctx.json({ status: true });
});
const socialSignInBodySchema = z.object({
  /**
  * Callback URL to redirect to after the user
  * has signed in.
  */
  callbackURL: z.string().meta({ description: "Callback URL to redirect to after the user has signed in" }).optional(),
  /**
  * callback url to redirect if the user is newly registered.
  *
  * useful if you have different routes for existing users and new users
  */
  newUserCallbackURL: z.string().optional(),
  /**
  * Callback url to redirect to if an error happens
  *
  * If it's initiated from the client sdk this defaults to
  * the current url.
  */
  errorCallbackURL: z.string().meta({ description: "Callback URL to redirect to if an error happens" }).optional(),
  /**
  * OAuth2 provider to use`
  */
  provider: SocialProviderListEnum,
  /**
  * Disable automatic redirection to the provider
  *
  * This is useful if you want to handle the redirection
  * yourself like in a popup or a different tab.
  */
  disableRedirect: z.boolean().meta({ description: "Disable automatic redirection to the provider. Useful for handling the redirection yourself" }).optional(),
  /**
  * ID token from the provider
  *
  * This is used to sign in the user
  * if the user is already signed in with the
  * provider in the frontend.
  *
  * Only applicable if the provider supports
  * it. Currently only `apple` and `google` is
  * supported out of the box.
  */
  idToken: z.optional(z.object({
    /**
    * ID token from the provider
    */
    token: z.string().meta({ description: "ID token from the provider" }),
    /**
    * The nonce used to generate the token
    */
    nonce: z.string().meta({ description: "Nonce used to generate the token" }).optional(),
    /**
    * Access token from the provider
    */
    accessToken: z.string().meta({ description: "Access token from the provider" }).optional(),
    /**
    * Refresh token from the provider
    */
    refreshToken: z.string().meta({ description: "Refresh token from the provider" }).optional(),
    /**
    * Expiry date of the token
    */
    expiresAt: z.number().meta({ description: "Expiry date of the token" }).optional(),
    /**
    * The user object from the provider.
    * This is only available for some providers like Apple.
    */
    user: z.object({
      name: z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional()
      }).optional(),
      email: z.string().optional()
    }).meta({ description: "The user object from the provider. Only available for some providers like Apple." }).optional()
  })),
  scopes: z.array(z.string()).meta({ description: "Array of scopes to request from the provider. This will override the default scopes passed." }).optional(),
  /**
  * Explicitly request sign-up
  *
  * Should be used to allow sign up when
  * disableImplicitSignUp for this provider is
  * true
  */
  requestSignUp: z.boolean().meta({ description: "Explicitly request sign-up. Useful when disableImplicitSignUp is true for this provider" }).optional(),
  /**
  * The login hint to use for the authorization code request
  */
  loginHint: z.string().meta({ description: "The login hint to use for the authorization code request" }).optional(),
  /**
  * Extra query parameters to append to the provider authorization URL.
  * Reserved OAuth keys (state, client_id, redirect_uri, response_type,
  * code_challenge, code_challenge_method, nonce, scope) are rejected.
  */
  additionalParams: additionalAuthorizationParamsSchema,
  /**
  * Additional data to be passed through the OAuth flow
  */
  additionalData: z.record(z.string(), z.any()).optional().meta({ description: "Additional data to be passed through the OAuth flow" })
});
const signInSocial = () => createAuthEndpoint("/sign-in/social", {
  method: "POST",
  operationId: "socialSignIn",
  body: socialSignInBodySchema,
  metadata: {
    $Infer: {
      body: {},
      returned: {}
    },
    openapi: {
      description: "Sign in with a social provider",
      operationId: "socialSignIn",
      responses: { "200": {
        description: "Success - Returns session details (idToken branch) or an authorize URL (redirect branch)",
        content: { "application/json": { schema: {
          type: "object",
          description: "Returns session details when idToken is provided, or an authorize URL otherwise",
          properties: {
            token: { type: "string" },
            user: {
              type: "object",
              $ref: "#/components/schemas/User"
            },
            url: { type: "string" },
            redirect: { type: "boolean" }
          },
          required: ["redirect"]
        } } }
      } }
    }
  }
}, async (c) => {
  const provider = await getAwaitableValue(c.context.socialProviders, { value: c.body.provider });
  if (!provider) {
    c.context.logger.error("Provider not found. Make sure to add the provider in your auth config", { provider: c.body.provider });
    throw APIError.from("NOT_FOUND", BASE_ERROR_CODES.PROVIDER_NOT_FOUND);
  }
  if (c.body.idToken) {
    if (!supportsIdTokenSignIn(provider)) {
      c.context.logger.error("Provider does not support id token verification", { provider: c.body.provider });
      throw APIError.from("NOT_FOUND", BASE_ERROR_CODES.ID_TOKEN_NOT_SUPPORTED);
    }
    const { token, nonce } = c.body.idToken;
    if (!await verifyProviderIdToken(provider, token, nonce, c)) {
      c.context.logger.warn("Invalid id token", { provider: c.body.provider });
      throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.INVALID_TOKEN);
    }
    const oauthTokens = {
      idToken: token,
      accessToken: c.body.idToken.accessToken,
      refreshToken: c.body.idToken.refreshToken,
      user: c.body.idToken.user
    };
    const userInfo = await provider.getUserInfo(oauthTokens);
    if (!userInfo || !userInfo?.user) {
      c.context.logger.error("Failed to get user info", { provider: c.body.provider });
      throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.FAILED_TO_GET_USER_INFO);
    }
    if (!userInfo.user.email) {
      c.context.logger.error(missingEmailLogMessage(c.body.provider, { source: "id_token" }), { provider: c.body.provider });
      throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.USER_EMAIL_NOT_FOUND);
    }
    const accountKey = await resolveOAuthAccountKeyForAPI(provider, oauthTokens, userInfo.data);
    const providerProfile = toOAuthProfileRecord(userInfo.data);
    const data = await handleOAuthUserInfo(c, {
      userInfo: {
        ...userInfo.user,
        email: userInfo.user.email,
        id: accountKey.accountId,
        name: userInfo.user.name || "",
        image: userInfo.user.image,
        emailVerified: userInfo.user.emailVerified || false
      },
      account: {
        providerId: provider.id,
        ...accountKey,
        accessToken: c.body.idToken.accessToken,
        idToken: token
      },
      callbackURL: c.body.callbackURL,
      disableSignUp: provider.disableImplicitSignUp && !c.body.requestSignUp || provider.disableSignUp,
      source: {
        method: "oauth",
        oauth: {
          providerId: provider.id,
          profile: providerProfile
        }
      }
    });
    if (data.error) {
      if (data.error === OAUTH_CALLBACK_ERROR_CODES.EMAIL_NOT_VERIFIED) throw APIError.from("FORBIDDEN", BASE_ERROR_CODES.EMAIL_NOT_VERIFIED);
      throw APIError.from("UNAUTHORIZED", {
        message: data.error,
        code: "OAUTH_LINK_ERROR"
      });
    }
    await setSessionCookie(c, data.data);
    return c.json({
      redirect: false,
      token: data.data.session.token,
      url: void 0,
      user: parseUserOutput(c.context.options, data.data.user)
    });
  }
  const idTokenNonce = generateIdTokenNonce(provider);
  const { codeVerifier, state } = await generateState(c, {
    additionalData: c.body.additionalData,
    idTokenNonce
  });
  const url = await provider.createAuthorizationURL({
    state,
    codeVerifier,
    idTokenNonce,
    redirectURI: `${c.context.baseURL}${getOAuthCallbackPath(provider)}`,
    scopes: c.body.scopes,
    loginHint: c.body.loginHint,
    additionalParams: c.body.additionalParams
  });
  if (!c.body.disableRedirect) c.setHeader("Location", url.toString());
  return c.json({
    url: url.toString(),
    redirect: !c.body.disableRedirect
  });
});
const signInEmail = () => createAuthEndpoint("/sign-in/email", {
  method: "POST",
  operationId: "signInEmail",
  use: [formCsrfMiddleware],
  cloneRequest: true,
  body: z.object({
    /**
    * Email of the user
    */
    email: z.string().meta({ description: "Email of the user" }),
    /**
    * Password of the user
    */
    password: z.string().meta({ description: "Password of the user" }),
    /**
    * Callback URL to use as a redirect for email
    * verification and for possible redirects
    */
    callbackURL: z.string().meta({ description: "Callback URL to use as a redirect for email verification" }).optional(),
    /**
    * If this is false, the session will not be remembered
    * @default true
    */
    rememberMe: z.boolean().meta({ description: "If this is false, the session will not be remembered. Default is `true`." }).default(true).optional()
  }),
  metadata: {
    allowedMediaTypes: ["application/x-www-form-urlencoded", "application/json"],
    $Infer: {
      body: {},
      returned: {}
    },
    openapi: {
      operationId: "signInEmail",
      description: "Sign in with email and password",
      responses: { "200": {
        description: "Success - Returns either session details or redirect URL",
        content: { "application/json": { schema: {
          type: "object",
          description: "Session response when idToken is provided",
          properties: {
            redirect: {
              type: "boolean",
              enum: [false]
            },
            token: {
              type: "string",
              description: "Session token"
            },
            url: {
              type: "string",
              nullable: true
            },
            user: {
              type: "object",
              $ref: "#/components/schemas/User"
            }
          },
          required: [
            "redirect",
            "token",
            "user"
          ]
        } } }
      } }
    }
  }
}, async (ctx) => {
  if (!ctx.context.options?.emailAndPassword?.enabled) {
    ctx.context.logger.error("Email and password is not enabled. Make sure to enable it in the options on you `auth.ts` file. Check `https://better-auth.com/docs/authentication/email-password` for more!");
    throw APIError.from("BAD_REQUEST", {
      code: "EMAIL_PASSWORD_DISABLED",
      message: "Email and password is not enabled"
    });
  }
  const { email, password } = ctx.body;
  if (!z.email().safeParse(email).success) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.INVALID_EMAIL);
  const userRecord = await ctx.context.internalAdapter.findUserByEmail(email.toLowerCase(), { includeAccounts: true });
  const credentialIssuer = createLocalAccountIssuer("credential");
  const credentialAccount = userRecord?.accounts.find((account2) => account2.providerId === "credential" && account2.issuer === credentialIssuer && account2.accountId === userRecord.user.id);
  if (!userRecord || !credentialAccount) {
    await ctx.context.password.hash(password);
    ctx.context.logger.warn("User not found");
    throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD);
  }
  const user2 = userRecord.user;
  const currentPassword = credentialAccount.password;
  if (!currentPassword) {
    await ctx.context.password.hash(password);
    ctx.context.logger.warn("Password not found");
    throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD);
  }
  if (!await ctx.context.password.verify({
    hash: currentPassword,
    password
  })) {
    ctx.context.logger.warn("Invalid password");
    throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD);
  }
  if (ctx.context.options?.emailAndPassword?.requireEmailVerification && !user2.emailVerified) {
    if (!ctx.context.options?.emailVerification?.sendVerificationEmail) throw APIError.from("FORBIDDEN", BASE_ERROR_CODES.EMAIL_NOT_VERIFIED);
    if (ctx.context.options?.emailVerification?.sendOnSignIn) {
      const token = await createEmailVerificationToken(ctx.context.secret, user2.email, void 0, ctx.context.options.emailVerification?.expiresIn);
      const callbackURL = ctx.body.callbackURL ? encodeURIComponent(ctx.body.callbackURL) : encodeURIComponent("/");
      const url = `${ctx.context.baseURL}/verify-email?token=${token}&callbackURL=${callbackURL}`;
      await ctx.context.runInBackgroundOrAwait(ctx.context.options.emailVerification.sendVerificationEmail({
        user: user2,
        url,
        token
      }, safeCloneRequest(ctx.request)));
    }
    throw APIError.from("FORBIDDEN", BASE_ERROR_CODES.EMAIL_NOT_VERIFIED);
  }
  const session2 = await ctx.context.internalAdapter.createSession(user2.id, ctx.body.rememberMe === false);
  if (!session2) {
    ctx.context.logger.error("Failed to create session");
    throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.FAILED_TO_CREATE_SESSION);
  }
  await setSessionCookie(ctx, {
    session: session2,
    user: user2
  }, ctx.body.rememberMe === false);
  if (ctx.body.callbackURL) ctx.setHeader("Location", ctx.body.callbackURL);
  return ctx.json({
    redirect: !!ctx.body.callbackURL,
    token: session2.token,
    url: ctx.body.callbackURL,
    user: parseUserOutput(ctx.context.options, user2)
  });
});
const signOutBodySchema = z.object({
  callbackURL: z.string().meta({ description: "The URL to redirect to after provider logout" }).optional(),
  disableRedirect: z.boolean().meta({ description: "Return the provider logout URL without redirecting" }).optional(),
  state: z.string().meta({ description: "State to pass to the provider logout endpoint" }).optional()
}).optional();
const signOutResponse = (providerLogout) => ({
  success: true,
  url: providerLogout?.url,
  redirect: providerLogout?.redirect
});
const signOut = createAuthEndpoint("/sign-out", {
  method: "POST",
  body: signOutBodySchema,
  operationId: "signOut",
  requireHeaders: true,
  metadata: { openapi: {
    operationId: "signOut",
    description: "Sign out the current user",
    responses: { "200": {
      description: "Success",
      content: { "application/json": { schema: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          url: {
            type: "string",
            description: "Provider logout URL when RP-initiated logout is available"
          },
          redirect: {
            type: "boolean",
            description: "Whether the client should redirect to the provider logout URL"
          }
        }
      } } }
    } }
  } }
}, async (ctx) => {
  const sessionCookieToken = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret);
  let currentSession = null;
  if (sessionCookieToken) try {
    currentSession = await ctx.context.internalAdapter.findSession(sessionCookieToken);
  } catch (e) {
    ctx.context.logger.error("Failed to read session from database", e);
  }
  if (sessionCookieToken) try {
    await ctx.context.internalAdapter.deleteSession(sessionCookieToken);
  } catch (e) {
    ctx.context.logger.error("Failed to delete session from database", e);
  }
  deleteSessionCookie(ctx);
  const providerLogoutResult = await (async () => {
    try {
      if (!currentSession) return null;
      const accounts = await ctx.context.internalAdapter.findAccounts(currentSession.user.id);
      const providersById = new Map(ctx.context.socialProviders.map((provider) => [provider.id, provider]));
      const logoutAccounts = accounts.filter((account2) => Boolean(providersById.get(account2.providerId)?.createEndSessionURL)).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      if (logoutAccounts.length === 0) return null;
      const seenProviderIds = /* @__PURE__ */ new Set();
      const postLogoutRedirectURI = ctx.body?.callbackURL ? new URL(ctx.body.callbackURL, ctx.context.baseURL).toString() : void 0;
      for (const account2 of logoutAccounts) {
        if (seenProviderIds.has(account2.providerId)) continue;
        seenProviderIds.add(account2.providerId);
        const provider = providersById.get(account2.providerId);
        try {
          const url = await provider?.createEndSessionURL?.({
            idToken: account2.idToken,
            postLogoutRedirectURI,
            state: ctx.body?.state
          });
          if (url) return url.toString();
        } catch (e) {
          ctx.context.logger.error(`Failed to create logout URL for provider "${account2.providerId}"`, e);
        }
      }
      return null;
    } catch (e) {
      ctx.context.logger.error("Failed to create provider logout URL", e);
      return null;
    }
  })();
  if (providerLogoutResult) {
    const shouldRedirect = !ctx.body?.disableRedirect;
    if (shouldRedirect) ctx.setHeader("Location", providerLogoutResult);
    return ctx.json(signOutResponse({
      url: providerLogoutResult,
      redirect: shouldRedirect
    }));
  }
  return ctx.json(signOutResponse());
});
const signUpEmailBodySchema = z.object({
  name: z.string(),
  email: z.email(),
  password: z.string().nonempty(),
  image: z.string().optional(),
  callbackURL: z.string().optional(),
  rememberMe: z.boolean().optional()
}).and(z.record(z.string(), z.any()));
const signUpEmail = () => createAuthEndpoint("/sign-up/email", {
  method: "POST",
  operationId: "signUpWithEmailAndPassword",
  use: [formCsrfMiddleware],
  body: signUpEmailBodySchema,
  cloneRequest: true,
  metadata: {
    allowedMediaTypes: ["application/x-www-form-urlencoded", "application/json"],
    $Infer: {
      body: {},
      returned: {}
    },
    openapi: {
      operationId: "signUpWithEmailAndPassword",
      description: "Sign up a user using email and password",
      requestBody: { content: { "application/json": { schema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the user"
          },
          email: {
            type: "string",
            description: "The email of the user"
          },
          password: {
            type: "string",
            description: "The password of the user"
          },
          image: {
            type: "string",
            description: "The profile image URL of the user"
          },
          callbackURL: {
            type: "string",
            description: "The URL to use for email verification callback"
          },
          rememberMe: {
            type: "boolean",
            description: "If this is false, the session will not be remembered. Default is `true`."
          }
        },
        required: [
          "name",
          "email",
          "password"
        ]
      } } } },
      responses: {
        "200": {
          description: "Successfully created user",
          content: { "application/json": { schema: {
            type: "object",
            properties: {
              token: {
                type: "string",
                nullable: true,
                description: "Authentication token for the session"
              },
              user: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    description: "The unique identifier of the user"
                  },
                  email: {
                    type: "string",
                    format: "email",
                    description: "The email address of the user"
                  },
                  name: {
                    type: "string",
                    description: "The name of the user"
                  },
                  image: {
                    type: "string",
                    format: "uri",
                    nullable: true,
                    description: "The profile image URL of the user"
                  },
                  emailVerified: {
                    type: "boolean",
                    description: "Whether the email has been verified"
                  },
                  createdAt: {
                    type: "string",
                    format: "date-time",
                    description: "When the user was created"
                  },
                  updatedAt: {
                    type: "string",
                    format: "date-time",
                    description: "When the user was last updated"
                  }
                },
                required: [
                  "id",
                  "email",
                  "name",
                  "emailVerified",
                  "createdAt",
                  "updatedAt"
                ]
              }
            },
            required: ["user"]
          } } }
        },
        "422": {
          description: "Unprocessable Entity. User already exists or failed to create user.",
          content: { "application/json": { schema: {
            type: "object",
            properties: { message: { type: "string" } }
          } } }
        }
      }
    }
  }
}, async (ctx) => {
  return runWithTransaction(ctx.context.adapter, async () => {
    if (!ctx.context.options.emailAndPassword?.enabled || ctx.context.options.emailAndPassword?.disableSignUp) throw APIError.from("BAD_REQUEST", {
      message: "Email and password sign up is not enabled",
      code: "EMAIL_PASSWORD_SIGN_UP_DISABLED"
    });
    const body = ctx.body;
    const { name, email, password, image, callbackURL: _callbackURL, rememberMe, ...rest } = body;
    if (!z.email().safeParse(email).success) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.INVALID_EMAIL);
    if (!password || typeof password !== "string") throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.INVALID_PASSWORD);
    const minPasswordLength = ctx.context.password.config.minPasswordLength;
    if (password.length < minPasswordLength) {
      ctx.context.logger.warn("Password is too short");
      throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.PASSWORD_TOO_SHORT);
    }
    const maxPasswordLength = ctx.context.password.config.maxPasswordLength;
    if (password.length > maxPasswordLength) {
      ctx.context.logger.warn("Password is too long");
      throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.PASSWORD_TOO_LONG);
    }
    const shouldReturnGenericDuplicateResponse = ctx.context.options.emailAndPassword.requireEmailVerification || ctx.context.options.emailAndPassword.autoSignIn === false;
    const shouldSkipAutoSignIn = ctx.context.options.emailAndPassword.autoSignIn === false || shouldReturnGenericDuplicateResponse;
    const additionalUserFields = parseUserInput(ctx.context.options, rest, "create");
    const normalizedEmail = email.toLowerCase();
    const buildGenericDuplicateResponse = () => {
      const now2 = /* @__PURE__ */ new Date();
      const generatedId = ctx.context.generateId({ model: "user" }) || generateId();
      const coreFields = {
        name,
        email: normalizedEmail,
        emailVerified: false,
        image: image ?? null,
        createdAt: now2,
        updatedAt: now2
      };
      const customSyntheticUser = ctx.context.options.emailAndPassword?.customSyntheticUser;
      let syntheticUser;
      if (customSyntheticUser) {
        const additionalFieldKeys = Object.keys(ctx.context.options.user?.additionalFields ?? {});
        const additionalFields = {};
        for (const key of additionalFieldKeys) if (key in additionalUserFields) additionalFields[key] = additionalUserFields[key];
        const customResult = customSyntheticUser({
          coreFields,
          additionalFields,
          id: generatedId
        });
        syntheticUser = buildSyntheticUserOutput(ctx.context.options, customResult);
      } else syntheticUser = buildSyntheticUserOutput(ctx.context.options, {
        ...coreFields,
        ...additionalUserFields,
        id: generatedId
      });
      return ctx.json({
        token: null,
        user: parseUserOutput(ctx.context.options, syntheticUser)
      });
    };
    const dbUser = await ctx.context.internalAdapter.findUserByEmail(normalizedEmail);
    if (dbUser?.user) {
      ctx.context.logger.info(`Sign-up attempt for existing email: ${email}`);
      if (shouldReturnGenericDuplicateResponse) {
        await ctx.context.password.hash(password);
        if (ctx.context.options.emailAndPassword?.onExistingUserSignUp) await ctx.context.runInBackgroundOrAwait(ctx.context.options.emailAndPassword.onExistingUserSignUp({ user: dbUser.user }, safeCloneRequest(ctx.request)));
        return buildGenericDuplicateResponse();
      }
      throw APIError.from("UNPROCESSABLE_ENTITY", BASE_ERROR_CODES.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL);
    }
    const hash = await ctx.context.password.hash(password);
    let createdUser;
    try {
      createdUser = await ctx.context.internalAdapter.createUser({
        email: normalizedEmail,
        name,
        image,
        ...additionalUserFields,
        emailVerified: false
      }, { method: "email-password" });
      if (!createdUser) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.FAILED_TO_CREATE_USER);
    } catch (e) {
      if (isAPIError(e)) {
        if (e.statusCode === 403 && shouldReturnGenericDuplicateResponse) return buildGenericDuplicateResponse();
        throw e;
      }
      if (isDevelopment()) ctx.context.logger.error("Failed to create user", e);
      ctx.context.logger?.error("Failed to create user", e);
      throw APIError.from("UNPROCESSABLE_ENTITY", BASE_ERROR_CODES.FAILED_TO_CREATE_USER);
    }
    if (!createdUser) throw APIError.from("UNPROCESSABLE_ENTITY", BASE_ERROR_CODES.FAILED_TO_CREATE_USER);
    await ctx.context.internalAdapter.linkAccount({
      userId: createdUser.id,
      providerId: "credential",
      issuer: createLocalAccountIssuer("credential"),
      accountId: createdUser.id,
      password: hash
    });
    if (ctx.context.options.emailVerification?.sendOnSignUp ?? ctx.context.options.emailAndPassword.requireEmailVerification) {
      const token = await createEmailVerificationToken(ctx.context.secret, createdUser.email, void 0, ctx.context.options.emailVerification?.expiresIn);
      const callbackURL = body.callbackURL ? encodeURIComponent(body.callbackURL) : encodeURIComponent("/");
      const url = `${ctx.context.baseURL}/verify-email?token=${token}&callbackURL=${callbackURL}`;
      if (ctx.context.options.emailVerification?.sendVerificationEmail) await ctx.context.runInBackgroundOrAwait(ctx.context.options.emailVerification.sendVerificationEmail({
        user: createdUser,
        url,
        token
      }, safeCloneRequest(ctx.request)));
    }
    if (shouldSkipAutoSignIn) return ctx.json({
      token: null,
      user: parseUserOutput(ctx.context.options, createdUser)
    });
    const session2 = await ctx.context.internalAdapter.createSession(createdUser.id, rememberMe === false);
    if (!session2) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.FAILED_TO_CREATE_SESSION);
    await setSessionCookie(ctx, {
      session: session2,
      user: createdUser
    }, rememberMe === false);
    return ctx.json({
      token: session2.token,
      user: parseUserOutput(ctx.context.options, createdUser)
    });
  });
});
const updateSessionBodySchema = z.record(z.string().meta({ description: "Field name must be a string" }), z.any());
const updateSession = () => createAuthEndpoint("/update-session", {
  method: "POST",
  operationId: "updateSession",
  body: updateSessionBodySchema,
  use: [sessionMiddleware],
  metadata: {
    $Infer: { body: {} },
    openapi: {
      operationId: "updateSession",
      description: "Update the current session",
      responses: { "200": {
        description: "Success",
        content: { "application/json": { schema: {
          type: "object",
          properties: { session: {
            type: "object",
            $ref: "#/components/schemas/Session"
          } }
        } } }
      } }
    }
  }
}, async (ctx) => {
  const body = ctx.body;
  if (typeof body !== "object" || Array.isArray(body)) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.BODY_MUST_BE_AN_OBJECT);
  const session2 = ctx.context.session;
  const additionalFields = parseSessionInput(ctx.context.options, body, "update");
  if (Object.keys(additionalFields).length === 0) throw APIError.fromStatus("BAD_REQUEST", { message: "No fields to update" });
  const updatedSession = await ctx.context.internalAdapter.updateSession(session2.session.token, {
    ...additionalFields,
    updatedAt: /* @__PURE__ */ new Date()
  });
  if (!updatedSession && isStateful(ctx)) {
    deleteSessionCookie(ctx);
    throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.FAILED_TO_GET_SESSION);
  }
  const newSession = updatedSession ?? {
    ...session2.session,
    ...additionalFields,
    updatedAt: /* @__PURE__ */ new Date()
  };
  await setSessionCookie(ctx, {
    session: newSession,
    user: session2.user
  });
  return ctx.json({ session: parseSessionOutput(ctx.context.options, newSession) });
});
const updateUserBodySchema = z.record(z.string().meta({ description: "Field name must be a string" }), z.any());
const updateUser = () => createAuthEndpoint("/update-user", {
  method: "POST",
  operationId: "updateUser",
  body: updateUserBodySchema,
  use: [sessionMiddleware],
  metadata: {
    $Infer: { body: {} },
    openapi: {
      operationId: "updateUser",
      description: "Update the current user",
      requestBody: { content: { "application/json": { schema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the user"
          },
          image: {
            type: "string",
            description: "The image of the user",
            nullable: true
          }
        }
      } } } },
      responses: { "200": {
        description: "Success",
        content: { "application/json": { schema: {
          type: "object",
          properties: { user: {
            type: "object",
            $ref: "#/components/schemas/User"
          } }
        } } }
      } }
    }
  }
}, async (ctx) => {
  const body = ctx.body;
  if (typeof body !== "object" || Array.isArray(body)) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.BODY_MUST_BE_AN_OBJECT);
  if (body.email) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.EMAIL_CAN_NOT_BE_UPDATED);
  const { name, image, ...rest } = body;
  const session2 = ctx.context.session;
  const additionalFields = parseUserInput(ctx.context.options, rest, "update");
  if (image === void 0 && name === void 0 && Object.keys(additionalFields).length === 0) throw APIError.fromStatus("BAD_REQUEST", { message: "No fields to update" });
  const updatedUser = await ctx.context.internalAdapter.updateUser(session2.user.id, {
    name,
    image,
    ...additionalFields
  }) ?? {
    ...session2.user,
    ...name !== void 0 && { name },
    ...image !== void 0 && { image },
    ...additionalFields
  };
  await setSessionCookie(ctx, {
    session: session2.session,
    user: updatedUser
  });
  return ctx.json({ status: true });
});
const changePassword = createAuthEndpoint("/change-password", {
  method: "POST",
  operationId: "changePassword",
  body: z.object({
    /**
    * The new password to set
    */
    newPassword: z.string().meta({ description: "The new password to set" }),
    /**
    * The current password of the user
    */
    currentPassword: z.string().meta({ description: "The current password is required" }),
    /**
    * revoke all sessions that are not the
    * current one logged in by the user
    */
    revokeOtherSessions: z.boolean().meta({ description: "Must be a boolean value" }).optional()
  }),
  use: [sensitiveSessionMiddleware],
  metadata: { openapi: {
    operationId: "changePassword",
    description: "Change the password of the user",
    responses: { "200": {
      description: "Password successfully changed",
      content: { "application/json": { schema: {
        type: "object",
        properties: {
          token: {
            type: "string",
            nullable: true,
            description: "New session token if other sessions were revoked"
          },
          user: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "The unique identifier of the user"
              },
              email: {
                type: "string",
                format: "email",
                description: "The email address of the user"
              },
              name: {
                type: "string",
                description: "The name of the user"
              },
              image: {
                type: "string",
                format: "uri",
                nullable: true,
                description: "The profile image URL of the user"
              },
              emailVerified: {
                type: "boolean",
                description: "Whether the email has been verified"
              },
              createdAt: {
                type: "string",
                format: "date-time",
                description: "When the user was created"
              },
              updatedAt: {
                type: "string",
                format: "date-time",
                description: "When the user was last updated"
              }
            },
            required: [
              "id",
              "email",
              "name",
              "emailVerified",
              "createdAt",
              "updatedAt"
            ]
          }
        },
        required: ["user"]
      } } }
    } }
  } }
}, async (ctx) => {
  const { newPassword, currentPassword, revokeOtherSessions: revokeOtherSessions2 } = ctx.body;
  const session2 = ctx.context.session;
  const minPasswordLength = ctx.context.password.config.minPasswordLength;
  if (newPassword.length < minPasswordLength) {
    ctx.context.logger.warn("Password is too short");
    throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.PASSWORD_TOO_SHORT);
  }
  const maxPasswordLength = ctx.context.password.config.maxPasswordLength;
  if (newPassword.length > maxPasswordLength) {
    ctx.context.logger.warn("Password is too long");
    throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.PASSWORD_TOO_LONG);
  }
  const account2 = await ctx.context.internalAdapter.findCredentialAccount(session2.user.id);
  if (!account2 || !account2.password) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.CREDENTIAL_ACCOUNT_NOT_FOUND);
  const passwordHash = await ctx.context.password.hash(newPassword);
  if (!await ctx.context.password.verify({
    hash: account2.password,
    password: currentPassword
  })) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.INVALID_PASSWORD);
  await ctx.context.internalAdapter.updateAccount(account2.id, { password: passwordHash });
  let token = null;
  if (revokeOtherSessions2) {
    await ctx.context.internalAdapter.deleteUserSessions(session2.user.id);
    const newSession = await ctx.context.internalAdapter.createSession(session2.user.id);
    if (!newSession) throw APIError.from("INTERNAL_SERVER_ERROR", BASE_ERROR_CODES.FAILED_TO_GET_SESSION);
    await setSessionCookie(ctx, {
      session: newSession,
      user: session2.user
    });
    token = newSession.token;
  }
  return ctx.json({
    token,
    user: parseUserOutput(ctx.context.options, session2.user)
  });
});
const setPassword = createAuthEndpoint.serverOnly({
  method: "POST",
  body: z.object({
    /**
    * The new password to set
    */
    newPassword: z.string().meta({ description: "The new password to set is required" })
  }),
  use: [sensitiveSessionMiddleware]
}, async (ctx) => {
  const { newPassword } = ctx.body;
  const session2 = ctx.context.session;
  const minPasswordLength = ctx.context.password.config.minPasswordLength;
  if (newPassword.length < minPasswordLength) {
    ctx.context.logger.warn("Password is too short");
    throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.PASSWORD_TOO_SHORT);
  }
  const maxPasswordLength = ctx.context.password.config.maxPasswordLength;
  if (newPassword.length > maxPasswordLength) {
    ctx.context.logger.warn("Password is too long");
    throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.PASSWORD_TOO_LONG);
  }
  const account2 = await ctx.context.internalAdapter.findCredentialAccount(session2.user.id);
  const passwordHash = await ctx.context.password.hash(newPassword);
  if (!account2) {
    await ctx.context.internalAdapter.linkAccount({
      userId: session2.user.id,
      providerId: "credential",
      issuer: createLocalAccountIssuer("credential"),
      accountId: session2.user.id,
      password: passwordHash
    });
    return ctx.json({ status: true });
  }
  if (!account2.password) {
    await ctx.context.internalAdapter.updateAccount(account2.id, { password: passwordHash });
    return ctx.json({ status: true });
  }
  throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.PASSWORD_ALREADY_SET);
});
const deleteUser = createAuthEndpoint("/delete-user", {
  method: "POST",
  use: [sensitiveSessionMiddleware],
  body: z.object({
    /**
    * The callback URL to redirect to after the user is deleted
    * this is only used on delete user callback
    */
    callbackURL: z.string().meta({ description: "The callback URL to redirect to after the user is deleted" }).optional(),
    /**
    * The password of the user. If the password isn't provided, session freshness
    * will be checked.
    */
    password: z.string().meta({ description: "The password of the user is required to delete the user" }).optional(),
    /**
    * The token to delete the user. If the token is provided, the user will be deleted
    */
    token: z.string().meta({ description: "The token to delete the user is required" }).optional()
  }),
  metadata: { openapi: {
    operationId: "deleteUser",
    description: "Delete the user",
    requestBody: { content: { "application/json": { schema: {
      type: "object",
      properties: {
        callbackURL: {
          type: "string",
          description: "The callback URL to redirect to after the user is deleted"
        },
        password: {
          type: "string",
          description: "The user's password. Required if session is not fresh"
        },
        token: {
          type: "string",
          description: "The deletion verification token"
        }
      }
    } } } },
    responses: { "200": {
      description: "User deletion processed successfully",
      content: { "application/json": { schema: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Indicates if the operation was successful"
          },
          message: {
            type: "string",
            enum: ["User deleted", "Verification email sent"],
            description: "Status message of the deletion process"
          }
        },
        required: ["success", "message"]
      } } }
    } }
  } }
}, async (ctx) => {
  if (!ctx.context.options.user?.deleteUser?.enabled) {
    ctx.context.logger.error("Delete user is disabled. Enable it in the options");
    throw APIError.fromStatus("NOT_FOUND");
  }
  const session2 = ctx.context.session;
  if (ctx.body.password) {
    const account2 = await ctx.context.internalAdapter.findCredentialAccount(session2.user.id);
    if (!account2 || !account2.password) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.CREDENTIAL_ACCOUNT_NOT_FOUND);
    if (!await ctx.context.password.verify({
      hash: account2.password,
      password: ctx.body.password
    })) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.INVALID_PASSWORD);
  }
  if (ctx.body.token) {
    await deleteUserCallback({
      ...ctx,
      query: { token: ctx.body.token }
    });
    return ctx.json({
      success: true,
      message: "User deleted"
    });
  }
  if (ctx.context.options.user.deleteUser?.sendDeleteAccountVerification) {
    const token = generateRandomString(32, "0-9", "a-z");
    await ctx.context.internalAdapter.createVerificationValue({
      value: session2.user.id,
      identifier: `delete-account-${token}`,
      expiresAt: new Date(Date.now() + (ctx.context.options.user.deleteUser?.deleteTokenExpiresIn || 3600 * 24) * 1e3)
    });
    const url = `${ctx.context.baseURL}/delete-user/callback?token=${token}&callbackURL=${encodeURIComponent(ctx.body.callbackURL || "/")}`;
    await ctx.context.runInBackgroundOrAwait(ctx.context.options.user.deleteUser.sendDeleteAccountVerification({
      user: session2.user,
      url,
      token
    }, ctx.request));
    return ctx.json({
      success: true,
      message: "Verification email sent"
    });
  }
  if (!ctx.body.password && ctx.context.sessionConfig.freshAge !== 0) {
    const createdAt = new Date(session2.session.createdAt).getTime();
    const freshAge = ctx.context.sessionConfig.freshAge * 1e3;
    if (Date.now() - createdAt >= freshAge) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.SESSION_EXPIRED);
  }
  const beforeDelete = ctx.context.options.user.deleteUser?.beforeDelete;
  if (beforeDelete) await beforeDelete(session2.user, ctx.request);
  await ctx.context.internalAdapter.deleteUser(session2.user.id);
  await ctx.context.internalAdapter.deleteUserSessions(session2.user.id);
  deleteSessionCookie(ctx);
  const afterDelete = ctx.context.options.user.deleteUser?.afterDelete;
  if (afterDelete) await afterDelete(session2.user, ctx.request);
  return ctx.json({
    success: true,
    message: "User deleted"
  });
});
const deleteUserCallback = createAuthEndpoint("/delete-user/callback", {
  method: "GET",
  query: z.object({
    token: z.string().meta({ description: "The token to verify the deletion request" }),
    callbackURL: z.string().meta({ description: "The URL to redirect to after deletion" }).optional()
  }),
  use: [originCheck((ctx) => ctx.query.callbackURL)],
  metadata: { openapi: {
    description: "Callback to complete user deletion with verification token",
    responses: { "200": {
      description: "User successfully deleted",
      content: { "application/json": { schema: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Indicates if the deletion was successful"
          },
          message: {
            type: "string",
            enum: ["User deleted"],
            description: "Confirmation message"
          }
        },
        required: ["success", "message"]
      } } }
    } }
  } }
}, async (ctx) => {
  if (!ctx.context.options.user?.deleteUser?.enabled) {
    ctx.context.logger.error("Delete user is disabled. Enable it in the options");
    throw APIError.from("NOT_FOUND", {
      message: "Not found",
      code: "NOT_FOUND"
    });
  }
  const session2 = await getSessionFromCtx(ctx, { disableCookieCache: isStateful(ctx) });
  if (!session2) throw APIError.from("NOT_FOUND", BASE_ERROR_CODES.FAILED_TO_GET_USER_INFO);
  const token = await ctx.context.internalAdapter.consumeVerificationValue(`delete-account-${ctx.query.token}`);
  if (!token || token.value !== session2.user.id) throw APIError.from("NOT_FOUND", BASE_ERROR_CODES.INVALID_TOKEN);
  const beforeDelete = ctx.context.options.user.deleteUser?.beforeDelete;
  if (beforeDelete) await beforeDelete(session2.user, ctx.request);
  await ctx.context.internalAdapter.deleteUser(session2.user.id);
  await ctx.context.internalAdapter.deleteUserSessions(session2.user.id);
  await ctx.context.internalAdapter.deleteAccounts(session2.user.id);
  deleteSessionCookie(ctx);
  const afterDelete = ctx.context.options.user.deleteUser?.afterDelete;
  if (afterDelete) await afterDelete(session2.user, ctx.request);
  if (ctx.query.callbackURL) throw ctx.redirect(ctx.query.callbackURL || "/");
  return ctx.json({
    success: true,
    message: "User deleted"
  });
});
const changeEmail = createAuthEndpoint("/change-email", {
  method: "POST",
  body: z.object({
    newEmail: z.email().meta({ description: "The new email address to set must be a valid email address" }),
    callbackURL: z.string().meta({ description: "The URL to redirect to after email verification" }).optional()
  }),
  use: [sensitiveSessionMiddleware],
  metadata: { openapi: {
    operationId: "changeEmail",
    responses: { "200": {
      description: "Email change request processed successfully",
      content: { "application/json": { schema: {
        type: "object",
        properties: {
          user: {
            type: "object",
            $ref: "#/components/schemas/User"
          },
          status: {
            type: "boolean",
            description: "Indicates if the request was successful"
          },
          message: {
            type: "string",
            enum: ["Email updated", "Verification email sent"],
            description: "Status message of the email change process",
            nullable: true
          }
        },
        required: ["status"]
      } } }
    } }
  } }
}, async (ctx) => {
  if (!ctx.context.options.user?.changeEmail?.enabled) {
    ctx.context.logger.error("Change email is disabled.");
    throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.CHANGE_EMAIL_DISABLED);
  }
  const newEmail = ctx.body.newEmail.toLowerCase();
  if (newEmail === ctx.context.session.user.email) {
    ctx.context.logger.warn("Email is the same");
    throw APIError.fromStatus("BAD_REQUEST", { message: "Email is the same" });
  }
  const canUpdateWithoutVerification = ctx.context.session.user.emailVerified !== true && ctx.context.options.user.changeEmail.updateEmailWithoutVerification;
  const canSendVerification = ctx.context.options.emailVerification?.sendVerificationEmail;
  const canSendConfirmation = canSendVerification && ctx.context.session.user.emailVerified && ctx.context.options.user.changeEmail.sendChangeEmailConfirmation;
  if (!canUpdateWithoutVerification && !canSendConfirmation && !canSendVerification) {
    ctx.context.logger.error("Verification email isn't enabled.");
    throw APIError.fromStatus("BAD_REQUEST", { message: "Verification email isn't enabled" });
  }
  if (await ctx.context.internalAdapter.findUserByEmail(newEmail)) {
    await createEmailVerificationToken(ctx.context.secret, ctx.context.session.user.email, newEmail, ctx.context.options.emailVerification?.expiresIn);
    ctx.context.logger.info("Change email attempt for existing email");
    return ctx.json({ status: true });
  }
  if (canUpdateWithoutVerification) {
    await ctx.context.internalAdapter.updateUser(ctx.context.session.user.id, { email: newEmail });
    await setSessionCookie(ctx, {
      session: ctx.context.session.session,
      user: {
        ...ctx.context.session.user,
        email: newEmail
      }
    });
    if (canSendVerification) {
      const token2 = await createEmailVerificationToken(ctx.context.secret, newEmail, void 0, ctx.context.options.emailVerification?.expiresIn);
      const url2 = `${ctx.context.baseURL}/verify-email?token=${token2}&callbackURL=${encodeURIComponent(ctx.body.callbackURL || "/")}`;
      await ctx.context.runInBackgroundOrAwait(canSendVerification({
        user: {
          ...ctx.context.session.user,
          email: newEmail
        },
        url: url2,
        token: token2
      }, ctx.request));
    }
    return ctx.json({ status: true });
  }
  if (canSendConfirmation) {
    const token2 = await createEmailVerificationToken(ctx.context.secret, ctx.context.session.user.email, newEmail, ctx.context.options.emailVerification?.expiresIn, { requestType: "change-email-confirmation" });
    const url2 = `${ctx.context.baseURL}/verify-email?token=${token2}&callbackURL=${encodeURIComponent(ctx.body.callbackURL || "/")}`;
    await ctx.context.runInBackgroundOrAwait(canSendConfirmation({
      user: ctx.context.session.user,
      newEmail,
      url: url2,
      token: token2
    }, ctx.request));
    return ctx.json({ status: true });
  }
  if (!canSendVerification) {
    ctx.context.logger.error("Verification email isn't enabled.");
    throw APIError.fromStatus("BAD_REQUEST", { message: "Verification email isn't enabled" });
  }
  const token = await createEmailVerificationToken(ctx.context.secret, ctx.context.session.user.email, newEmail, ctx.context.options.emailVerification?.expiresIn, { requestType: "change-email-verification" });
  const url = `${ctx.context.baseURL}/verify-email?token=${token}&callbackURL=${encodeURIComponent(ctx.body.callbackURL || "/")}`;
  await ctx.context.runInBackgroundOrAwait(canSendVerification({
    user: {
      ...ctx.context.session.user,
      email: newEmail
    },
    url,
    token
  }, ctx.request));
  return ctx.json({ status: true });
});
const defuReplaceArrays = createDefu((obj, key, value) => {
  if (Array.isArray(obj[key]) && Array.isArray(value)) {
    obj[key] = value;
    return true;
  }
});
const hooksSourceWeakMap = /* @__PURE__ */ new WeakMap();
function getOperationId(endpoint, fallback) {
  const opts = endpoint.options;
  return opts?.operationId ?? opts?.metadata?.openapi?.operationId ?? fallback ?? endpoint.path ?? "/:virtual";
}
function mergeResponseHeaders(context, headers) {
  if (!headers) return;
  headers.forEach((value, key) => {
    if (!context.responseHeaders) context.responseHeaders = new Headers({ [key]: value });
    else if (key.toLowerCase() === "set-cookie") context.responseHeaders.append(key, value);
    else context.responseHeaders.set(key, value);
  });
}
function mergeAPIErrorHeaders(error2) {
  const ctxHeaders = error2[kAPIErrorHeaderSymbol];
  const errHeaders = error2.headers && error2.headers !== ctxHeaders ? new Headers(error2.headers) : null;
  if (!ctxHeaders && !errHeaders) return null;
  const headers = new Headers();
  ctxHeaders?.forEach((value, key) => {
    headers.append(key, value);
  });
  errHeaders?.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") headers.append(key, value);
    else headers.set(key, value);
  });
  return headers;
}
async function runBeforeHooks(context, hooks, endpoint, operationId) {
  let modifiedContext = {};
  for (const hook of hooks) {
    let matched = false;
    try {
      matched = hook.matcher(context);
    } catch (error2) {
      const hookSource2 = hooksSourceWeakMap.get(hook.handler) ?? "unknown";
      context.context.logger.error(`An error occurred during ${hookSource2} hook matcher execution:`, error2);
      throw new APIError("INTERNAL_SERVER_ERROR", { message: "An error occurred during hook matcher execution. Check the logs for more details." });
    }
    if (!matched) continue;
    const hookSource = hooksSourceWeakMap.get(hook.handler) ?? "unknown";
    const route = endpoint.path ?? "/:virtual";
    const result = await withSpan(`hook before ${route} ${hookSource}`, {
      [ATTR_HOOK_TYPE]: "before",
      [ATTR_HTTP_ROUTE]: route,
      [ATTR_CONTEXT]: hookSource,
      [ATTR_OPERATION_ID]: operationId
    }, () => hook.handler({
      ...context,
      returnHeaders: true
    })).catch((e) => {
      if (isAPIError(e) && shouldPublishLog(context.context.logger.level, "debug")) e.stack = e.errorStack;
      throw e;
    });
    mergeResponseHeaders(context.context, result?.headers);
    const hookReturn = result?.response;
    if (hookReturn && typeof hookReturn === "object") {
      if ("context" in hookReturn && typeof hookReturn.context === "object") {
        const { headers, ...rest } = hookReturn.context;
        if (headers instanceof Headers) if (modifiedContext.headers) headers.forEach((value, key) => {
          modifiedContext.headers?.set(key, value);
        });
        else modifiedContext.headers = headers;
        modifiedContext = defuReplaceArrays(rest, modifiedContext);
        continue;
      }
      return hookReturn;
    }
  }
  return { context: modifiedContext };
}
async function runAfterHooks(context, hooks, endpoint, operationId) {
  for (const hook of hooks) {
    if (!hook.matcher(context)) continue;
    const hookSource = hooksSourceWeakMap.get(hook.handler) ?? "unknown";
    const route = endpoint.path ?? "/:virtual";
    const result = await withSpan(`hook after ${route} ${hookSource}`, {
      [ATTR_HOOK_TYPE]: "after",
      [ATTR_HTTP_ROUTE]: route,
      [ATTR_CONTEXT]: hookSource,
      [ATTR_OPERATION_ID]: operationId
    }, () => hook.handler(context)).catch((e) => {
      if (isAPIError(e)) {
        if (shouldPublishLog(context.context.logger.level, "debug")) e.stack = e.errorStack;
        return {
          response: e,
          headers: mergeAPIErrorHeaders(e)
        };
      }
      throw e;
    });
    mergeResponseHeaders(context.context, result.headers);
    if (result.response !== void 0) context.context.returned = result.response;
  }
  return {
    response: context.context.returned,
    headers: context.context.responseHeaders
  };
}
function getHooks(authContext) {
  const plugins = authContext.options.plugins || [];
  const beforeHooks = [];
  const afterHooks = [];
  const beforeHookHandler = authContext.options.hooks?.before;
  if (beforeHookHandler) {
    hooksSourceWeakMap.set(beforeHookHandler, "user");
    beforeHooks.push({
      matcher: () => true,
      handler: beforeHookHandler
    });
  }
  const afterHookHandler = authContext.options.hooks?.after;
  if (afterHookHandler) {
    hooksSourceWeakMap.set(afterHookHandler, "user");
    afterHooks.push({
      matcher: () => true,
      handler: afterHookHandler
    });
  }
  const pluginBeforeHooks = plugins.flatMap((plugin) => (plugin.hooks?.before ?? []).map((h) => {
    hooksSourceWeakMap.set(h.handler, `plugin:${plugin.id}`);
    return h;
  }));
  const pluginAfterHooks = plugins.flatMap((plugin) => (plugin.hooks?.after ?? []).map((h) => {
    hooksSourceWeakMap.set(h.handler, `plugin:${plugin.id}`);
    return h;
  }));
  if (pluginBeforeHooks.length) beforeHooks.push(...pluginBeforeHooks);
  if (pluginAfterHooks.length) afterHooks.push(...pluginAfterHooks);
  return {
    beforeHooks,
    afterHooks
  };
}
async function dispatchAuthEndpoint(endpoint, input) {
  const operationId = input.operationId ?? getOperationId(endpoint);
  const route = endpoint.path ?? "/:virtual";
  const endpointMethod = endpoint.options?.method;
  const defaultMethod = Array.isArray(endpointMethod) ? endpointMethod[0] : endpointMethod;
  const methodName = input.method ?? input.request?.method ?? defaultMethod ?? "?";
  const shouldReturnResponse = input.asResponse ?? isRequestLike(input.request);
  let internalContext = {
    ...input,
    context: {
      ...input.context,
      returned: void 0,
      responseHeaders: void 0,
      session: input.context.session ?? null
    },
    path: endpoint.path,
    headers: input.headers ? new Headers(input.headers) : void 0
  };
  return withSpan(`${methodName} ${route}`, {
    [ATTR_HTTP_ROUTE]: route,
    [ATTR_OPERATION_ID]: operationId
  }, async () => runWithEndpointContext(internalContext, async () => {
    const { beforeHooks, afterHooks } = getHooks(internalContext.context);
    const before = await runBeforeHooks(internalContext, beforeHooks, endpoint, operationId);
    if ("context" in before && before.context && typeof before.context === "object") {
      const { headers, ...rest } = before.context;
      if (headers) {
        if (!internalContext.headers) internalContext.headers = new Headers();
        const requestHeaders = internalContext.headers;
        headers.forEach((value, key) => {
          requestHeaders.set(key, value);
        });
      }
      internalContext = defuReplaceArrays(rest, internalContext);
    } else if (before) {
      const responseHeaders = internalContext.context.responseHeaders;
      return shouldReturnResponse ? toResponse(before, { headers: responseHeaders }) : input.returnHeaders ? {
        headers: responseHeaders,
        response: before
      } : before;
    }
    internalContext.asResponse = false;
    internalContext.returnHeaders = true;
    internalContext.returnStatus = true;
    const result = await runWithEndpointContext(internalContext, () => withSpan(`handler ${route}`, {
      [ATTR_HTTP_ROUTE]: route,
      [ATTR_OPERATION_ID]: operationId
    }, () => endpoint(internalContext))).catch((e) => {
      if (isAPIError(e)) return {
        response: e,
        status: e.statusCode,
        headers: mergeAPIErrorHeaders(e)
      };
      throw e;
    });
    if (result instanceof Response) return result;
    internalContext.context.returned = result.response;
    internalContext.context.responseHeaders = result.headers ?? void 0;
    const after = await runAfterHooks(internalContext, afterHooks, endpoint, operationId);
    if (after.response !== void 0) result.response = after.response;
    result.headers = after.headers ?? result.headers;
    if (isAPIError(result.response) && shouldPublishLog(internalContext.context.logger.level, "debug")) result.response.stack = result.response.errorStack;
    if (isAPIError(result.response) && !shouldReturnResponse) {
      if (result.headers) Object.defineProperty(result.response, kAPIErrorHeaderSymbol, {
        enumerable: false,
        configurable: true,
        writable: false,
        value: result.headers
      });
      throw result.response;
    }
    return shouldReturnResponse ? toResponse(result.response, {
      headers: result.headers ?? void 0,
      status: result.status
    }) : input.returnHeaders ? input.returnStatus ? {
      headers: result.headers,
      response: result.response,
      status: result.status
    } : {
      headers: result.headers,
      response: result.response
    } : input.returnStatus ? {
      response: result.response,
      status: result.status
    } : result.response;
  }));
}
async function resolveDynamicContext(rawCtx, input) {
  if (rawCtx.baseURL) return rawCtx;
  const source = pickSource(input);
  const config = rawCtx.options.baseURL;
  const hasFallback = isDynamicBaseURLConfig(config) && Boolean(config.fallback);
  if (source === void 0 && !hasFallback) throw new APIError("INTERNAL_SERVER_ERROR", { message: "Dynamic baseURL could not be resolved for this direct auth.api call. Pass `headers: request.headers` (or `request`) to the call, or add `fallback` to your baseURL config." });
  try {
    return await resolveRequestContext(rawCtx, source, resolveDynamicTrustedProxyHeaders(rawCtx.options));
  } catch (err) {
    if (err instanceof BetterAuthError) throw new APIError("INTERNAL_SERVER_ERROR", { message: err.message });
    throw err;
  }
}
function toAuthEndpoints(endpoints, ctx) {
  const api = {};
  for (const [key, endpoint] of Object.entries(endpoints)) {
    api[key] = async (context) => {
      const operationId = getOperationId(endpoint, key);
      const run = async () => {
        const rawContext = await ctx;
        const authContext = isDynamicBaseURLConfig(rawContext.options.baseURL) ? await resolveDynamicContext(rawContext, context) : rawContext;
        return dispatchAuthEndpoint(endpoint, {
          ...context,
          context: authContext,
          operationId,
          asResponse: context?.asResponse ?? isRequestLike(context?.request)
        });
      };
      if (await hasRequestState()) return run();
      return runWithRequestState(/* @__PURE__ */ new WeakMap(), run);
    };
    api[key].path = endpoint.path;
    api[key].options = endpoint.options;
  }
  return api;
}
function checkEndpointConflicts(options, logger2) {
  const endpointRegistry = /* @__PURE__ */ new Map();
  options.plugins?.forEach((plugin) => {
    if (plugin.endpoints) {
      for (const [key, endpoint] of Object.entries(plugin.endpoints)) if (endpoint && "path" in endpoint && typeof endpoint.path === "string") {
        const path = endpoint.path;
        let methods = [];
        if (endpoint.options && "method" in endpoint.options) {
          if (Array.isArray(endpoint.options.method)) methods = endpoint.options.method;
          else if (typeof endpoint.options.method === "string") methods = [endpoint.options.method];
        }
        if (methods.length === 0) methods = ["*"];
        if (!endpointRegistry.has(path)) endpointRegistry.set(path, []);
        endpointRegistry.get(path).push({
          pluginId: plugin.id,
          endpointKey: key,
          methods
        });
      }
    }
  });
  const conflicts = [];
  for (const [path, entries] of endpointRegistry.entries()) if (entries.length > 1) {
    const methodMap = /* @__PURE__ */ new Map();
    let hasConflict = false;
    for (const entry of entries) for (const method of entry.methods) {
      if (!methodMap.has(method)) methodMap.set(method, []);
      methodMap.get(method).push(entry.pluginId);
      if (methodMap.get(method).length > 1) hasConflict = true;
      if (method === "*" && entries.length > 1) hasConflict = true;
      else if (method !== "*" && methodMap.has("*")) hasConflict = true;
    }
    if (hasConflict) {
      const uniquePlugins = [...new Set(entries.map((e) => e.pluginId))];
      const conflictingMethods = [];
      for (const [method, plugins] of methodMap.entries()) if (plugins.length > 1 || method === "*" && entries.length > 1 || method !== "*" && methodMap.has("*")) conflictingMethods.push(method);
      conflicts.push({
        path,
        plugins: uniquePlugins,
        conflictingMethods
      });
    }
  }
  if (conflicts.length > 0) {
    const conflictMessages = conflicts.map((conflict) => `  - "${conflict.path}" [${conflict.conflictingMethods.join(", ")}] used by plugins: ${conflict.plugins.join(", ")}`).join("\n");
    logger2.error(`Endpoint path conflicts detected! Multiple plugins are trying to use the same endpoint paths with conflicting HTTP methods:
${conflictMessages}

To resolve this, you can:
	1. Use only one of the conflicting plugins
	2. Configure the plugins to use different paths (if supported)
	3. Ensure plugins use different HTTP methods for the same path
`);
  }
}
function getEndpoints(ctx, options) {
  const pluginEndpoints = options.plugins?.reduce((acc, plugin) => {
    return {
      ...acc,
      ...plugin.endpoints
    };
  }, {}) ?? {};
  const middlewares = options.plugins?.map((plugin) => plugin.middlewares?.map((m) => {
    const middleware = (async (context) => {
      const authContext = await ctx;
      return withSpan(`middleware ${m.path} ${plugin.id}`, {
        [ATTR_HOOK_TYPE]: "middleware",
        [ATTR_HTTP_ROUTE]: m.path,
        [ATTR_CONTEXT]: `plugin:${plugin.id}`
      }, () => m.middleware({
        ...context,
        context: {
          ...authContext,
          ...context.context
        }
      }));
    });
    middleware.options = m.middleware.options;
    return {
      path: m.path,
      middleware
    };
  })).filter((plugin) => plugin !== void 0).flat() || [];
  return {
    api: toAuthEndpoints({
      signInSocial: signInSocial(),
      callbackOAuth,
      getSession: getSession(),
      signOut,
      signUpEmail: signUpEmail(),
      signInEmail: signInEmail(),
      resetPassword,
      verifyPassword,
      verifyEmail,
      sendVerificationEmail,
      changeEmail,
      changePassword,
      setPassword,
      updateSession: updateSession(),
      updateUser: updateUser(),
      deleteUser,
      requestPasswordReset,
      requestPasswordResetCallback,
      listSessions: listSessions(),
      revokeSession,
      revokeSessions,
      revokeOtherSessions,
      linkSocialAccount,
      listUserAccounts,
      deleteUserCallback,
      unlinkAccount,
      refreshToken,
      getAccessToken,
      accountInfo,
      ...pluginEndpoints,
      ok,
      error
    }, ctx),
    middlewares
  };
}
const router = (ctx, options) => {
  const { api, middlewares } = getEndpoints(ctx, options);
  const basePath = new URL(ctx.baseURL).pathname;
  return createRouter(api, {
    routerContext: ctx,
    openapi: { disabled: true },
    basePath,
    routerMiddleware: [{
      path: "/**",
      middleware: originCheckMiddleware
    }, ...middlewares],
    allowedMediaTypes: ["application/json"],
    skipTrailingSlashes: options.advanced?.skipTrailingSlashes ?? false,
    async onRequest(req) {
      const disabledPaths = ctx.options.disabledPaths || [];
      const normalizedPath = normalizePathname(req.url, basePath);
      if (disabledPaths.includes(normalizedPath)) return new Response("Not Found", { status: 404 });
      let currentRequest = req;
      const rateLimitResponse2 = await onRequestRateLimit(currentRequest, ctx);
      if (rateLimitResponse2) return rateLimitResponse2;
      for (const plugin of ctx.options.plugins || []) if (plugin.onRequest) {
        const response = await withSpan(`onRequest ${plugin.id}`, {
          [ATTR_HOOK_TYPE]: "onRequest",
          [ATTR_CONTEXT]: `plugin:${plugin.id}`
        }, () => plugin.onRequest(currentRequest, ctx));
        if (response && "response" in response) return response.response;
        if (response && "request" in response) currentRequest = response.request;
      }
      return currentRequest;
    },
    async onResponse(res, req) {
      for (const plugin of ctx.options.plugins || []) if (plugin.onResponse) {
        const response = await withSpan(`onResponse ${plugin.id}`, {
          [ATTR_HOOK_TYPE]: "onResponse",
          [ATTR_CONTEXT]: `plugin:${plugin.id}`,
          [ATTR_HTTP_RESPONSE_STATUS_CODE]: res.status
        }, () => plugin.onResponse(res, ctx));
        if (response) return response.response;
      }
      return res;
    },
    onError(e) {
      if (isAPIError(e) && e.status === "FOUND") return;
      if (options.onAPIError?.throw) throw e;
      if (options.onAPIError?.onError) {
        options.onAPIError.onError(e, ctx);
        return;
      }
      const optLogLevel = options.logger?.level;
      const log = optLogLevel === "error" || optLogLevel === "warn" || optLogLevel === "debug" ? logger : void 0;
      if (options.logger?.disabled !== true) {
        if (e && typeof e === "object" && "message" in e && typeof e.message === "string") {
          if (e.message.includes("no column") || e.message.includes("column") || e.message.includes("relation") || e.message.includes("table") || e.message.includes("does not exist")) {
            ctx.logger?.error(e.message);
            return;
          }
        }
        if (isAPIError(e)) {
          if (e.status === "INTERNAL_SERVER_ERROR") ctx.logger.error(e.status, e);
          log?.error(e.message);
        } else ctx.logger?.error(e && typeof e === "object" && "name" in e ? e.name : "", e);
      }
    }
  });
};
async function getBaseAdapter(options, handleDirectDatabase) {
  let adapter;
  if (!options.database) {
    const tables = getAuthTables(options);
    const memoryDB = Object.keys(tables).reduce((acc, key) => {
      acc[key] = [];
      return acc;
    }, {});
    const { memoryAdapter } = await import("@better-auth/memory-adapter");
    adapter = memoryAdapter(memoryDB)(options);
  } else if (typeof options.database === "function") adapter = options.database(options);
  else adapter = await handleDirectDatabase(options);
  if (!adapter.transaction) {
    logger.warn("Adapter does not correctly implement transaction function, patching it automatically. Please update your adapter implementation.");
    adapter.transaction = async (cb) => {
      return cb(adapter);
    };
  }
  return adapter;
}
async function getAdapter(options) {
  return getBaseAdapter(options, async (opts) => {
    const { createKyselyAdapter: createKyselyAdapter2 } = await import("./index-Bnn1A655.mjs").then((n) => n.e);
    const { kysely, databaseType, transaction } = await createKyselyAdapter2(opts);
    if (!kysely) throw new BetterAuthError("Failed to initialize database adapter");
    const { kyselyAdapter } = await import("./index-Bnn1A655.mjs").then((n) => n.e);
    return kyselyAdapter(kysely, {
      type: databaseType || "sqlite",
      debugLogs: opts.database && "debugLogs" in opts.database ? opts.database.debugLogs : false,
      transaction
    })(opts);
  });
}
function getSchema(config) {
  const { indexesByTable, tables } = getAuthTablesWithResolvedIndexes(config);
  const schema2 = {};
  for (const key in tables) {
    const table = tables[key];
    const fields = table.fields;
    const actualFields = {};
    Object.entries(fields).forEach(([key2, field]) => {
      actualFields[field.fieldName || key2] = field;
      if (field.references) {
        const refTable = tables[field.references.model];
        if (refTable) actualFields[field.fieldName || key2].references = {
          ...field.references,
          model: refTable.modelName,
          field: field.references.field
        };
      }
    });
    if (schema2[table.modelName]) {
      schema2[table.modelName].fields = {
        ...schema2[table.modelName].fields,
        ...actualFields
      };
      if (table.disableMigrations) schema2[table.modelName].disableMigrations = true;
      continue;
    }
    schema2[table.modelName] = {
      fields: actualFields,
      order: table.order || Infinity,
      disableMigrations: table.disableMigrations
    };
  }
  for (const [tableName, indexes] of indexesByTable) if (schema2[tableName]) schema2[tableName].indexes = indexes;
  return schema2;
}
const map = {
  postgres: {
    string: [
      "character varying",
      "varchar",
      "text",
      "uuid"
    ],
    number: [
      "int4",
      "integer",
      "bigint",
      "smallint",
      "numeric",
      "real",
      "double precision"
    ],
    boolean: ["bool", "boolean"],
    date: [
      "timestamptz",
      "timestamp",
      "date"
    ],
    json: ["json", "jsonb"]
  },
  mysql: {
    string: [
      "varchar",
      "text",
      "uuid"
    ],
    number: [
      "integer",
      "int",
      "bigint",
      "smallint",
      "decimal",
      "float",
      "double"
    ],
    boolean: ["boolean", "tinyint"],
    date: [
      "timestamp",
      "datetime",
      "date"
    ],
    json: ["json"]
  },
  sqlite: {
    string: ["TEXT"],
    number: [
      "INTEGER",
      "REAL",
      "BIGINT"
    ],
    boolean: ["INTEGER", "BOOLEAN"],
    date: ["DATE", "INTEGER"],
    json: ["TEXT"]
  },
  mssql: {
    string: [
      "varchar",
      "nvarchar",
      "uniqueidentifier"
    ],
    number: [
      "int",
      "bigint",
      "smallint",
      "decimal",
      "float",
      "double"
    ],
    boolean: ["bit", "smallint"],
    date: [
      "datetime2",
      "date",
      "datetime"
    ],
    json: ["varchar", "nvarchar"]
  }
};
function createDatabaseIndexKey(tableName, indexName) {
  return `${getPortableDatabaseIdentifierKey(tableName)}\0${getPortableDatabaseIdentifierKey(indexName)}`;
}
function createDatabaseColumnKey(tableName, columnName) {
  return `${tableName}\0${columnName}`;
}
function databaseIndexMatches(existing, configured) {
  return existing.unique === (configured.unique ?? false) && existing.validFullColumns && existing.columns.length === configured.columns.length && existing.columns.every((column, position) => column === configured.columns[position]);
}
function databaseValueIsTrue(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return value === "1" || value?.toLowerCase() === "true" || value === "t";
}
function toDatabaseIndexMap(indexes) {
  return new Map(indexes.map((index) => {
    const columns = [...index.columns].sort((left, right) => left.position - right.position);
    return [createDatabaseIndexKey(index.table, index.name), {
      columns: columns.flatMap((column) => column.name === null ? [] : [column.name]),
      name: index.name,
      table: index.table,
      unique: index.unique,
      validFullColumns: index.valid && !index.partial && columns.length > 0 && columns.every((column) => column.name !== null && column.fullLength)
    }];
  }));
}
async function getDatabaseIndexMap(db2, dbType, schemaName, tableNames, introspectIndexes) {
  if (introspectIndexes) return toDatabaseIndexMap(await introspectIndexes(tableNames));
  let rows;
  if (dbType === "sqlite") rows = (await sql`
				SELECT
					tables.name AS "tableName",
					index_list.name AS "indexName",
					index_info.name AS "columnName",
					index_list."unique" AS "isUnique",
					index_list.partial AS "isPartial",
					index_info.seqno AS "columnPosition"
				FROM sqlite_master AS tables
				INNER JOIN pragma_index_list(tables.name) AS index_list
				INNER JOIN pragma_index_info(index_list.name) AS index_info
				WHERE tables.type = 'table'
			`.execute(db2)).rows;
  else if (dbType === "postgres") rows = (await sql`
				SELECT
					table_class.relname AS "tableName",
					index_class.relname AS "indexName",
					index_attribute.attname AS "columnName",
					index_data.indisunique AS "isUnique",
					index_data.indisvalid AS "isValid",
					(index_data.indpred IS NOT NULL) AS "isPartial",
					index_column.ordinality AS "columnPosition"
				FROM pg_class AS table_class
				INNER JOIN pg_namespace AS table_namespace
					ON table_namespace.oid = table_class.relnamespace
				INNER JOIN pg_index AS index_data
					ON index_data.indrelid = table_class.oid
				INNER JOIN pg_class AS index_class
					ON index_class.oid = index_data.indexrelid
				INNER JOIN LATERAL unnest(index_data.indkey)
					WITH ORDINALITY AS index_column(attribute_number, ordinality)
					ON TRUE
				LEFT JOIN pg_attribute AS index_attribute
					ON index_attribute.attrelid = table_class.oid
					AND index_attribute.attnum = index_column.attribute_number
				WHERE table_namespace.nspname = ${schemaName}
					AND table_class.relkind = 'r'
					AND index_column.ordinality <= index_data.indnkeyatts
			`.execute(db2)).rows;
  else if (dbType === "mysql") rows = (await sql`
				SELECT
					table_name AS tableName,
					index_name AS indexName,
					column_name AS columnName,
					non_unique AS nonUnique,
					seq_in_index AS columnPosition,
					sub_part AS prefixLength,
					COALESCE(LOWER(comment) = 'disabled', FALSE) AS isDisabled
				FROM information_schema.statistics
				WHERE table_schema = DATABASE()
			`.execute(db2)).rows;
  else rows = (await sql`
				SELECT
					tables.name AS "tableName",
					indexes.name AS "indexName",
					columns.name AS "columnName",
					indexes.is_unique AS "isUnique",
					indexes.is_disabled AS "isDisabled",
					indexes.is_hypothetical AS "isHypothetical",
					indexes.has_filter AS "isPartial",
					index_columns.key_ordinal AS "columnPosition"
				FROM sys.indexes AS indexes
				INNER JOIN sys.tables AS tables
					ON indexes.object_id = tables.object_id
				INNER JOIN sys.schemas AS table_schemas
					ON table_schemas.schema_id = tables.schema_id
				INNER JOIN sys.index_columns AS index_columns
					ON index_columns.object_id = indexes.object_id
					AND index_columns.index_id = indexes.index_id
				INNER JOIN sys.columns AS columns
					ON columns.object_id = index_columns.object_id
					AND columns.column_id = index_columns.column_id
				WHERE table_schemas.name = ${schemaName}
					AND indexes.name IS NOT NULL
					AND index_columns.key_ordinal > 0
			`.execute(db2)).rows;
  const indexMetadata = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const table = row.tableName ?? row.table_name ?? row.TABLE_NAME ?? row.tablename ?? row.tbl_name;
    const name = row.indexName ?? row.index_name ?? row.INDEX_NAME ?? row.name;
    const column = row.columnName ?? row.column_name ?? row.COLUMN_NAME;
    if (!table || !name) continue;
    const key = createDatabaseIndexKey(table, name);
    const nonUnique = row.nonUnique ?? row.non_unique ?? row.NON_UNIQUE;
    const unique = nonUnique === void 0 ? databaseValueIsTrue(row.isUnique ?? row.is_unique) : !databaseValueIsTrue(nonUnique);
    const position = Number(row.columnPosition ?? row.column_position ?? row.keyOrdinal ?? row.key_ordinal ?? row.ordinality ?? row.seqInIndex ?? row.seq_in_index ?? row.SEQ_IN_INDEX ?? row.seqno ?? 0);
    const indexColumn = {
      fullLength: column !== void 0 && column !== null && (row.prefixLength === void 0 || row.prefixLength === null),
      name: column ?? null,
      position
    };
    const partial = databaseValueIsTrue(row.isPartial);
    const valid = !databaseValueIsTrue(row.isDisabled) && !databaseValueIsTrue(row.isHypothetical) && (row.isValid === void 0 || databaseValueIsTrue(row.isValid));
    const existing = indexMetadata.get(key);
    indexMetadata.set(key, existing ? {
      ...existing,
      columns: [...existing.columns, indexColumn],
      partial: existing.partial || partial,
      valid: existing.valid && valid
    } : {
      columns: [indexColumn],
      name,
      partial,
      table,
      unique,
      valid
    });
  }
  return toDatabaseIndexMap([...indexMetadata.values()]);
}
async function getDatabaseColumnBounds(db2, dbType, schemaName) {
  if (dbType !== "mysql" && dbType !== "mssql") return /* @__PURE__ */ new Map();
  let rows;
  if (dbType === "mysql") rows = (await sql`
				SELECT
					table_name AS tableName,
					column_name AS columnName,
					data_type AS dataType,
					character_maximum_length AS characterMaximumLength
				FROM information_schema.columns
				WHERE table_schema = DATABASE()
			`.execute(db2)).rows;
  else rows = (await sql`
				SELECT
					tables.name AS "tableName",
					columns.name AS "columnName",
					types.name AS "dataType",
					columns.max_length AS "maxLength"
				FROM sys.columns AS columns
				INNER JOIN sys.tables AS tables
					ON tables.object_id = columns.object_id
				INNER JOIN sys.schemas AS table_schemas
					ON table_schemas.schema_id = tables.schema_id
				INNER JOIN sys.types AS types
					ON types.user_type_id = columns.user_type_id
				WHERE table_schemas.name = ${schemaName}
			`.execute(db2)).rows;
  return new Map(rows.flatMap((row) => {
    const table = row.tableName ?? row.TABLE_NAME;
    const column = row.columnName ?? row.COLUMN_NAME;
    const dataType = (row.dataType ?? row.DATA_TYPE)?.toLowerCase();
    if (!table || !column || !dataType) return [];
    if (dbType === "mysql") {
      const characterLength = row.characterMaximumLength ?? row.CHARACTER_MAXIMUM_LENGTH;
      const maxIndexBytes = characterLength === null || characterLength === void 0 ? null : Number(characterLength) * 4;
      return [[createDatabaseColumnKey(table, column), { maxIndexBytes }]];
    }
    const maxLength = Number(row.maxLength ?? -1);
    return [[createDatabaseColumnKey(table, column), { maxIndexBytes: maxLength < 0 ? null : maxLength }]];
  }));
}
function assertExistingTableIndexFits({ columnBounds, dbType, existingColumns, fields, indexes, index, table }) {
  const byteBudget = dbType === "mysql" ? 3072 : 1700;
  let requiredBytes = 0;
  for (const column of index.columns) {
    const field = fields[column];
    if (!field) continue;
    if (field.type === "string" || Array.isArray(field.type)) {
      if (!existingColumns.has(column)) {
        const generatedLength = getDatabaseIndexStringLength({
          columnName: column,
          dialect: dbType,
          fields,
          indexes
        });
        requiredBytes += (generatedLength ?? 0) * (dbType === "mysql" ? 4 : 1);
        continue;
      }
      const bound = columnBounds.get(createDatabaseColumnKey(table, column));
      if (!bound?.maxIndexBytes) throw new BetterAuthError(`Cannot create database index "${index.name}" on existing table "${table}" because column "${column}" is not bounded for ${dbType === "mysql" ? "MySQL" : "SQL Server"}. Change it to a bounded string column, resolve oversized values, then run the migration again.`);
      requiredBytes += bound.maxIndexBytes;
    } else requiredBytes += 16;
  }
  if (requiredBytes > byteBudget) throw new BetterAuthError(`Cannot create database index "${index.name}" on existing table "${table}" because its columns can exceed ${dbType === "mysql" ? "MySQL" : "SQL Server"}'s ${byteBudget}-byte index-key limit. Bound the indexed string columns to the generated schema lengths, resolve oversized values, then run the migration again.`);
}
const columnBackfillGuideUrl = "https://better-auth.com/docs/guides/1-7-upgrade-guide#account-identity-is-scoped-by-issuer";
var UnsafeMigrationError = class extends BetterAuthError {
};
function hasTimestampColumnDefault(field, dbType) {
  return field.type === "date" && typeof field.defaultValue === "function" && (dbType === "postgres" || dbType === "mysql" || dbType === "mssql");
}
function hasStaticColumnDefault(field) {
  return !(field.unique && field.required === false) && (field.type === "string" || field.type === "number" || field.type === "boolean") && field.defaultValue !== void 0 && field.defaultValue !== null && typeof field.defaultValue !== "function";
}
async function tableHasRows(db2, dbType, table) {
  const probe = db2.selectFrom(table).select(sql`1`.as("present"));
  return (await (dbType === "mssql" ? probe.top(1) : probe.limit(1)).execute()).length > 0;
}
function matchType(columnDataType, fieldType, dbType) {
  function normalize(type) {
    return type.toLowerCase().split("(")[0].trim();
  }
  if (fieldType === "string[]" || fieldType === "number[]") return columnDataType.toLowerCase().includes("json");
  const types = map[dbType];
  return (Array.isArray(fieldType) ? types["string"].map((t) => t.toLowerCase()) : types[fieldType].map((t) => t.toLowerCase())).includes(normalize(columnDataType));
}
async function getPostgresSchema(db2) {
  try {
    const result = await sql`SHOW search_path`.execute(db2);
    const searchPath = result.rows[0]?.search_path ?? result.rows[0]?.searchPath;
    if (searchPath) return searchPath.split(",").map((s) => s.trim()).map((s) => s.replace(/^["']|["']$/g, "")).filter((s) => !s.startsWith("$") && !s.startsWith("\\$"))[0] || "public";
  } catch {
  }
  return "public";
}
async function getMssqlSchema(db2) {
  try {
    return (await sql`
			SELECT SCHEMA_NAME() AS "schemaName"
		`.execute(db2)).rows[0]?.schemaName || "dbo";
  } catch {
    return "dbo";
  }
}
async function getMigrations(config, { throwOnUnsafe = true } = {}) {
  const betterAuthSchema = getSchema(config);
  const authTables = getAuthTables(config);
  const accountIssuer = authTables.account && {
    table: authTables.account.modelName,
    column: authTables.account.fields.issuer?.fieldName || "issuer"
  };
  const isAccountIssuerColumn = (table, column) => table === accountIssuer?.table && column === accountIssuer.column;
  const logger2 = createLogger(config.logger);
  const unsafeChanges = [];
  const reportUnsafeChange = (message) => {
    if (throwOnUnsafe) throw new UnsafeMigrationError(message);
    unsafeChanges.push(message);
  };
  let { kysely: db2, databaseType: dbType, introspectIndexes } = await createKyselyAdapter(config);
  if (!dbType) {
    logger2.warn("Could not determine database type, defaulting to sqlite. Please provide a type in the database options to avoid this.");
    dbType = "sqlite";
  }
  if (!db2) {
    logger2.error("Only kysely adapter is supported for migrations. You can use `generate` command to generate the schema, if you're using a different adapter.");
    process.exit(1);
  }
  let currentSchema = dbType === "mssql" ? await getMssqlSchema(db2) : "public";
  if (dbType === "postgres") {
    currentSchema = await getPostgresSchema(db2);
    logger2.debug(`PostgreSQL migration: Using schema '${currentSchema}' (from search_path)`);
    try {
      const schemaCheck = await sql`
				SELECT schema_name
				FROM information_schema.schemata
				WHERE schema_name = ${currentSchema}
			`.execute(db2);
      if (!(schemaCheck.rows[0]?.schema_name ?? schemaCheck.rows[0]?.schemaName)) logger2.warn(`Schema '${currentSchema}' does not exist. Tables will be inspected from available schemas. Consider creating the schema first or checking your database configuration.`);
    } catch (error2) {
      logger2.debug(`Could not verify schema existence: ${error2 instanceof Error ? error2.message : String(error2)}`);
    }
  } else if (dbType === "mssql") logger2.debug(`SQL Server migration: Using schema '${currentSchema}' (from the current user's default schema)`);
  const allTableMetadata = await db2.introspection.getTables();
  const databaseIndexMap = await getDatabaseIndexMap(db2, dbType, currentSchema, allTableMetadata.map((table) => table.name), introspectIndexes);
  const databaseColumnBounds = await getDatabaseColumnBounds(db2, dbType, currentSchema);
  let tableMetadata = allTableMetadata;
  if (dbType === "postgres") try {
    const tablesInSchema = await sql`
				SELECT table_name
				FROM information_schema.tables
				WHERE table_schema = ${currentSchema}
				AND table_type = 'BASE TABLE'
			`.execute(db2);
    const tableNamesInSchema = new Set(tablesInSchema.rows.map((row) => row.table_name ?? row.tableName));
    tableMetadata = allTableMetadata.filter((table) => table.schema === currentSchema && tableNamesInSchema.has(table.name));
    logger2.debug(`Found ${tableMetadata.length} table(s) in schema '${currentSchema}': ${tableMetadata.map((t) => t.name).join(", ") || "(none)"}`);
  } catch (error2) {
    logger2.warn(`Could not filter tables by schema. Using all discovered tables. Error: ${error2 instanceof Error ? error2.message : String(error2)}`);
  }
  else if (dbType === "mssql") tableMetadata = allTableMetadata.filter((table) => table.schema === currentSchema);
  const toBeCreated = [];
  const toBeAdded = [];
  const toBeAddedIndexes = [];
  const plannedIndexes = /* @__PURE__ */ new Map();
  for (const [key, value] of Object.entries(betterAuthSchema)) {
    if (value.disableMigrations) continue;
    const table = tableMetadata.find((table2) => table2.name === key);
    for (const index of value.indexes ?? []) {
      const name = index.name;
      const indexKey = createDatabaseIndexKey(key, name);
      const existingIndex = databaseIndexMap.get(indexKey);
      if (existingIndex) {
        if (!databaseIndexMatches(existingIndex, index)) throw new BetterAuthError(`Database index "${name}" on table "${key}" does not match the configured fields and uniqueness. Rename or replace the existing index, then run the migration again.`);
        continue;
      }
      if (dbType === "sqlite" || dbType === "postgres") {
        const indexOnAnotherTable = [...databaseIndexMap.values()].find((databaseIndex) => getPortableDatabaseIdentifierKey(databaseIndex.name) === getPortableDatabaseIdentifierKey(name) && getPortableDatabaseIdentifierKey(databaseIndex.table) !== getPortableDatabaseIdentifierKey(key));
        if (indexOnAnotherTable) throw new BetterAuthError(`Database index name "${name}" is already used by table "${indexOnAnotherTable.table}". Index names must be unique across the schema.`);
      }
      const plannedIndex = plannedIndexes.get(indexKey);
      if (plannedIndex) {
        if (!databaseIndexMatches({
          columns: plannedIndex.columns,
          name: plannedIndex.name,
          unique: plannedIndex.unique ?? false,
          validFullColumns: true
        }, index)) throw new BetterAuthError(`Database index name "${name}" identifies more than one index on table "${key}".`);
        continue;
      }
      if (table && (dbType === "mysql" || dbType === "mssql")) assertExistingTableIndexFits({
        columnBounds: databaseColumnBounds,
        dbType,
        existingColumns: new Set(table.columns.map((column) => column.name)),
        fields: value.fields,
        index,
        indexes: value.indexes ?? [],
        table: key
      });
      plannedIndexes.set(indexKey, index);
      toBeAddedIndexes.push({
        table: key,
        index,
        name
      });
    }
    if (!table) {
      const tIndex = toBeCreated.findIndex((t) => t.table === key);
      const tableData = {
        table: key,
        fields: value.fields,
        order: value.order || Infinity
      };
      const insertIndex = toBeCreated.findIndex((t) => (t.order || Infinity) > tableData.order);
      if (insertIndex === -1) if (tIndex === -1) toBeCreated.push(tableData);
      else toBeCreated[tIndex].fields = {
        ...toBeCreated[tIndex].fields,
        ...value.fields
      };
      else toBeCreated.splice(insertIndex, 0, tableData);
      continue;
    }
    const toBeAddedFields = {};
    for (const [fieldName, field] of Object.entries(value.fields)) {
      const column = table.columns.find((c) => c.name === fieldName);
      if (!column) {
        toBeAddedFields[fieldName] = field;
        continue;
      }
      if (field.required !== false && column.isNullable) logger2.warn(`Column "${fieldName}" on table "${key}" stays nullable while the schema declares the field required, so existing rows can still hold null. Backfill every row for this column and enforce NOT NULL to remove the drift.`);
      if (matchType(column.dataType, field.type, dbType)) continue;
      else logger2.warn(`Field ${fieldName} in table ${key} has a different type in the database. Expected ${field.type} but got ${column.dataType}.`);
    }
    if (Object.keys(toBeAddedFields).length > 0) toBeAdded.push({
      table: key,
      fields: toBeAddedFields,
      order: value.order || Infinity
    });
  }
  const migrations = [];
  const useUUIDs = config.advanced?.database?.generateId === "uuid";
  const useNumberId = config.advanced?.database?.generateId === "serial";
  function getType(field, fieldName, tableIndexStringLength) {
    const type = field.type;
    const provider = dbType || "sqlite";
    const typeMap = {
      string: {
        sqlite: "text",
        postgres: "text",
        mysql: tableIndexStringLength ? `varchar(${tableIndexStringLength})` : field.unique ? "varchar(255)" : field.references ? "varchar(36)" : field.sortable ? "varchar(255)" : field.index ? "varchar(255)" : "text",
        mssql: tableIndexStringLength ? `varchar(${tableIndexStringLength})` : field.unique || field.sortable ? "varchar(255)" : field.references ? "varchar(36)" : "varchar(8000)"
      },
      boolean: {
        sqlite: "integer",
        postgres: "boolean",
        mysql: "boolean",
        mssql: "smallint"
      },
      number: {
        sqlite: field.bigint ? "bigint" : "integer",
        postgres: field.bigint ? "bigint" : "integer",
        mysql: field.bigint ? "bigint" : "integer",
        mssql: field.bigint ? "bigint" : "integer"
      },
      date: {
        sqlite: "date",
        postgres: "timestamptz",
        mysql: "timestamp(3)",
        mssql: sql`datetime2(3)`
      },
      json: {
        sqlite: "text",
        postgres: "jsonb",
        mysql: "json",
        mssql: "varchar(8000)"
      },
      id: {
        postgres: useNumberId ? sql`integer GENERATED BY DEFAULT AS IDENTITY` : useUUIDs ? "uuid" : "text",
        mysql: useNumberId ? "integer" : useUUIDs ? "varchar(36)" : "varchar(36)",
        mssql: useNumberId ? "integer" : useUUIDs ? "varchar(36)" : "varchar(36)",
        sqlite: useNumberId ? "integer" : "text"
      },
      foreignKeyId: {
        postgres: useNumberId ? "integer" : useUUIDs ? "uuid" : "text",
        mysql: useNumberId ? "integer" : useUUIDs ? "varchar(36)" : "varchar(36)",
        mssql: useNumberId ? "integer" : useUUIDs ? "varchar(36)" : "varchar(36)",
        sqlite: useNumberId ? "integer" : "text"
      },
      "string[]": {
        sqlite: "text",
        postgres: "jsonb",
        mysql: "json",
        mssql: "varchar(8000)"
      },
      "number[]": {
        sqlite: "text",
        postgres: "jsonb",
        mysql: "json",
        mssql: "varchar(8000)"
      }
    };
    if (fieldName === "id" || field.references?.field === "id") {
      if (fieldName === "id") return typeMap.id[provider];
      return typeMap.foreignKeyId[provider];
    }
    if (Array.isArray(type)) return "text";
    if (!(type in typeMap)) throw new Error(`Unsupported field type '${String(type)}' for field '${fieldName}'. Allowed types are: string, number, boolean, date, string[], number[]. If you need to store structured data, store it as a JSON string (type: "string") or split it into primitive fields. See https://better-auth.com/docs/advanced/schema#additional-fields`);
    return typeMap[type][provider];
  }
  const getModelName = initGetModelName({
    schema: authTables,
    usePlural: false
  });
  const getFieldName = initGetFieldName({
    schema: authTables,
    usePlural: false
  });
  function getReferencePath(model, field) {
    try {
      return `${getModelName(model)}.${getFieldName({
        model,
        field
      })}`;
    } catch {
      return `${model}.${field}`;
    }
  }
  const deferredIndexes = [];
  const getTableIndexStringLength = (tableName, fieldName) => {
    if (dbType !== "mysql" && dbType !== "mssql") return void 0;
    const table = betterAuthSchema[tableName];
    if (!table) return void 0;
    return getDatabaseIndexStringLength({
      columnName: fieldName,
      dialect: dbType,
      fields: table.fields,
      indexes: table.indexes ?? []
    });
  };
  if (toBeAdded.length) {
    const populatedTables = /* @__PURE__ */ new Map();
    for (const table of toBeAdded) for (const [fieldName, field] of Object.entries(table.fields)) {
      const timestampDefault = hasTimestampColumnDefault(field, dbType);
      const staticDefault = hasStaticColumnDefault(field);
      if (field.required !== false && !timestampDefault && !staticDefault) {
        let populated = populatedTables.get(table.table);
        if (populated === void 0) {
          populated = await tableHasRows(db2, dbType, table.table);
          populatedTables.set(table.table, populated);
        }
        if (populated) {
          const textDetail = field.type === "string" ? " For a text column, every existing row ends up with the same empty string." : "";
          const guideLink = isAccountIssuerColumn(table.table, fieldName) ? ` See ${columnBackfillGuideUrl}` : "";
          reportUnsafeChange(`Cannot add required column "${fieldName}" to populated table "${table.table}": the schema declares no default value, so existing rows have no value to backfill. MySQL accepts this statement instead of rejecting it and fills every existing row with an implicit default for the column type, reporting a successful migration over corrupted data.${textDetail} Add the column as nullable, backfill a correct value for every row, then make it NOT NULL.${guideLink}`);
        }
      }
      const type = getType(field, fieldName, getTableIndexStringLength(table.table, fieldName));
      const builder = db2.schema.alterTable(table.table);
      if (field.index || field.unique) {
        const indexName = getDatabaseFieldIndexName(table.table, fieldName, field.unique ?? false);
        let indexBuilder = db2.schema.createIndex(indexName).on(table.table).columns([fieldName]);
        if (field.unique) {
          indexBuilder = indexBuilder.unique();
          if (field.required === false && dbType === "mssql") indexBuilder = indexBuilder.where(fieldName, "is not", null);
          if (field.required !== false && field.defaultValue !== void 0 && field.defaultValue !== null && typeof field.defaultValue !== "function") logger2.warn(`Adding unique column "${fieldName}" to existing table "${table.table}" backfills every existing row with its default value. If the table has more than one row, creating the unique index "${indexName}" will fail; backfill distinct values manually, then re-run the migration or create the index yourself.`);
        }
        deferredIndexes.push(indexBuilder);
      }
      const built = builder.addColumn(fieldName, type, (col) => {
        col = field.required !== false ? col.notNull() : col;
        if (field.references) col = col.references(getReferencePath(field.references.model, field.references.field)).onDelete(field.references.onDelete || "cascade");
        if (timestampDefault) if (dbType === "mysql") col = col.defaultTo(sql`CURRENT_TIMESTAMP(3)`);
        else col = col.defaultTo(sql`CURRENT_TIMESTAMP`);
        else if (staticDefault) col = col.defaultTo(typeof field.defaultValue === "boolean" && (dbType === "sqlite" || dbType === "mssql") ? field.defaultValue ? 1 : 0 : field.defaultValue);
        return col;
      });
      migrations.push(built);
    }
  }
  if (toBeCreated.length) for (const table of toBeCreated) {
    const idType = getType({ type: useNumberId ? "number" : "string" }, "id");
    let dbT = db2.schema.createTable(table.table).addColumn("id", idType, (col) => {
      if (useNumberId) {
        if (dbType === "postgres") return col.primaryKey().notNull();
        else if (dbType === "sqlite") return col.primaryKey().notNull();
        else if (dbType === "mssql") return col.identity().primaryKey().notNull();
        return col.autoIncrement().primaryKey().notNull();
      }
      if (useUUIDs) {
        if (dbType === "postgres") return col.primaryKey().defaultTo(sql`pg_catalog.gen_random_uuid()`).notNull();
        return col.primaryKey().notNull();
      }
      return col.primaryKey().notNull();
    });
    for (const [fieldName, field] of Object.entries(table.fields)) {
      const type = getType(field, fieldName, getTableIndexStringLength(table.table, fieldName));
      dbT = dbT.addColumn(fieldName, type, (col) => {
        col = field.required !== false ? col.notNull() : col;
        if (field.references) col = col.references(getReferencePath(field.references.model, field.references.field)).onDelete(field.references.onDelete || "cascade");
        if (field.unique) col = col.unique();
        if (field.type === "date" && typeof field.defaultValue === "function" && (dbType === "postgres" || dbType === "mysql" || dbType === "mssql")) if (dbType === "mysql") col = col.defaultTo(sql`CURRENT_TIMESTAMP(3)`);
        else col = col.defaultTo(sql`CURRENT_TIMESTAMP`);
        return col;
      });
      if (field.index && !field.unique) {
        const builder = db2.schema.createIndex(getDatabaseFieldIndexName(table.table, fieldName, false)).on(table.table).columns([fieldName]);
        deferredIndexes.push(builder);
      }
    }
    migrations.push(dbT);
  }
  for (const { table, index, name } of toBeAddedIndexes) {
    let builder = db2.schema.createIndex(name).on(table).columns([...index.columns]);
    if (index.unique) builder = builder.unique();
    deferredIndexes.push(builder);
  }
  for (const index of deferredIndexes) migrations.push(index);
  async function runMigrations() {
    for (const migration of migrations) await migration.execute();
  }
  async function compileMigrations() {
    return migrations.map((m) => m.compile().sql).join(";\n\n") + ";";
  }
  return {
    toBeCreated,
    toBeAdded,
    toBeAddedIndexes,
    unsafeChanges,
    runMigrations,
    compileMigrations
  };
}
const DEFAULT_SECRET = "better-auth-secret-12345678901234567890";
function estimateEntropy$1(str) {
  const unique = new Set(str).size;
  if (unique === 0) return 0;
  return Math.log2(Math.pow(unique, str.length));
}
function parseSecretsEnv(envValue) {
  if (!envValue) return null;
  return envValue.split(",").map((entry) => {
    entry = entry.trim();
    const colonIdx = entry.indexOf(":");
    if (colonIdx === -1) throw new BetterAuthError(`Invalid BETTER_AUTH_SECRETS entry: "${entry}". Expected format: "<version>:<secret>"`);
    const version = parseInt(entry.slice(0, colonIdx), 10);
    if (!Number.isInteger(version) || version < 0) throw new BetterAuthError(`Invalid version in BETTER_AUTH_SECRETS: "${entry.slice(0, colonIdx)}". Version must be a non-negative integer.`);
    const value = entry.slice(colonIdx + 1).trim();
    if (!value) throw new BetterAuthError(`Empty secret value for version ${version} in BETTER_AUTH_SECRETS.`);
    return {
      version,
      value
    };
  });
}
function validateSecretsArray(secrets, logger2) {
  if (secrets.length === 0) throw new BetterAuthError("`secrets` array must contain at least one entry.");
  const seen = /* @__PURE__ */ new Set();
  for (const s of secrets) {
    const version = parseInt(String(s.version), 10);
    if (!Number.isInteger(version) || version < 0 || String(version) !== String(s.version).trim()) throw new BetterAuthError(`Invalid version ${s.version} in \`secrets\`. Version must be a non-negative integer.`);
    if (!s.value) throw new BetterAuthError(`Empty secret value for version ${version} in \`secrets\`.`);
    if (seen.has(version)) throw new BetterAuthError(`Duplicate version ${version} in \`secrets\`. Each version must be unique.`);
    seen.add(version);
  }
  const current = secrets[0];
  if (current.value.length < 32) logger2.warn(`[better-auth] Warning: the current secret (version ${current.version}) should be at least 32 characters long for adequate security.`);
  if (estimateEntropy$1(current.value) < 120) logger2.warn("[better-auth] Warning: the current secret appears low-entropy. Use a randomly generated secret for production.");
}
function buildSecretConfig(secrets, legacySecret) {
  const keys = /* @__PURE__ */ new Map();
  for (const s of secrets) keys.set(parseInt(String(s.version), 10), s.value);
  return {
    keys,
    currentVersion: parseInt(String(secrets[0].version), 10),
    legacySecret: legacySecret && legacySecret !== "better-auth-secret-12345678901234567890" ? legacySecret : void 0
  };
}
function estimateEntropy(str) {
  const unique = new Set(str).size;
  if (unique === 0) return 0;
  return Math.log2(Math.pow(unique, str.length));
}
function validateSecret(secret, logger2) {
  const isDefaultSecret = secret === DEFAULT_SECRET;
  if (isTest()) return;
  if (isDefaultSecret && isProduction) throw new BetterAuthError("You are using the default secret. Please set `BETTER_AUTH_SECRET` in your environment variables or pass `secret` in your auth config.");
  if (!secret) throw new BetterAuthError("BETTER_AUTH_SECRET is missing. Set it in your environment or pass `secret` to betterAuth({ secret }).");
  if (secret.length < 32) logger2.warn(`[better-auth] Warning: your BETTER_AUTH_SECRET should be at least 32 characters long for adequate security. Generate one with \`npx auth secret\` or \`openssl rand -base64 32\`.`);
  if (estimateEntropy(secret) < 120) logger2.warn("[better-auth] Warning: your BETTER_AUTH_SECRET appears low-entropy. Use a randomly generated secret for production.");
}
async function createAuthContext(adapter, options, getDatabaseType) {
  const isStateful2 = hasServerSessionStore(options);
  if (!isStateful2) options = defu$1(options, { session: { cookieCache: {
    enabled: true,
    strategy: "jwe",
    refreshCache: true,
    maxAge: options.session?.expiresIn || 3600 * 24 * 7
  } } });
  if (!options.database) options = defu$1(options, { account: { storeAccountCookie: true } });
  const plugins = options.plugins || [];
  const internalPlugins = getInternalPlugins(options);
  const logger2 = createLogger(options.logger);
  const isDynamicConfig = isDynamicBaseURLConfig(options.baseURL);
  if (isDynamicBaseURLConfig(options.baseURL)) {
    const { allowedHosts } = options.baseURL;
    if (!allowedHosts || allowedHosts.length === 0) throw new BetterAuthError('baseURL.allowedHosts cannot be empty. Provide at least one allowed host pattern (e.g., ["myapp.com", "*.vercel.app"]).');
  }
  const baseURL = isDynamicConfig ? void 0 : getBaseURL(typeof options.baseURL === "string" ? options.baseURL : void 0, options.basePath);
  if (!baseURL && !isDynamicConfig) logger2.warn(`[better-auth] Base URL is not set. Set the baseURL option or BETTER_AUTH_URL env, or use a dynamic baseURL with allowedHosts for multi-host setups. Without it the origin is derived from the incoming request, and callbacks and redirects may not work correctly.`);
  if (adapter.id === "memory" && options.advanced?.database?.generateId === false) logger2.error(`[better-auth] Misconfiguration detected.
You are using the memory DB with generateId: false.
This will cause no id to be generated for any model.
Most of the features of Better Auth will not work correctly.`);
  const secretsArray = options.secrets ?? parseSecretsEnv(env.BETTER_AUTH_SECRETS);
  const legacySecret = options.secret || env.BETTER_AUTH_SECRET || env.AUTH_SECRET || "";
  let secret;
  let secretConfig;
  if (secretsArray) {
    validateSecretsArray(secretsArray, logger2);
    secret = secretsArray[0].value;
    secretConfig = buildSecretConfig(secretsArray, legacySecret);
  } else {
    secret = legacySecret || "better-auth-secret-12345678901234567890";
    validateSecret(secret, logger2);
    secretConfig = secret;
  }
  options = {
    ...options,
    secret,
    baseURL: isDynamicConfig ? options.baseURL : baseURL ? new URL(baseURL).origin : "",
    basePath: options.basePath || "/api/auth",
    plugins: plugins.concat(internalPlugins)
  };
  checkEndpointConflicts(options, logger2);
  const trustedProxies = options.advanced?.ipAddress?.trustedProxies;
  if (trustedProxies && trustedProxies.length > 0) {
    const invalid = findInvalidTrustedProxies(trustedProxies);
    if (invalid.length > 0) logger2.warn(`Ignoring invalid \`advanced.ipAddress.trustedProxies\` entries: ${invalid.join(", ")}. Each entry must be an IP address or CIDR range.`);
  }
  const cookies = getCookies(options);
  const tables = getAuthTables(options);
  const providers = (await Promise.all(Object.entries(options.socialProviders || {}).map(async ([key, originalConfig]) => {
    const config = typeof originalConfig === "function" ? await originalConfig() : originalConfig;
    if (config == null) return null;
    if (config.enabled === false) return null;
    if (!config.clientId) logger2.warn(`Social provider ${key} is missing clientId or clientSecret`);
    const provider = socialProviders[key](config);
    provider.disableImplicitSignUp = config.disableImplicitSignUp;
    return provider;
  }))).filter((x) => x !== null);
  const generateIdFunc = ({ model, size }) => {
    if (typeof options.advanced?.generateId === "function") return options.advanced.generateId({
      model,
      size
    });
    const dbGenerateId = options?.advanced?.database?.generateId;
    if (typeof dbGenerateId === "function") return dbGenerateId({
      model,
      size
    });
    if (dbGenerateId === "uuid") return crypto.randomUUID();
    if (dbGenerateId === "serial" || dbGenerateId === false) return false;
    return generateId(size);
  };
  const { publish } = await createTelemetry(options, {
    adapter: adapter.id,
    database: typeof options.database === "function" ? "adapter" : getDatabaseType(options.database)
  });
  const pluginIds = new Set(options.plugins.map((p) => p.id));
  const getPluginFn = (id) => options.plugins.find((p) => p.id === id) ?? null;
  const hasPluginFn = (id) => pluginIds.has(id);
  const trustedOrigins = await getTrustedOrigins(options);
  const trustedProviders = await getTrustedProviders(options);
  const ctx = {
    appName: options.appName || "Better Auth",
    baseURL: baseURL || "",
    version: getBetterAuthVersion(),
    socialProviders: providers,
    options,
    oauthConfig: {
      storeStateStrategy: options.account?.storeStateStrategy || (isStateful2 ? "database" : "cookie"),
      skipStateCookieCheck: !!options.account?.skipStateCookieCheck
    },
    tables,
    trustedOrigins,
    trustedProviders,
    isTrustedOrigin(url, settings) {
      return this.trustedOrigins.some((origin) => matchesOriginPattern(url, origin, settings));
    },
    sessionConfig: {
      updateAge: options.session?.updateAge !== void 0 ? options.session.updateAge : 1440 * 60,
      expiresIn: options.session?.expiresIn || 3600 * 24 * 7,
      freshAge: options.session?.freshAge === void 0 ? 3600 * 24 : options.session.freshAge,
      cookieRefreshCache: (() => {
        const refreshCache = options.session?.cookieCache?.refreshCache;
        const maxAge = options.session?.cookieCache?.maxAge || 300;
        if (isStateful2 && refreshCache) {
          logger2.warn("[better-auth] `session.cookieCache.refreshCache` is enabled while `database` or `secondaryStorage` is configured. `refreshCache` is meant for stateless (DB-less) setups. Disabling `refreshCache` — remove it from your config to silence this warning.");
          return false;
        }
        if (refreshCache === false || refreshCache === void 0) return false;
        if (refreshCache === true) return {
          enabled: true,
          updateAge: Math.floor(maxAge * 0.2)
        };
        return {
          enabled: true,
          updateAge: refreshCache.updateAge !== void 0 ? refreshCache.updateAge : Math.floor(maxAge * 0.2)
        };
      })()
    },
    secret,
    secretConfig,
    rateLimit: {
      ...options.rateLimit,
      enabled: options.rateLimit?.enabled ?? isProduction,
      window: options.rateLimit?.window || 10,
      max: options.rateLimit?.max || 100,
      storage: options.rateLimit?.storage || (options.secondaryStorage ? "secondary-storage" : "memory")
    },
    authCookies: cookies,
    logger: logger2,
    generateId: generateIdFunc,
    session: null,
    secondaryStorage: options.secondaryStorage,
    password: {
      hash: options.emailAndPassword?.password?.hash || hashPassword$1,
      verify: options.emailAndPassword?.password?.verify || verifyPassword$1,
      config: {
        minPasswordLength: options.emailAndPassword?.minPasswordLength || 8,
        maxPasswordLength: options.emailAndPassword?.maxPasswordLength || 128
      },
      checkPassword
    },
    setNewSession(session2) {
      this.newSession = session2;
    },
    newSession: null,
    adapter,
    internalAdapter: createInternalAdapter(adapter, {
      options,
      logger: logger2,
      hooks: options.databaseHooks ? [{
        source: "user",
        hooks: options.databaseHooks
      }] : [],
      generateId: generateIdFunc
    }),
    createAuthCookie: createCookieGetter(options),
    async runMigrations() {
      throw new BetterAuthError("runMigrations will be set by the specific init implementation");
    },
    publishTelemetry: publish,
    skipCSRFCheck: !!options.advanced?.disableCSRFCheck,
    skipOriginCheck: options.advanced?.disableOriginCheck !== void 0 ? options.advanced.disableOriginCheck : isTest() ? true : false,
    runInBackground: options.advanced?.backgroundTasks?.handler ?? ((p) => {
      p.catch(() => {
      });
    }),
    async runInBackgroundOrAwait(promise) {
      try {
        if (options.advanced?.backgroundTasks?.handler) {
          if (promise instanceof Promise) options.advanced.backgroundTasks.handler(promise.catch((e) => {
            logger2.error("Failed to run background task:", e);
          }));
        } else await promise;
      } catch (e) {
        logger2.error("Failed to run background task:", e);
      }
    },
    getPlugin: getPluginFn,
    hasPlugin: hasPluginFn
  };
  const initOrPromise = runPluginInit(ctx);
  if (isPromise(initOrPromise)) await initOrPromise;
  return ctx;
}
const init = async (options) => {
  const adapter = await getAdapter(options);
  const getDatabaseType = (database) => getKyselyDatabaseType(database) || "unknown";
  const ctx = await createAuthContext(adapter, options, getDatabaseType);
  ctx.runMigrations = async function() {
    if (!options.database || "updateMany" in options.database) throw new BetterAuthError("Database is not provided or it's an adapter. Migrations are only supported with a database instance.");
    const { runMigrations } = await getMigrations(options);
    await runMigrations();
  };
  return ctx;
};
const createBetterAuth = (options, initFn) => {
  const authContext = initFn(options);
  const { api } = getEndpoints(authContext, options);
  const errorCodes = options.plugins?.reduce((acc, plugin) => {
    if (plugin.$ERROR_CODES) return {
      ...acc,
      ...plugin.$ERROR_CODES
    };
    return acc;
  }, {});
  const handler = async (request) => {
    const ctx = await authContext;
    const basePath = ctx.options.basePath || "/api/auth";
    let handlerCtx;
    if (isDynamicBaseURLConfig(options.baseURL)) handlerCtx = await resolveRequestContext(ctx, request, resolveDynamicTrustedProxyHeaders(ctx.options));
    else {
      handlerCtx = Object.create(Object.getPrototypeOf(ctx), Object.getOwnPropertyDescriptors(ctx));
      let trustOptions = ctx.options;
      if (!ctx.options.baseURL) {
        const baseURL = getBaseURL(void 0, basePath, request, void 0, ctx.options.advanced?.trustedProxyHeaders);
        if (!baseURL) throw new BetterAuthError("Could not get base URL from request. Please provide a valid base URL.");
        handlerCtx.baseURL = baseURL;
        handlerCtx.options = {
          ...ctx.options,
          baseURL: getOrigin(baseURL) || void 0
        };
        trustOptions = handlerCtx.options;
      }
      handlerCtx.trustedOrigins = await getTrustedOrigins(trustOptions, request);
      handlerCtx.trustedProviders = await getTrustedProviders(trustOptions, request);
    }
    const { handler: handler2 } = router(handlerCtx, options);
    return runWithAdapter(handlerCtx.adapter, () => handler2(request));
  };
  return {
    handler,
    fetch: handler,
    api,
    options,
    $context: authContext,
    $ERROR_CODES: {
      ...errorCodes,
      ...BASE_ERROR_CODES
    }
  };
};
const betterAuth = (options) => {
  return createBetterAuth(options, init);
};
async function findLegacyUserId(email) {
  const normalized = email.toLowerCase();
  const rows = await db.select({ id: users.id }).from(users).where(eq(sql$1`lower(${users.email})`, normalized)).orderBy(users.createdAt, users.id).limit(1);
  return rows[0]?.id ?? null;
}
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[auth] Missing required environment variable: ${name}`);
  }
  return value;
}
const betterAuthSecret = requireEnv("BETTER_AUTH_SECRET");
const googleClientId = requireEnv("GOOGLE_CLIENT_ID");
const googleClientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification }
  }),
  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24
  },
  account: {
    accountLinking: {
      // Google の verified email を所有証明として暗黙リンクを許可する。
      // 招待制ゲート（下記 validateUserInfo・before）が `emailVerified === true` の
      // 既存 email のみを通すため、未検証アドレスの乗っ取りには使えない。
      // better-auth 既定 `requireLocalEmailVerified: true` と合わせ、未検証の
      // 既存行への暗黙リンクも拒否される。
      trustedProviders: ["google"]
    }
  },
  user: {
    // 招待制ゲート。create-user / link-account / sign-in の全経路で
    // 既存 `users.email` のみ許可する（現行 signIn コールバックの再現）。
    // 所有証明として Google の `emailVerified === true` を必須化する。
    // better-auth 実測: OAuth コールバックは userInfo（`emailVerified` 付き）を
    // validateUserInfo（create-user・link-account の両 action）に渡すため、
    // 未検証 Google email による被害者 legacyId の継承をここで遮断できる。
    validateUserInfo: async ({ user: candidate }) => {
      const email = typeof candidate.email === "string" ? candidate.email : "";
      if (candidate.emailVerified !== true) {
        return { error: "USER_NOT_ALLOWED", errorDescription: "Email ownership is not verified." };
      }
      if (!email || await findLegacyUserId(email) === null) {
        return { error: "USER_NOT_ALLOWED", errorDescription: "This email is not invited." };
      }
    }
  },
  databaseHooks: {
    user: {
      create: {
        // ドメイン層（`exercises.user_id` 等の integer FK → 旧 `users.id`）との
        // 互換維持のため、better-auth 側 `user.id` に既存 `users.id` を引き継ぐ。
        // 以降 `Number(session.user.id)` がそのままドメインの userId になる。
        // 深層防御の二重ゲート: `validateUserInfo` を素通しする将来の生成経路が
        // あっても未検証 email は fail-closed で throw する。現行 dist では
        // `createOAuthUser` の呼出はなく、実経路は validate＋before の二重通過
        // （出典: `better-auth/dist/db/internal-adapter.mjs`）。
        before: async (candidate) => {
          if (candidate.emailVerified !== true) {
            throw new Error("USER_NOT_ALLOWED: email ownership is not verified");
          }
          if (typeof candidate.email !== "string" || candidate.email === "") {
            throw new Error("USER_NOT_ALLOWED: This email is not invited.");
          }
          const legacyId = await findLegacyUserId(candidate.email);
          if (legacyId === null) {
            throw new Error("USER_NOT_ALLOWED: This email is not invited.");
          }
          return { data: { ...candidate, id: String(legacyId) } };
        }
      }
    }
  },
  secret: betterAuthSecret
});
export {
  auth
};
