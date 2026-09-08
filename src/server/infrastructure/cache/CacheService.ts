import superjson from 'superjson'
import { IsolateKeyLedger } from './IsolateKeyLedger'

/** キャッシュのデフォルトTTL（秒） */
const DEFAULT_TTL_SECONDS = 300 // 5分

/** TTL の下限（秒）。1 未満は即失効と等価のため受け付けない。 */
const MIN_TTL_SECONDS = 1

/** TTL の上限（秒）。想定外の長期保持（非有限値の混入等）を防ぐ。 */
const MAX_TTL_SECONDS = 60 * 60 * 24 * 7 // 7日

/** `deleteByPrefix` の同時削除数上限。無制限ファンアウトによる Worker の CPU・サブリクエスト上限・Cache API 側のスロットルを防ぐ。同時実行のみバウンドする。 */
const DELETE_CONCURRENCY = 20

/** `deleteByPrefix` が1回で削除する件数上限。一致キーが上限を超えた分は打ち切り、残存は TTL 失効に委ねる（警告ログで明示）。無効化は書込後の要求経路で await されるため、台帳肥大時のレイテンシ線形増大を抑える。 */
const MAX_DELETE_KEYS_PER_CALL = 200

/** キャッシュドメイン */
export type CacheDomain = 'exercise' | 'training' | 'statistics' | 'memo' | 'timer' | 'bodyPart'

/**
 * `deleteByPrefix` 系の無効化結果。`deleted` は実際に削除された件数
 * （`Cache.delete` が `true` を返したもののみ。存在しなかったキーは数えない）、
 * `notFoundKeys` は削除時点で既に存在しなかったキー（台帳からは除去済み・
 * 再試行不要）、`failedKeys` は削除失敗キー（台帳に残し再試行可能）。
 * 呼び出し側は返り値を無視しても動作する（失敗時は警告ログで追跡可能）。
 */
export type InvalidationResult = { deleted: number; notFoundKeys: string[]; failedKeys: string[] }

/**
 * Workers Cache API（`caches.default`）の最小構造型。
 * DOM lib の `CacheStorage` には Cloudflare 拡張の `default` がないため、
 * 新規依存（`@cloudflare/workers-types` 等）を増やさず構造型で受ける。
 * M1 が wrangler 型基盤を整備したらそちらへの寄せ直しを検討する。
 */
type WorkersCacheStorage = CacheStorage & { default?: Cache }

/**
 * ランタイムの `caches.default` を安全に取得する。非 Workers 環境では null。
 * - 未定義は想定内（ローカル開発・ビルド・vitest 等）で無警告で縮退する。
 * - 取得自体の例外は想定外（ランタイム異常・一時的障害）のため警告する。
 *   無音縮退にすると D1 読取増（無料枠圧迫）の原因が観測不能になる。
 */
function getDefaultCache(): Cache | null {
  try {
    const stores = (globalThis as unknown as { caches?: WorkersCacheStorage }).caches
    return stores?.default ?? null
  } catch (error) {
    console.warn('[CacheService] Failed to access caches.default:', error)
    return null
  }
}

/** TTL を検証・正規化する。非有限値は既定 TTL に倒し、範囲外は上下限に丸める。 */
function normalizeTtlSeconds(ttlSeconds: number): number {
  if (!Number.isFinite(ttlSeconds)) {
    console.warn(`[CacheService] Non-finite TTL (using default ${DEFAULT_TTL_SECONDS}s): ${ttlSeconds}`)
    return DEFAULT_TTL_SECONDS
  }
  const floored = Math.floor(ttlSeconds)
  if (floored < MIN_TTL_SECONDS || floored > MAX_TTL_SECONDS) {
    const clamped = Math.min(Math.max(floored, MIN_TTL_SECONDS), MAX_TTL_SECONDS)
    console.warn(`[CacheService] TTL out of range (clamped to ${clamped}s): ${ttlSeconds}`)
    return clamped
  }
  return floored
}

/** 空の無効化結果を都度生成する。`failedKeys`・`notFoundKeys` の可変配列共有を避けるため使い回さない。 */
function emptyInvalidationResult(): InvalidationResult {
  return { deleted: 0, notFoundKeys: [], failedKeys: [] }
}

