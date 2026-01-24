# Next.js v16 アップグレード計画

## 概要

| 項目 | 値 |
|------|-----|
| 現在バージョン | 15.5.9 |
| アップグレード先 | 16.1.4 |
| 影響度 | 中 |
| 推奨実行順序 | 4 |

## 前提条件

- Node.js 20.9 以上
- @types/node のアップグレード完了（engines フィールド設定済み）

## 破壊的変更

### 1. Turbopack がデフォルトで有効化

Next.js 16 では Turbopack がデフォルトのバンドラーになります。
`--turbopack` フラグは不要になり、逆に Webpack を使用する場合は明示的に指定が必要です。

### 2. Node.js 18 のサポート終了

Node.js 18 はサポートされなくなりました。Node.js 20.9 以上が必要です。

### 3. 非同期 Request API

`cookies()`, `headers()`, `draftMode()` などの API が非同期になりました。
（Next.js 15 からの継続的な変更）

### 4. middleware → proxy の名称変更

`middleware` は `proxy` に名前が変更されました。
（本プロジェクトでは middleware を使用していないため影響なし）

## 影響を受けるファイル

### 1. package.json

```diff
{
  ...
  "scripts": {
    "predev": "bun run scripts/generate-sound-manifest.ts",
-   "dev": "next dev --turbopack",
+   "dev": "next dev",
    "prebuild": "bun run scripts/generate-sound-manifest.ts",
    "build": "next build",
    "start": "next start",
    ...
  },
  "dependencies": {
-   "next": "15.5.9",
+   "next": "16.1.4",
    ...
  }
}
```

### 2. next.config.ts（変更なし）

現在の設定は Next.js 16 と互換性があります：

```typescript
import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const nextConfig: NextConfig = {
  /* config options here */
}

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})

export default withSerwist(nextConfig)
```

## 実行手順

### Step 1: codemod を使用した自動アップグレード（推奨）

```bash
npx @next/codemod@canary upgrade latest
```

このコマンドは以下を自動的に行います：
- パッケージのアップグレード
- 非推奨 API の更新
- 設定ファイルの更新

### Step 2: 手動アップグレード（代替手順）

```bash
bun add next@16.1.4 react@latest react-dom@latest
bun add -D @types/react@latest @types/react-dom@latest
```

### Step 3: package.json の scripts 更新

`--turbopack` フラグを削除します（Turbopack がデフォルトになるため）。

### Step 4: MUI パッケージの確認

`@mui/material-nextjs` のインポートパスを確認します。
現在は `v15-appRouter` を使用していますが、`v16-appRouter` が利用可能になっている可能性があります。

```typescript
// 確認が必要
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
// ↓ 変更が必要な場合
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter'
```

### Step 5: Serwist (PWA) の互換性確認

`@serwist/next` が Next.js 16 と互換性があることを確認します。
必要に応じてアップグレードします。

### Step 6: 開発サーバーの起動確認

```bash
bun run dev
```

### Step 7: 本番ビルドの確認

```bash
bun run build
bun run start
```

## テスト観点

1. **開発サーバー**
   - `bun run dev` が正常に起動すること
   - Turbopack での開発が正常に動作すること

2. **本番ビルド**
   - `bun run build` が正常に完了すること
   - ビルド時間の変化を確認

3. **PWA 機能**
   - Service Worker が正常に生成されること
   - オフライン機能が動作すること

4. **認証機能**
   - NextAuth が正常に動作すること
   - ログイン/ログアウトが正常に動作すること

5. **API ルート**
   - Hono ベースの API が正常に動作すること
   - `/api/[...route]` のキャッチオールルートが動作すること

6. **MUI コンポーネント**
   - Material UI コンポーネントが正常に表示されること
   - SSR/CSR の切り替えが正常に動作すること

7. **ページ遷移**
   - App Router でのページ遷移が正常に動作すること
   - Server Components と Client Components の連携が正常であること

## 関連パッケージの確認

以下のパッケージも Next.js 16 との互換性を確認する必要があります：

| パッケージ | 現在バージョン | 確認事項 |
|-----------|--------------|---------|
| @serwist/next | ^9.5.0 | Next.js 16 対応バージョンの確認 |
| @mui/material-nextjs | ^7.3.0 | v16-appRouter の利用可否 |
| next-auth | ^4.24.11 | Next.js 16 との互換性 |

## 参考リンク

- [Next.js 16 公式アップグレードガイド](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js 16 リリースノート](https://nextjs.org/blog/next-16)
- [Next.js Codemods](https://nextjs.org/docs/app/guides/upgrading/codemods)

## 注意事項

- Turbopack がデフォルトになるため、Webpack 固有の設定を使用している場合は注意
- 本プロジェクトでは Webpack のカスタム設定は使用していないため、影響は最小限
- MUI と Serwist の互換性を事前に確認することを推奨
- 認証機能は重要なため、アップグレード後に十分なテストを行うこと
