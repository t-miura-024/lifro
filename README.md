# lifro

「ライフ」と「フロー（流れ）」を組み合わせた造語で、生活リズムが自然に流れるように整えるイメージです。

## 前提
- パッケージマネージャーは Bun を使用する。

##　起動
```
bun install
bun run dev
```

## ディレクトリ構造

```
web/
├── src/
│   ├── backend/
│   ├── component/
│   ├── ...
```

## 命名規則

- ディレクトリ名は PascalCase で命名する。
- ファイル名は PascalCase で命名する。
- クラス名は PascalCase で命名する。
- 関数名は camelCase で命名する。
- 変数名は camelCase で命名する。

## ホスティング

- ホスティングは Vercel Functions を使用する。

## DB

- DBは Neon（PostgreSQL） を使用する。

