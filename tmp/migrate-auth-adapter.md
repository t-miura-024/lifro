# @next-auth/prisma-adapter から @auth/prisma-adapter への移行計画

## 概要

| 項目 | 値 |
|------|-----|
| 移行元 | @next-auth/prisma-adapter ^1.0.7 |
| 移行先 | @auth/prisma-adapter ^2.10.0（インストール済み） |
| 影響度 | 低 |
| 推奨実行順序 | 3 |

## 背景

- `@next-auth/prisma-adapter` は3年前から更新されておらず、非推奨となっています
- `@auth/prisma-adapter` が後継パッケージとして活発にメンテナンスされています
- 本プロジェクトでは `@auth/prisma-adapter` が既にインストールされていますが、使用されていません

## 現在の状態

### package.json

両方のパッケージがインストールされています：

```json
{
  "dependencies": {
    "@auth/prisma-adapter": "^2.10.0",
    "@next-auth/prisma-adapter": "^1.0.7",
    ...
  }
}
```

### src/auth.ts

`@next-auth/prisma-adapter` が使用されています：

```typescript
import { PrismaAdapter } from '@next-auth/prisma-adapter'
```

## 影響を受けるファイル

### 1. src/auth.ts

```diff
import { prisma } from '@/server/infrastructure/database/prisma/client'
- import { PrismaAdapter } from '@next-auth/prisma-adapter'
+ import { PrismaAdapter } from '@auth/prisma-adapter'
import NextAuth, { getServerSession } from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import type { Adapter } from 'next-auth/adapters'
import GoogleProvider, { type GoogleProfile } from 'next-auth/providers/google'

const baseAdapter = PrismaAdapter(prisma)
const adapter: Adapter = {
  ...baseAdapter,
  // 既存ユーザー以外の自動作成を禁止
  async createUser() {
    throw new Error('USER_NOT_ALLOWED')
  },
}

// ... 以下変更なし
```

### 2. package.json

```diff
{
  "dependencies": {
-   "@auth/prisma-adapter": "^2.10.0",
+   "@auth/prisma-adapter": "^2.11.1",
-   "@next-auth/prisma-adapter": "^1.0.7",
    ...
  }
}
```

## 実行手順

### Step 1: インポート文の変更

`src/auth.ts` のインポート文を変更します：

```typescript
// Before
import { PrismaAdapter } from '@next-auth/prisma-adapter'

// After
import { PrismaAdapter } from '@auth/prisma-adapter'
```

### Step 2: @auth/prisma-adapter の更新

最新版に更新します：

```bash
bun add @auth/prisma-adapter@2.11.1
```

### Step 3: @next-auth/prisma-adapter の削除

非推奨パッケージを削除します：

```bash
bun remove @next-auth/prisma-adapter
```

### Step 4: 型チェック

型エラーがないことを確認します：

```bash
bun run build
```

### Step 5: 認証機能のテスト

ログイン/ログアウト機能が正常に動作することを確認します。

## API の互換性

`@auth/prisma-adapter` は `@next-auth/prisma-adapter` と API 互換性があります。
`PrismaAdapter` 関数のシグネチャは同一です：

```typescript
// 両方とも同じ使い方
const adapter = PrismaAdapter(prisma)
```

## テスト観点

1. **ログイン機能**
   - Google OAuth でログインできること
   - 既存ユーザーのみログイン可能であること（createUser の無効化が機能していること）

2. **セッション管理**
   - データベースセッション戦略が正常に動作すること
   - セッションの作成・更新・削除が正常に行われること

3. **アカウント連携**
   - Google アカウントとの連携が正常に動作すること
   - `allowDangerousEmailAccountLinking` が正常に機能すること

4. **コールバック**
   - `signIn` コールバックが正常に動作すること
   - `session` コールバックが正常に動作すること（user.id がセッションに含まれること）

## 参考リンク

- [@auth/prisma-adapter npm](https://www.npmjs.com/package/@auth/prisma-adapter)
- [Auth.js Prisma Adapter Documentation](https://authjs.dev/getting-started/adapters/prisma)
- [NextAuth.js v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5)

## 注意事項

- この移行は NextAuth v4 を使用し続ける場合の対応です
- 将来的に NextAuth v5（Auth.js）への移行を検討する場合は、より大規模な変更が必要になります
- 移行後は必ず認証機能の動作確認を行ってください
- Prisma v7 へのアップグレードの前に完了させることを推奨します（インポートパスの変更が重なるため）

## 将来の検討事項

NextAuth v5 への移行を検討する場合、以下の追加変更が必要になります：

- `next-auth` → `@auth/core` + `@auth/nextjs` への移行
- 設定ファイルの構造変更
- API ルートの更新
- セッション取得方法の変更

現時点では NextAuth v5 はまだベータ版のため、この移行計画では v4 を維持しつつアダプターのみを移行します。
