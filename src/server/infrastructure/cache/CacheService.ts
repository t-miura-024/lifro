import { Redis } from '@upstash/redis'
import superjson from 'superjson'

/** キャッシュのデフォルトTTL（秒） */
const DEFAULT_TTL_SECONDS = 300 // 5分

/** キャッシュドメイン */
export type CacheDomain = 'exercise' | 'training' | 'statistics' | 'memo' | 'timer' | 'bodyPart'

/**
 * Redis キャッシュサービス
 * Upstash Redis を使用したキャッシュ機能を提供
 */
export class CacheService {
  private redis: Redis | null = null
  private readonly prefix = 'lifro'

  constructor() {
    // 環境変数が設定されている場合のみ Redis クライアントを初期化
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    }
  }

  /**
   * キャッシュが有効かどうか
   */
  isEnabled(): boolean {
    return this.redis !== null
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
    if (!this.redis) {
      return null
    }

    try {
      const data = await this.redis.get<Parameters<typeof superjson.deserialize>[0]>(key)
      if (data === null) {
        return null
      }
      return superjson.deserialize<T>(data)
    } catch (error) {
      console.error('[CacheService] get error:', error)
      return null
    }
  }

  /**
   * キャッシュにデータを保存
   */
  async set<T>(key: string, value: T, ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<void> {
    if (!this.redis) {
      return
    }

    try {
      const serialized = superjson.serialize(value)
      await this.redis.set(key, serialized, { ex: ttlSeconds })
    } catch (error) {
      console.error('[CacheService] set error:', error)
    }
  }

  /**
   * キャッシュを削除
   */
  async delete(key: string): Promise<void> {
    if (!this.redis) {
      return
    }

    try {
      await this.redis.del(key)
    } catch (error) {
      console.error('[CacheService] delete error:', error)
    }
  }

  /**
   * プレフィックスに一致するキャッシュを一括削除
   * ワイルドカードパターンをサポート
   */
  async deleteByPrefix(prefix: string): Promise<void> {
    if (!this.redis) {
      return
    }

    try {
      // SCAN を使用してキーを取得し、一括削除
      let cursor: string = '0'
      const pattern = `${prefix}*`

      do {
        const result = await this.redis.scan(cursor, {
          match: pattern,
          count: 100,
        })
        cursor = String(result[0])
        const keys = result[1]

        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      } while (cursor !== '0')
    } catch (error) {
      console.error('[CacheService] deleteByPrefix error:', error)
    }
  }

  /**
   * ユーザーの特定ドメインのキャッシュを全て削除
   */
  async invalidateUserDomain(userId: number, domain: CacheDomain): Promise<void> {
    const prefix = `${this.prefix}:${userId}:${domain}:`
    await this.deleteByPrefix(prefix)
  }

  /**
   * ユーザーの複数ドメインのキャッシュを一括削除
   */
  async invalidateUserDomains(userId: number, domains: CacheDomain[]): Promise<void> {
    await Promise.all(domains.map((domain) => this.invalidateUserDomain(userId, domain)))
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
    // キャッシュが無効な場合は直接 fetcher を実行
    if (!this.redis) {
      return fetcher()
    }

    // キャッシュを確認
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
