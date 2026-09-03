# lifro

トレーニング記録アプリのドメイン文脈。種目・記録・タイマー・メモ・統計を扱う。

## Language

**純粋移行**:
ORM置換のみを行いスキーマ変更・ダウンタイム・機能追加を伴わない移行。
_Avoid_: ついで改修を含む移行

**差分なし移行**:
既存DBに対してテーブル・index・列定義の差分を出さない切替方式。
_Avoid_: スキーマ再設計を伴う移行

**Repository層**:
`src/server/infrastructure/repositories/` 配下の永続化実装群。移行対象の中核。
_Avoid_: Service, API handler

**authアダプタ**:
`auth.ts` で使う NextAuth 用永続化アダプタの総称。Drizzle用に置換する。
_Avoid_: 認証プロバイダ自体

**client singleton**:
DBクライアントのプロセス内共有インスタンス。Drizzle版に置換する。
_Avoid_: リクエスト毎生成のクライアント

**手動スモーク**:
ビルド・型に加えた主要導線の目視確認。自動テストの代替。
_Avoid_: 自動テスト、E2E
