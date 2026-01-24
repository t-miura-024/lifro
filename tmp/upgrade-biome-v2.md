# Biome v2 アップグレード計画

## 概要

| 項目 | 値 |
|------|-----|
| 現在バージョン | ^1.9.4 |
| アップグレード先 | 2.3.11 |
| 影響度 | 低 |
| 推奨実行順序 | 2 |

## 前提条件

- なし（他のアップグレードに依存しない）

## 破壊的変更

### 1. Rome 関連の命名変更

- `rome.json` → `biome.json`（本プロジェクトは既に biome.json を使用）
- `// rome-ignore` → `// biome-ignore`（本プロジェクトは既に biome-ignore を使用）

### 2. 一部ルールの修正レベル変更

以下のルールの fix が safe から unsafe に変更されています：
- `noFlatMapIdentity`
- `noUnusedImports`

必要に応じて biome.json で明示的に safe に設定可能。

### 3. CLI オプションの変更

`--config-path` オプションが `biome lsp-proxy` と `biome start` コマンドから削除されました。

### 4. パス解決の変更

Glob とパスは作業ディレクトリではなく、設定ファイルの場所から解決されるようになりました。

## 影響を受けるファイル

### 1. biome.json

```diff
{
- "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
+ "$schema": "https://biomejs.dev/schemas/2.3.11/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentWidth": 2,
    "indentStyle": "space",
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "asNeeded"
    }
  },
  "files": {
    "ignore": [".next/**", "node_modules/**"]
  }
}
```

### 2. package.json

```diff
{
  ...
  "devDependencies": {
-   "@biomejs/biome": "^1.9.4",
+   "@biomejs/biome": "^2.3.11",
    ...
  }
}
```

## 実行手順

### Step 1: パッケージの更新

```bash
bun add -D @biomejs/biome@2.3.11
```

### Step 2: 自動マイグレーションの実行

Biome には自動マイグレーションツールが用意されています：

```bash
bunx @biomejs/biome migrate --write
```

このコマンドは設定ファイルを自動的に v2 形式に更新します。

### Step 3: スキーマ URL の確認

`biome.json` の `$schema` が正しく更新されていることを確認します。

### Step 4: lint と format の実行

```bash
bun run lint
bun run format
bun run check
```

すべてのコマンドが正常に動作することを確認します。

## テスト観点

1. **lint コマンド**
   - `bun run lint` が正常に完了すること
   - 新しいルールによる警告・エラーがないこと（または許容範囲内であること）

2. **format コマンド**
   - `bun run format` が正常に完了すること
   - フォーマット設定（single quote, trailing commas, no semicolons）が維持されていること

3. **check コマンド**
   - `bun run check` が正常に完了すること

4. **IDE 連携**
   - VSCode/Cursor の Biome 拡張機能が正常に動作すること

## 現在の設定（参考）

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentWidth": 2,
    "indentStyle": "space",
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "asNeeded"
    }
  },
  "files": {
    "ignore": [".next/**", "node_modules/**"]
  }
}
```

## 参考リンク

- [Biome v2 公式アップグレードガイド](https://biomejs.dev/guides/upgrade-to-biome-v2)
- [Biome Changelog](https://biomejs.dev/internals/changelog/)

## 注意事項

- 開発ツールのため、本番環境には直接影響しない
- `migrate` コマンドで自動的に設定ファイルが更新されるため、比較的安全
- カスタムルールを追加している場合は、v2 での対応を確認する必要がある（本プロジェクトは recommended のみ使用）
