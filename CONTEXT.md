# lifro

トレーニング記録アプリのドメイン文脈。種目・記録・タイマー・メモ・統計を扱う。

## Language

**純粋移行**:
フレームワーク置換のみを行いスキーマ変更・ダウンタイム・機能追加を伴わない移行。
_Avoid_: ついで改修を含む移行

**差分なし移行**:
既存DBに対してテーブル・index・列定義の差分を出さない切替方式。
_Avoid_: スキーマ再設計を伴う移行

**Repository層**:
`src/server/infrastructure/repositories/` 配下の永続化実装群。今回は温存対象であり、移行の中核は `src/app/**`（8ルート＋API entry＋PWA）。
_Avoid_: Service, API handler

**authアダプタ**:
better-auth＋Drizzleアダプタの永続化設定の総称。再ログイン移行を許容する。
_Avoid_: 認証プロバイダ自体

**client singleton**:
DBクライアントのプロセス内共有インスタンス（Drizzle版で完了済み）。残課題はStart/Vite対応。
_Avoid_: リクエスト毎生成のクライアント

**手動スモーク**:
ビルド・型に加えた主要導線の目視確認。自動テストの代替。
_Avoid_: 自動テスト、E2E

**移行完了**:
全8ルート＋API＋認証＋PWAを同等動作で置き換え、稼働停止なし・既存データ互換を満たした状態。
_Avoid_: 部分置換、一時縮退を含む完了

**同等動作**:
表示・遷移・API応答・Googleログイン・PWA（オフライン含む）が現行と変わらず動くこと。
_Avoid_: 目視のみの確認

**先行移行**:
TanStack Start化をCloudflare化より先に行い、Cloudflare対応は対象外とすること。
_Avoid_: Issue 20との一体移行

**DB・キャッシュ温存**:
Drizzle/Neon/Upstash層は変更せず、既存データ互換を維持すること。
_Avoid_: DB・キャッシュ層の再設計

**oRPC試験導入**:
完了条件に含めない検証目的の導入。読み取り専用の小系統で試験し、型安全呼び出しと既存Honoとの共存確認を成功基準とする。
_Avoid_: oRPC本格導入

**無料枠運用**:
Cloudflare側を課金発生させずに運用すること。超過時は停止・縮退を許容し、アラート＋手動復旧する。
_Avoid_: 実質無料、少額課金許容

**Cloudflare系**:
Workers＋D1＋Workers Cache＋Static Assetsの総称。Vercel/Neon/Upstashの置換先。
_Avoid_: Pages単体、KV単体

**完全Vercel脱却**:
Vercel/Neon/Upstash依存をゼロにし、Authコールバック・Env・PWA静的資産・vercel.svg除去まで含めてCloudflare側に寄せること。
_Avoid_: Hostingのみ移行、3点のみ移行