/**
 * `scan`/`deleteByPrefix` の prefix を検証する。空文字は全キーに前方一致して
 * 全ユーザ分の一括削除・全キー列挙になるため拒否する。区切り（`:`）を含まない
 * prefix もユーザ分離を崩す広域一致になり得るため拒否し、ユーザ系の無効化は
 * `invalidateUserDomain` 経由（`lifro:{userId}:{domain}:` 形式）に限定する。
 */
function assertSafePrefix(caller: string, prefix: string): void {
  if (prefix.length === 0 || !prefix.includes(':')) {
    throw new Error(`[CacheService] ${caller}: prefix must be non-empty and contain ':' delimiter: ${JSON.stringify(prefix)}`)
  }
}
/** Cache API のキー用合成URL。`Request` 化に必要なだけの器であり中身は持たない。 */
const CACHE_KEY_ORIGIN = 'https://lifro.cache'

function toCacheRequest(key: string): Request {
  return new Request(`${CACHE_KEY_ORIGIN}/${encodeURIComponent(key)}`)
}

/**
 * Workers Cache キャッシュサービス（ADR 0013: Upstash Redis からの置換）。
 *
 * - Upstash 依存ゼロ。`UPSTASH_REDIS_REST_URL/TOKEN` は不要のため削除済み。
 *   Cache API は認証情報を要さず、wrangler secret への追加登録も不要。
 *   旧 Upstash `del` との互換別名は設けない（呼び出し側は `delete` に統一）。
 * - TTL付き get/set/delete/scan の運用互換を維持する。ただし Cache API に
 *   一覧手段がないため、scan 系（`scan`/`deleteByPrefix`）は当 isolate の
 *   書込台帳（`IsolateKeyLedger`）による前方一致の best-effort であることを
 *   仕様とする（KV併用は ADR 0013 で退けているため採用しない）。
 *   制約: 他 isolate が書いたキーは台帳に見えず `scan` に含まれないため、
 *   `deleteByPrefix`/`invalidateUserDomain(s)` 後に別 isolate が TTL 失効
 *   （既定300秒）まで古い値を返す残存窓がある。強い無効化が必要な系統は
 *   TTL 短縮・キー版付けで古値窓を閉じるか、キャッシュ対象外にすること。
 *   台帳上限超過で追い出されたキーも同様に TTL まで残存し無効化対象外に
 *   なる（追い出し時は `IsolateKeyLedger` が警告ログを出す）。
 *   運用メモ: 無効化後に古値が返る場合は本制約を疑い、TTL 失効待ちか
 *   該当 prefix の再無効化で対応する。
 * - 非 Workers 環境（ローカル開発・ビルド・vitest 等）では `isEnabled() === false`
 *   となり、`through` は fetcher 直実行に縮退する（旧 Redis 未設定時と同一契約）。
 */
export class CacheService {
  private readonly prefix = 'lifro'
  /** scan 互換のためのキー台帳。当 isolate が `set` したキーのみを保持する。既定は新規台帳。差し替え・単体試験用に注入できる。 */
  private readonly keyLedger: IsolateKeyLedger

  constructor(keyLedger: IsolateKeyLedger = new IsolateKeyLedger()) {
    this.keyLedger = keyLedger
  }

  /**
   * キャッシュが有効かどうか
   */
  isEnabled(): boolean {
    return getDefaultCache() !== null
  }

  /**
   * キャッシュキーを生成
   * 形式: lifro:{userId}:{domain}:{method}:{params}
   */
  buildKey(userId: number, domain: CacheDomain, method: string, params?: string): string {
    const parts = [this.prefix, userId, domain, method]
    if (params) {
      parts.push(params)
    }
    return parts.join(':')
  }

  /**
   * キャッシュからデータを取得
   */
  async get<T>(key: string): Promise<T | null> {
    const cache = getDefaultCache()
    if (!cache) {
      return null
    }

    try {
      const hit = await cache.match(toCacheRequest(key))
      if (!hit) {
        this.keyLedger.remove(key)
        return null
      }
      const raw = await hit.text()
      try {
        return superjson.deserialize<T>(JSON.parse(raw))
      } catch (parseError) {
        // 破損エントリは残すと以降の get でも失敗を繰り返すため、best-effort で
        // Cache API と台帳の両方から除去する。除去自体の失敗は無視し、次回 get 時の
        // 再試行に委ねる（ミス時はキャッシュ欠落→fetcher 再取得に縮退するのみ）。
        console.error('[CacheService] get: removing corrupted cache entry:', parseError)
        try {
          await cache.delete(toCacheRequest(key))
        } catch {
          // best-effort のため無視する。
        }
        this.keyLedger.remove(key)
        return null
      }
    } catch (error) {
      console.error('[CacheService] get error:', error)
      return null
    }
  }

