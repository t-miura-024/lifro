# Prisma v7 アップグレード計画

## 概要

| 項目 | 値 |
|------|-----|
| 現在バージョン | ^5.16.1 |
| アップグレード先 | 7.3.0 |
| 影響度 | 高 |
| 推奨実行順序 | 5（最後） |

## 前提条件

- Node.js 20.19.0 以上（推奨: 22.x）
- TypeScript 5.4.0 以上（推奨: 5.9.x）
- ESM モジュール形式への移行

## 破壊的変更

### 1. ESM モジュール形式の必須化

`package.json` に `"type": "module"` を追加する必要があります。

```json
{
  "type": "module",
  ...
}
```

### 2. Generator 設定の変更

`prisma/schema.prisma` で `prisma-client-js` から `prisma-client` に変更し、`output` フィールドが必須になります。

**変更前:**
```prisma
generator client {
    provider = "prisma-client-js"
}
```

**変更後:**
```prisma
generator client {
    provider = "prisma-client"
    output   = "./generated/prisma"
}
```

### 3. インポートパスの変更

生成された Prisma Client のインポートパスが変更されます。

**変更前:**
```typescript
import { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
```

**変更後:**
```typescript
import { PrismaClient } from '../prisma/generated/prisma'
import { Prisma } from '../prisma/generated/prisma'
```

## 影響を受けるファイル

### 1. package.json

```diff
{
  "name": "lifro",
  "version": "0.1.0",
  "private": true,
+ "type": "module",
  ...
  "dependencies": {
-   "@prisma/client": "^5.16.1",
+   "@prisma/client": "^7.3.0",
    ...
  },
  "devDependencies": {
-   "prisma": "^5.16.1"
+   "prisma": "^7.3.0"
  }
}
```

### 2. prisma/schema.prisma

```diff
generator client {
-   provider = "prisma-client-js"
+   provider = "prisma-client"
+   output   = "./generated/prisma"
}

datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
}
```

### 3. src/server/infrastructure/database/prisma/client.ts

```diff
- import { PrismaClient } from '@prisma/client'
+ import { PrismaClient } from '../../../../prisma/generated/prisma'

const globalForPrisma = globalThis as {
  prisma?: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
```

### 4. src/server/infrastructure/repositories/prisma/ExerciseRepository.ts

```diff
- import { Prisma } from '@prisma/client'
+ import { Prisma } from '../../../../prisma/generated/prisma'
```

### 5. src/server/infrastructure/repositories/prisma/TimerRepository.ts

```diff
- import { Prisma } from '@prisma/client'
+ import { Prisma } from '../../../../prisma/generated/prisma'
```

### 6. src/server/application/services/StatisticsService.ts

```diff
- import { Prisma } from '@prisma/client'
+ import { Prisma } from '../../../prisma/generated/prisma'
```

## 実行手順

### Step 1: パッケージの更新

```bash
bun remove @prisma/client prisma
bun add @prisma/client@7.3.0
bun add -D prisma@7.3.0
```

### Step 2: package.json の更新

`"type": "module"` を追加します。

### Step 3: prisma/schema.prisma の更新

generator ブロックを更新します。

### Step 4: Prisma Client の再生成

```bash
bun run db:generate
```

### Step 5: インポートパスの更新

上記の影響を受けるファイルのインポートパスを更新します。

### Step 6: .gitignore の更新

生成されたファイルを除外に追加（任意）:

```gitignore
prisma/generated/
```

## テスト観点

1. **Prisma Client の生成**
   - `bun run db:generate` が正常に完了すること

2. **マイグレーションの動作**
   - `bun run db:migrate` が正常に動作すること
   - `bun run db:status` でマイグレーション状態が確認できること

3. **CRUD 操作**
   - 全てのリポジトリで CRUD 操作が正常に動作すること

4. **トランザクション**
   - `$transaction` を使用している箇所が正常に動作すること
   - TrainingRepository.save()
   - TrainingMemoRepository.saveAll()
   - TimerRepository.update()

5. **Raw クエリ**
   - `$executeRaw` / `$queryRaw` を使用している箇所が正常に動作すること
   - ExerciseRepository.updateSortOrder()
   - TimerRepository.updateSortOrder()
   - StatisticsService の各集計クエリ

## 参考リンク

- [Prisma v7 公式アップグレードガイド](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- [Prisma 7 アナウンス](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0)

## 注意事項

- MongoDB はまだサポートされていません（本プロジェクトは PostgreSQL なので問題なし）
- ESM 化はプロジェクト全体に影響するため、他のアップグレードと同時に行うことを推奨
- Next.js 16 と同時にアップグレードすることで、ESM 化の影響を一度に対処可能
