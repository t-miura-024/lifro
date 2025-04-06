# タイトル

DB 接続基盤構築

# 概要

Prisma と PostgreSQL を使用した DB 接続基盤を構築します。
これにより、アプリケーションからデータベースへの安全で型安全なアクセスが可能になります。

# 方針

1. DB 接続基盤の構築場所

   - `server/infrastructure/database/prisma`: Prisma 関連のセットアップを配置
   - `server/infrastructure/database/repositories`: リポジトリ実装を配置

2. Prisma のスキーマ定義（`server/infrastructure/database/prisma/schema.prisma`）

   - データソース設定: PostgreSQL (Neon)
   - モデル定義:
     - User: id, email, createdAt, updatedAt
     - Set: id, exerciseId, userId, weight, reps, date, order, createdAt, updatedAt
     - Exercise: id, userId, name, createdAt, updatedAt

3. DB 接続設定
   - 環境変数 `DATABASE_URL` による接続情報の管理
   - Neon の接続情報を設定

# 完了の定義

1. Prisma の環境構築

   - Prisma のインストール
   - スキーマの定義
   - Prisma Client の生成

2. DB 接続の確立

   - Neon への接続確認

3. マイグレーション

   - 初期マイグレーションの実行
   - マイグレーションの動作確認

4. CRUD 操作の実装確認
   - 各テーブルの CRUD 操作の動作確認

# 振り返り

## やったこと (Y)

TODO: このタスクで実際に行ったことを記載する

## わかったこと (W)

### 技術面

TODO: このタスクを通じて得られた技術的な気づきや学びを記載する

### プロセス面

TODO: このタスクを通じて得られたプロセスに関する気づきや学びを記載する

## 次にやること (T)

TODO: 今回の学びを活かして次に取り組むべきことを記載する
