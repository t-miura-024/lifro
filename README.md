# Lifro

「ライフ」と「フロー（流れ）」を組み合わせた造語で、生活リズムが自然に流れるように整えるイメージです。

筋トレの記録を簡単に管理し、成果を可視化するアプリケーションです。

## 機能

- **ログ記録**: 種目・重量・レップ数を記録。前回の記録を参照しながら入力可能
- **統計ダッシュボード**: ボリューム推移、最大重量推移、継続日数などを可視化
- **Google認証**: Googleアカウントでログイン（招待制）

## ドキュメント

`docs/` 配下に集約しています。

- `docs/requirements/`: 要求定義・要件定義
- `docs/design/`: 設計ドキュメント

## セットアップ

### 1. 依存パッケージのインストール

```bash
bun install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` ファイルを編集し、以下の環境変数を設定してください：

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgres://...?sslmode=require"
DIRECT_URL="postgres://...?sslmode=require"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Development (optional)
DEV_USER_EMAIL="your-email@example.com"
```

### 3. データベースのセットアップ

```bash
# Prisma クライアントの生成
bun run db:generate

# マイグレーションの適用
bun run db:migrate

# (オプション) 初期データの投入
bun run db:seed
```

### 4. 開発サーバーの起動

```bash
bun dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開くとアプリケーションが表示されます。

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `bun dev` | 開発サーバーを起動 |
| `bun build` | プロダクションビルド |
| `bun start` | プロダクションサーバーを起動 |
| `bun run lint` | Biome でリント |
| `bun run format` | Biome でフォーマット |
| `bun run check` | リント＆フォーマットを一括実行 |
| `bun run db:generate` | Prisma クライアントを生成 |
| `bun run db:migrate` | マイグレーションを作成・適用 |
| `bun run db:seed` | 初期データを投入 |
| `bun run db:studio` | Prisma Studio を起動 |
| `bun run db:status` | マイグレーション状態を確認 |

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router), React 19, MUI 7
- **バックエンド**: Next.js Server Actions
- **データベース**: PostgreSQL (Neon), Prisma ORM
- **認証**: NextAuth.js v4 (Google OAuth)
- **グラフ**: Recharts

## ユーザー追加（招待制）

本アプリケーションは招待制のため、新規ユーザーは手動で追加する必要があります。

```bash
# Prisma Studio を起動
bun run db:studio

# users テーブルに新規レコードを追加
# email: ユーザーのGoogleアカウントのメールアドレス
```

または、`DEV_USER_EMAIL` 環境変数を設定して `bun run db:seed` を実行してください。

## Neon 利用時のポイント

- Prisma の `datasource` に `directUrl` を設定済み。マイグレーション等は `DIRECT_URL` でダイレクト接続されます
- ランタイムは `DATABASE_URL`（プーラー経由）を使用します
- どちらも `sslmode=require` を付与してください