  /**
   * キャッシュにデータを保存
   * TTL は `Cache-Control: max-age` で Cache API に伝える。
   */
  async set<T>(key: string, value: T, ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<void> {
    const cache = getDefaultCache()
    if (!cache) {
      return
    }

    const ttl = normalizeTtlSeconds(ttlSeconds)
    try {
      const serialized = JSON.stringify(superjson.serialize(value))
      await cache.put(
        toCacheRequest(key),
        new Response(serialized, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `max-age=${ttl}`,
          },
        }),
      )
      // 台帳上限超過の追い出し分は Cache API に TTL まで残るが無効化対象外に
      // なる（`IsolateKeyLedger.add` の警告ログ・返り値で明示）。返り値を
      // 無視しても動作する（fire-and-forget。追跡は台帳側の警告に一本化）。
      this.keyLedger.add(key, ttl)
    } catch (error) {
      console.error('[CacheService] set error:', error)
    }
  }

  /**
   * キャッシュを削除
   */
  async delete(key: string): Promise<void> {
    const cache = getDefaultCache()
    if (!cache) {
      return
    }

    try {
      await cache.delete(toCacheRequest(key))
      this.keyLedger.remove(key)
    } catch (error) {
      console.error('[CacheService] delete error:', error)
    }
  }

  /**
   * scan 互換。Cache API に一覧手段がないため当 isolate の書込台帳から
   * 前方一致で返す（best-effort。他 isolate 書込分は含まない。詳細は
   * クラスコメントの制約・運用メモ参照）。
   */
  async scan(prefix: string): Promise<string[]> {
    assertSafePrefix('scan', prefix)
    // 空台帳の早期脱出は `IsolateKeyLedger.scan` 先頭に一本化し、ここでは
    // 重複ガードを置かない。一致分は全件返す（最大で台帳上限件数。件数に
    // よる打ち切りなし）。
    return this.keyLedger.scan(prefix)
  }

  /**
   * プレフィックスに一致するキャッシュを一括削除
   * ワイルドカードパターンをサポート（旧実装の `${prefix}*` は前方一致と等価のため prefix をそのまま使う）。
   * - 空文字・区切り未満の prefix は throw する（全件削除の防止。`assertSafePrefix` 参照）。
   * - 同時実行は `DELETE_CONCURRENCY` 件ずつのチャンク逐次にバウンドする。
   * - 件数上限・打切り方針: 1回で削除するのは最大 `MAX_DELETE_KEYS_PER_CALL` 件。
   *   一致キーが上限を超えた分は打ち切り、台帳に残したまま残存は TTL 失効に委ねる
   *   （警告ログで明示。次回 `deleteByPrefix` で再試行可能）。
   * - 台帳除去は削除成功時のみ行う。失敗キーは台帳に残して再試行可能にし、
   *   返り値の `failedKeys` と警告ログで追跡可能にする。
   * - `Cache.delete` が `false`（既に存在しない）を返したキーは `deleted` に
   *   計上せず `notFoundKeys` として別途返す。存在しないキーへの delete を
   *   成功に数えると契約を崩すため。Cache 上に存在しないことは確定しているため
   *   台帳からのみ除去し（再試行不要）、`failedKeys` には含めない。
   * - 他 isolate 書込分は台帳に見えず残存し TTL 失効待ちになる（best-effort の制約。クラスコメント参照）。
   */
  async deleteByPrefix(prefix: string): Promise<InvalidationResult> {
    assertSafePrefix('deleteByPrefix', prefix)
    const cache = getDefaultCache()
    if (!cache) {
      return emptyInvalidationResult()
    }
    // 台帳が空なら走査・削除サブリクエストを発行せず即 return する早期脱出。
    // 打切り方針: 一致キーのうち最大 `MAX_DELETE_KEYS_PER_CALL` 件を対象とし、
    // 超過分は打ち切って残存は TTL 失効に委ねる（警告ログで明示）。
    // 処理量の上限は台帳上限（`MAX_LEDGER_SIZE`=1000）ではなく本上限でバウンドする。
    if (this.keyLedger.size === 0) {
      return emptyInvalidationResult()
    }

    // Cache API に SCAN がないため台帳（`scan`）でキーを求めて削除する。
    const matched = this.keyLedger.scan(prefix)
    // prefix 一致ゼロなら削除サブリクエストを発行せず即 return する。
    if (matched.length === 0) {
      return emptyInvalidationResult()
    }
    if (matched.length > MAX_DELETE_KEYS_PER_CALL) {
      console.warn(
        `[CacheService] deleteByPrefix: ${matched.length} key(s) matched (truncated to ${MAX_DELETE_KEYS_PER_CALL}; remainder left to TTL expiry):`,
        prefix,
      )
    }
    const keys = matched.slice(0, MAX_DELETE_KEYS_PER_CALL)
    let deleted = 0
    const notFoundKeys: string[] = []
    const failedKeys: string[] = []
    for (let i = 0; i < keys.length; i += DELETE_CONCURRENCY) {
      const chunk = keys.slice(i, i + DELETE_CONCURRENCY)
      const settled = await Promise.allSettled(chunk.map((key) => cache.delete(toCacheRequest(key))))
      settled.forEach((result, index) => {
        const key = chunk[index] as string
        if (result.status === 'fulfilled' && result.value === true) {
          this.keyLedger.remove(key)
          deleted += 1
        } else if (result.status === 'fulfilled') {
          this.keyLedger.remove(key)
          notFoundKeys.push(key)
        } else {
          failedKeys.push(key)
        }
      })
    }
    if (failedKeys.length > 0) {
      console.warn(
        `[CacheService] deleteByPrefix: ${failedKeys.length} key(s) failed (kept in ledger for retry):`,
        failedKeys,
      )
    }
    return { deleted, notFoundKeys, failedKeys }
  }

  /**
   * ユーザーの特定ドメインのキャッシュを全て削除
   * `deleteByPrefix` の結果を返す。呼び出し側は返り値を無視しても動作する
   *（失敗時は警告ログで追跡可能。部分失敗時は `failedKeys` で検知できる）。
   */
  async invalidateUserDomain(userId: number, domain: CacheDomain): Promise<InvalidationResult> {
    const prefix = `${this.prefix}:${userId}:${domain}:`
    return this.deleteByPrefix(prefix)
  }

  /**
   * ユーザーの複数ドメインのキャッシュを一括削除
   * ドメイン別の結果を合算して返す（`deleted` は合計、`notFoundKeys`・`failedKeys` は結合）。
   * 単一ドメインの想定外 throw でも他ドメインの結果を失わないよう
   * `allSettled` で集約する。throw したドメインのキー特定不能分は警告ログに
   * 集約し、特定済みの `failedKeys` と合わせて返す。
   */
  async invalidateUserDomains(userId: number, domains: CacheDomain[]): Promise<InvalidationResult> {
    const settled = await Promise.allSettled(domains.map((domain) => this.invalidateUserDomain(userId, domain)))
    let deleted = 0
    const notFoundKeys: string[] = []
    const failedKeys: string[] = []
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        deleted += result.value.deleted
        notFoundKeys.push(...result.value.notFoundKeys)
        failedKeys.push(...result.value.failedKeys)
      } else {
        console.warn(
          `[CacheService] invalidateUserDomains: domain '${domains[index] as string}' failed (other domains aggregated):`,
          result.reason,
        )
      }
    })
    return { deleted, notFoundKeys, failedKeys }
  }

  /**
   * キャッシュスルーパターン
   * キャッシュがあれば返し、なければ fetcher を実行してキャッシュに保存
   */
  async through<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = DEFAULT_TTL_SECONDS,
  ): Promise<T> {
    // 無効時は `get`（null 返却）→ fetcher → `set`（無操作）に素通しするため、
    // 先頭での有効性直査はしない（`get`/`set` 側の判定に一本化し二重取得を避ける）。
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // fetcher を実行してキャッシュに保存
    const data = await fetcher()
    await this.set(key, data, ttlSeconds)
    return data
  }
}

// シングルトンインスタンス
export const cacheService = new CacheService()
