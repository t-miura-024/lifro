/** scan 台帳の上限件数。TTL 失効で掃除しきれない肥大を抑える。超過時は最古から追い出す。 */
export const MAX_LEDGER_SIZE = 1000

/**
 * scan 互換のためのキー台帳。当 isolate が `set` したキーのみを保持する。
 * `CacheService` の Cache API 委譲とは責務を分け、本クラスが台帳管理
 * （有効期限付き記録・失効掃除・前方一致検索・件数上限）に専念する。
 *
 * 件数上限の打ち切り方針: 上限超過時は最古（挿入順先頭）から追い出す。
 * 追い出されたキーは Cache API 上には TTL まで残るが、台帳から消えるため
 * `scan`/`deleteByPrefix` の無効化対象外になる（best-effort の制約）。
 * 追い出し発生時は警告ログで観測可能にし、返り値でも明示する。
 * 強い無効化が必要な系統は TTL 短縮・キー版付けで古値窓を閉じるか、
 * キャッシュ対象外にすること。
 */
export class IsolateKeyLedger {
  /** キー → 有効期限（epoch ms）。`set` 時に TTL から算出する。 */
  private readonly entries = new Map<string, number>()

  /** 台帳の記録件数（失効掃除前）。`scan`/`deleteByPrefix` の早期脱出用。 */
  get size(): number {
    return this.entries.size
  }

  /**
   * 記録。件数上限超過時は最古（挿入順先頭）から追い出す。
   *
   * TTL の仕様: 呼び出し側で正規化済みの有限・正値を渡すこと（`CacheService` は
   * `normalizeTtlSeconds` で非有限値の既定化・範囲丸めを行う）。本クラス側では
   * 正規化を二重化せず、不正値（非有限・0 以下）は fail-fast で throw する。
   *
   * @returns 追い出したキー一覧（空なら追い出しなし）。追い出し分は
   * Cache API に TTL まで残るが無効化対象外になる。
   */
  add(key: string, ttlSeconds: number): string[] {
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error(`[IsolateKeyLedger] Invalid ttlSeconds: ${ttlSeconds}`)
    }
    if (this.entries.has(key)) {
      this.entries.delete(key)
    }
    this.entries.set(key, Date.now() + ttlSeconds * 1000)
    const evicted: string[] = []
    while (this.entries.size > MAX_LEDGER_SIZE) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) {
        break
      }
      this.entries.delete(oldest)
      evicted.push(oldest)
    }
    if (evicted.length > 0) {
      console.warn(
        `[IsolateKeyLedger] ledger overflow: evicted ${evicted.length} oldest key(s) (out of invalidation scope until TTL expiry):`,
        evicted,
      )
    }
    return evicted
  }

  /**
   * 台帳から除去する。削除成功時のみ呼ぶこと。失敗時は残して
   * 次回 `scan` で再検出・再試行可能にする（成功扱いの握りつぶし防止）。
   */
  remove(key: string): void {
    this.entries.delete(key)
  }

  /**
   * 失効分を掃除して前方一致で返す（best-effort。当 isolate 書込分のみ）。
   * 件数上限による打ち切りはしない: 一致分は全件返す（最大で台帳上限件数）。
   */
  scan(prefix: string): string[] {
    if (this.entries.size === 0) {
      return []
    }
    const now = Date.now()
    const matched: string[] = []
    for (const [key, expiresAt] of this.entries) {
      if (expiresAt <= now) {
        this.entries.delete(key)
        continue
      }
      if (key.startsWith(prefix)) {
        matched.push(key)
      }
    }
    return matched
  }
}
