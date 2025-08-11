# lifro
「ライフ」と「フロー（流れ）」を組み合わせた造語で、生活リズムが自然に流れるように整えるイメージです。

# Document
`docs`配下に集約しています。

## 起動

```bash
bun install
bun dev
```

ブラウザで[http://localhost:3000](http://localhost:3000)を開くと結果が表示されます。

## DBセットアップ

```bash
# 1) .env を用意（.env.example をコピー）
cp .env.example .env
# DATABASE_URL: プーラー経由の接続文字列（ep-...-pooler...）
# DIRECT_URL  : ダイレクト接続の接続文字列（ep-...）

# 2) 依存インストール＆Prisma生成
bun install
bun run db:generate

# 3) スキーマをDBに反映
# 開発: マイグレーションを作成・適用
bun run db:migrate

# 4) 状態確認（参考）
# マイグレーションの状態
bunx prisma migrate status
# テーブルの可視化（Studio）
bun run db:studio
```

### Neon利用時のポイント
- Prismaの`datasource`に`directUrl`を設定済み。マイグレーション等は`DIRECT_URL`でダイレクト接続されます
- ランタイムは`DATABASE_URL`（プーラー経由）を使用します
- どちらも`sslmode=require`を付与してください
