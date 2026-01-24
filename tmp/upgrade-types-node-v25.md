# @types/node v25 アップグレード計画

## 概要

| 項目 | 値 |
|------|-----|
| 現在バージョン | ^20 |
| アップグレード先 | 25.0.10 |
| 影響度 | 低 |
| 推奨実行順序 | 1（最初） |

## 前提条件

- なし（他のアップグレードに依存しない）

## 破壊的変更

@types/node は Node.js の型定義パッケージであり、コードの実行には直接影響しません。
ただし、新しい API の型定義が追加され、一部の古い API の型定義が変更される可能性があります。

### 主な変更点

- Node.js 22+ の新しい API の型定義追加
- 一部のメソッドシグネチャの厳格化
- 非推奨 API の型定義の調整

## 影響を受けるファイル

### 1. package.json

```diff
{
  ...
+ "engines": {
+   "node": ">=20.19.0"
+ },
  "devDependencies": {
-   "@types/node": "^20",
+   "@types/node": "^25.0.10",
    ...
  }
}
```

## 実行手順

### Step 1: パッケージの更新

```bash
bun add -D @types/node@25.0.10
```

### Step 2: package.json に engines フィールドを追加

Vercel でのデプロイ時に Node.js バージョンを明示するため、`engines` フィールドを追加します。

```json
{
  "engines": {
    "node": ">=20.19.0"
  }
}
```

**注意:** Prisma v7 は Node.js 20.19.0 以上を要求するため、このバージョンを最低要件として設定しています。

### Step 3: 型エラーの確認

```bash
bun run build
```

ビルドが成功することを確認します。型エラーがある場合は個別に対応します。

## テスト観点

1. **TypeScript コンパイル**
   - `bun run build` が正常に完了すること
   - 新しい型定義による型エラーがないこと

2. **Vercel デプロイ**
   - Vercel が engines フィールドを認識し、適切な Node.js バージョンを使用すること

## 参考リンク

- [@types/node npm](https://www.npmjs.com/package/@types/node)
- [Vercel Node.js Version](https://vercel.com/docs/functions/runtimes/node-js)

## 注意事項

- このアップグレードは他のアップグレードに依存しないため、最初に実行可能
- engines フィールドの設定は、後続の Prisma v7 や Next.js v16 のアップグレードでも必要となる
- 本番環境の Node.js バージョンも 20.19.0 以上であることを確認すること
