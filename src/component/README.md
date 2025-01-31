# Component

この配下には再利用可能なコンポーネントを配置する。

## 命名規則

- ファイル名は PascalCase で命名する。
- ファイル名は `ComponentName.tsx` とする。

## ディレクトリ構造

```
component/
├── Button/
│   ├── index.tsx
│   ├── index.stories.tsx
│   └── index.test.tsx
├── Card/
│   ├── index.tsx
│   ├── index.stories.tsx
│   └── index.test.tsx
├── ...
```

## コンポーネントの作成

- コンポーネントを作成する場合は、`component` ディレクトリ配下に新しいディレクトリを作成する。
- 新しいディレクトリには、コンポーネントのファイルと、そのコンポーネントのストーリーブックとテストファイルを配置する。
