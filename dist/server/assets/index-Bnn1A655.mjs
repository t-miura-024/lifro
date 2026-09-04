import { env } from "@better-auth/core/env";
import { BetterAuthError } from "@better-auth/core/error";
import * as kyselyAdapter from "@better-auth/kysely-adapter";
function _mergeNamespaces(n, m) {
  for (var i = 0; i < m.length; i++) {
    const e = m[i];
    if (typeof e !== "string" && !Array.isArray(e)) {
      for (const k in e) {
        if (k !== "default" && !(k in n)) {
          const d = Object.getOwnPropertyDescriptor(e, k);
          if (d) {
            Object.defineProperty(n, k, d.get ? d : {
              enumerable: true,
              get: () => e[k]
            });
          }
        }
      }
    }
  }
  return Object.freeze(Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }));
}
function escapeRegExpChar(char) {
  if (char === "-" || char === "^" || char === "$" || char === "+" || char === "." || char === "(" || char === ")" || char === "|" || char === "[" || char === "]" || char === "{" || char === "}" || char === "*" || char === "?" || char === "\\") return `\\${char}`;
  else return char;
}
function escapeRegExpString(str) {
  let result = "";
  for (let i = 0; i < str.length; i++) result += escapeRegExpChar(str[i]);
  return result;
}
function transform(pattern, separator = true) {
  if (Array.isArray(pattern)) return `(?:${pattern.map((p) => `^${transform(p, separator)}$`).join("|")})`;
  let separatorSplitter = "";
  let separatorMatcher = "";
  let wildcard = ".";
  if (separator === true) {
    separatorSplitter = "/";
    separatorMatcher = "[/\\\\]";
    wildcard = "[^/\\\\]";
  } else if (separator) {
    separatorSplitter = separator;
    separatorMatcher = escapeRegExpString(separatorSplitter);
    if (separatorMatcher.length > 1) {
      separatorMatcher = `(?:${separatorMatcher})`;
      wildcard = `((?!${separatorMatcher}).)`;
    } else wildcard = `[^${separatorMatcher}]`;
  }
  const requiredSeparator = separator ? `${separatorMatcher}+?` : "";
  const optionalSeparator = separator ? `${separatorMatcher}*?` : "";
  const segments = separator ? pattern.split(separatorSplitter) : [pattern];
  let result = "";
  for (let s = 0; s < segments.length; s++) {
    const segment = segments[s];
    const nextSegment = segments[s + 1];
    let currentSeparator = "";
    if (!segment && s > 0) continue;
    if (separator) if (s === segments.length - 1) currentSeparator = optionalSeparator;
    else if (nextSegment !== "**") currentSeparator = requiredSeparator;
    else currentSeparator = "";
    if (separator && segment === "**") {
      if (currentSeparator) {
        result += s === 0 ? "" : currentSeparator;
        result += `(?:${wildcard}*?${currentSeparator})*?`;
      }
      continue;
    }
    for (let c = 0; c < segment.length; c++) {
      const char = segment[c];
      if (char === "\\") {
        if (c < segment.length - 1) {
          result += escapeRegExpChar(segment[c + 1]);
          c++;
        }
      } else if (char === "?") result += wildcard;
      else if (char === "*") result += `${wildcard}*?`;
      else result += escapeRegExpChar(char);
    }
    result += currentSeparator;
  }
  return result;
}
function isMatch(regexp, sample) {
  if (typeof sample !== "string") throw new TypeError(`Sample must be a string, but ${typeof sample} given`);
  return regexp.test(sample);
}
function wildcardMatch(pattern, options) {
  if (typeof pattern !== "string" && !Array.isArray(pattern)) throw new TypeError(`The first argument must be a single pattern string or an array of patterns, but ${typeof pattern} given`);
  if (typeof options === "string" || typeof options === "boolean") options = { separator: options };
  if (arguments.length === 2 && !(typeof options === "undefined" || typeof options === "object" && options !== null && !Array.isArray(options))) throw new TypeError(`The second argument must be an options object or a string/boolean separator, but ${typeof options} given`);
  options = options || {};
  if (options.separator === "\\") throw new Error("\\ is not a valid separator because it is used for escaping. Try setting the separator to `true` instead");
  const regexpPattern = transform(pattern, options.separator);
  const regexp = new RegExp(`^${regexpPattern}$`, options.flags);
  const fn = isMatch.bind(null, regexp);
  fn.options = options;
  fn.pattern = pattern;
  fn.regexp = regexp;
  return fn;
}
const SLASH_CHAR_CODE = "/".charCodeAt(0);
function isLoopbackForDevScheme(host) {
  const hostname = host.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").toLowerCase();
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "::1" || hostname.startsWith("127.");
}
function trimTrailingSlashes(value) {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === SLASH_CHAR_CODE) end--;
  return end === value.length ? value : value.slice(0, end);
}
function checkHasPath(url) {
  try {
    return (trimTrailingSlashes(new URL(url).pathname) || "/") !== "/";
  } catch {
    throw new BetterAuthError(`Invalid base URL: ${url}. Please provide a valid base URL.`);
  }
}
function assertHasProtocol(url) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") throw new BetterAuthError(`Invalid base URL: ${url}. URL must include 'http://' or 'https://'`);
  } catch (error) {
    if (error instanceof BetterAuthError) throw error;
    throw new BetterAuthError(`Invalid base URL: ${url}. Please provide a valid base URL.`, { cause: error });
  }
}
function withPath(url, path = "/api/auth") {
  assertHasProtocol(url);
  if (checkHasPath(url)) return url;
  const trimmedUrl = trimTrailingSlashes(url);
  if (!path || path === "/") return trimmedUrl;
  path = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedUrl}${path}`;
}
function validateProxyHeader(header, type) {
  if (!header || header.trim() === "") return false;
  if (type === "proto") return header === "http" || header === "https";
  if (type === "host") {
    if ([
      /\.\./,
      /\0/,
      /[\s]/,
      /^[.]/,
      /[<>'"]/,
      /javascript:/i,
      /file:/i,
      /data:/i
    ].some((pattern) => pattern.test(header))) return false;
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(:[0-9]{1,5})?$/.test(header) || /^(\d{1,3}\.){3}\d{1,3}(:[0-9]{1,5})?$/.test(header) || /^\[[0-9a-fA-F:]+\](:[0-9]{1,5})?$/.test(header) || /^localhost(:[0-9]{1,5})?$/i.test(header);
  }
  return false;
}
function getBaseURL(url, path, request, loadEnv, trustedProxyHeaders) {
  if (url) return withPath(url, path);
  if (loadEnv !== false) {
    const fromEnv = env.BETTER_AUTH_URL || env.NEXT_PUBLIC_BETTER_AUTH_URL || env.PUBLIC_BETTER_AUTH_URL || env.NUXT_PUBLIC_BETTER_AUTH_URL || env.NUXT_PUBLIC_AUTH_URL || (env.BASE_URL !== "/" ? env.BASE_URL : void 0);
    if (fromEnv) return withPath(fromEnv, path);
  }
  const fromRequest = request?.headers.get("x-forwarded-host");
  const fromRequestProto = request?.headers.get("x-forwarded-proto");
  if (fromRequest && fromRequestProto && trustedProxyHeaders) {
    if (validateProxyHeader(fromRequestProto, "proto") && validateProxyHeader(fromRequest, "host")) try {
      return withPath(`${fromRequestProto}://${fromRequest}`, path);
    } catch (_error) {
    }
  }
  if (request) {
    const url2 = getOrigin(request.url);
    if (!url2) throw new BetterAuthError("Could not get origin from request. Please provide a valid base URL.");
    return withPath(url2, path);
  }
  if (typeof window !== "undefined" && window.location) return withPath(window.location.origin, path);
}
function getOrigin(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.origin === "null" ? null : parsedUrl.origin;
  } catch {
    return null;
  }
}
function getProtocol(url) {
  try {
    return new URL(url).protocol;
  } catch {
    return null;
  }
}
function getHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
function isDynamicBaseURLConfig(config) {
  return typeof config === "object" && config !== null && "allowedHosts" in config && Array.isArray(config.allowedHosts);
}
function isRequestLike(value) {
  if (value instanceof Request) return true;
  if (typeof value !== "object" || value === null || Object.prototype.toString.call(value) !== "[object Request]") return false;
  const v = value;
  return typeof v.url === "string" && typeof v.headers === "object" && v.headers !== null && typeof v.headers.get === "function";
}
function getHostFromSource(source, trustedProxyHeaders) {
  const headers = isRequestLike(source) ? source.headers : source;
  if (trustedProxyHeaders) {
    const forwardedHost = headers.get("x-forwarded-host");
    if (forwardedHost && validateProxyHeader(forwardedHost, "host")) return forwardedHost;
  }
  const host = headers.get("host");
  if (host && validateProxyHeader(host, "host")) return host;
  if (isRequestLike(source)) try {
    return new URL(source.url).host;
  } catch {
    return null;
  }
  return null;
}
function getProtocolFromSource(source, configProtocol, trustedProxyHeaders) {
  if (configProtocol === "http" || configProtocol === "https") return configProtocol;
  const headers = isRequestLike(source) ? source.headers : source;
  if (trustedProxyHeaders) {
    const forwardedProto = headers.get("x-forwarded-proto");
    if (forwardedProto && validateProxyHeader(forwardedProto, "proto")) return forwardedProto;
  }
  if (isRequestLike(source)) try {
    const url = new URL(source.url);
    if (url.protocol === "http:" || url.protocol === "https:") return url.protocol.slice(0, -1);
  } catch {
  }
  const host = getHostFromSource(source, trustedProxyHeaders);
  if (host && isLoopbackForDevScheme(host)) return "http";
  return "https";
}
const matchesHostPattern = (host, pattern) => {
  if (!host || !pattern) return false;
  const normalizedHost = host.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
  const normalizedPattern = pattern.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
  if (normalizedPattern.includes("*") || normalizedPattern.includes("?")) return wildcardMatch(normalizedPattern)(normalizedHost);
  return normalizedHost.toLowerCase() === normalizedPattern.toLowerCase();
};
function resolveDynamicBaseURL(config, source, basePath, trustedProxyHeaders) {
  const host = getHostFromSource(source, trustedProxyHeaders);
  if (!host) {
    if (config.fallback) return withPath(config.fallback, basePath);
    throw new BetterAuthError("Could not determine host from request headers. Please provide a fallback URL in your baseURL config.");
  }
  if (config.allowedHosts.some((pattern) => matchesHostPattern(host, pattern))) return withPath(`${getProtocolFromSource(source, config.protocol, trustedProxyHeaders)}://${host}`, basePath);
  if (config.fallback) return withPath(config.fallback, basePath);
  throw new BetterAuthError(`Host "${host}" is not in the allowed hosts list. Allowed hosts: ${config.allowedHosts.join(", ")}. Add this host to your allowedHosts config or provide a fallback URL.`);
}
function resolveBaseURL(config, basePath, source, loadEnv, trustedProxyHeaders) {
  if (isDynamicBaseURLConfig(config)) {
    if (source) return resolveDynamicBaseURL(config, source, basePath, trustedProxyHeaders);
    if (config.fallback) return withPath(config.fallback, basePath);
    return getBaseURL(void 0, basePath, void 0, loadEnv, trustedProxyHeaders);
  }
  const request = isRequestLike(source) ? source : void 0;
  if (typeof config === "string") return getBaseURL(config, basePath, request, loadEnv, trustedProxyHeaders);
  return getBaseURL(void 0, basePath, request, loadEnv, trustedProxyHeaders);
}
const index = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null
}, [kyselyAdapter]);
export {
  getOrigin as a,
  getHost as b,
  getProtocol as c,
  isRequestLike as d,
  index as e,
  getBaseURL as g,
  isDynamicBaseURLConfig as i,
  resolveBaseURL as r,
  wildcardMatch as w
};
