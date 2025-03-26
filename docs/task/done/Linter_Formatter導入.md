# Linter/Formatter導入

# 概要
プロジェクトにLinter/Formatterを導入し、コードの品質と一貫性を確保する。技術スタック定義に従い、Biomeを導入する。

# 方針
1. Biomeのインストール
2. Biome設定ファイルの作成
3. package.jsonにlintとformat用のスクリプトを追加
4. 動作確認

# 完了の定義
- Biomeがプロジェクトに導入されている
- lint/formatコマンドがpackage.jsonに定義されている
- サンプルのコードでlint/formatの動作確認ができる

# 振り返り
## やったこと (Y)
- Biomeのインストールと設定ファイル(biome.json)の作成
- package.jsonへのlint/formatスクリプトの追加
- フォーマットルールの設定（セミコロンをasNeededに変更など）
- 動作確認の実行

## わかったこと (W)
### 技術面
- Biomeの設定はJavaScriptとTypeScriptで共通のルールを適用できる
- セミコロンの設定（asNeeded）の挙動について理解できた
- formatとlintとcheckの各コマンドの違いと使い分け

### プロセス面
- フォーマッターの設定変更→動作確認→コミットという流れが効率的
- 設定変更はできるだけ早い段階で行い、プロジェクト全体に適用すると良い

## 次にやること (T)
- テスト環境の整備（Jest/Vitestなどの導入）
- アプリケーションの基本機能の設計と実装に着手する
- UIコンポーネントのベース設計・実装
- プロジェクトのディレクトリ構造の整理
- VSCodeなどのエディタとBiomeの連携設定
