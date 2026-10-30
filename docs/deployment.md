# デプロイ

`main` ブランチへの push を契機に、GitHub Actions が本番（Cloudflare Workers）へ自動デプロイする。
ワークフローは `.github/workflows/deploy.yml`。

## 流れ

1. `main` への push（または GitHub Actions の手動実行）
2. 依存関係のインストール（`bun install --frozen-lockfile`）
3. `bun run lint`
4. `bun run typecheck`
5. `bun run build`
6. D1 マイグレーションの適用（`wrangler d1 migrations apply lifro --remote`）
7. `wrangler deploy`

lint / typecheck / build のいずれかが失敗した場合、マイグレーションとデプロイは実行されない。
マイグレーションが失敗した場合、デプロイは実行されない。

## 初回セットアップ

### 1. Cloudflare API トークン

Cloudflare ダッシュボード → My Profile → API Tokens → Create Token → Create Custom Token で作成する。

- 名前: `lifro-github-actions`
- 権限:
  - Account > Workers Scripts > Edit
  - Account > D1 > Edit
  - Account > Account Settings > Read
  - User > User Details > Read
  - User > Memberships > Read
- Account resources: 対象アカウント
- TTL: 無期限（自動デプロイを止めないため）

### 2. GitHub Secrets

```bash
gh secret set CLOUDFLARE_API_TOKEN -R t-miura-024/lifro
gh secret set CLOUDFLARE_ACCOUNT_ID -R t-miura-024/lifro --body "c708ddec3406bb26aea6efe401f759ac"
```

`CLOUDFLARE_API_TOKEN` は作成したトークンの値を貼り付ける。`gh secret list -R t-miura-024/lifro` で登録を確認できる。

### 3. 初回デプロイ

Secrets 設定後に `main` へマージして push する。GitHub Actions の `Deploy production` が起動し、成功すると本番が更新される。

## 通常運用

- `main` への push はすべてデプロイ対象（docs のみの変更も含む）。
- 手動で再実行したい場合は、GitHub Actions の `Deploy production` → `Run workflow` を `main` ブランチで実行する。
- 同時実行は `production-deploy` グループで直列化される。実行中のデプロイは中断されない。

## 失敗時

- 本番は直前の成功バージョンのまま残る。
- マイグレーション成功後にデプロイだけが失敗した場合、DB は新スキーマのまま旧コードが動く。後方互換の原則で吸収する。
- GitHub Actions のログを確認し、原因を修正して `main` へ再 push する。
- 通知は GitHub の標準通知（メール / Actions 画面）を使う。

## ロールバック

コードのみを戻す場合:

```bash
bunx wrangler rollback
```

D1 のデータも戻す必要がある場合は、D1 Time Travel を別途使う。ロールバックは自動化していない（手動判断）。

## D1 マイグレーションの原則

- マイグレーションは後方互換（列・テーブルの追加など）を原則とする。
- 破壊的変更（列削除・型変更など）は、旧コードと新コードが共存できる2段階デプロイにする。
- マイグレーションはデプロイ前に自動適用され、適用後にバックアップが取得される。
- 失敗したマイグレーションはロールバックされ、デプロイは実行されない。

## 手動デプロイ（非常用）

通常は自動デプロイを使う。GitHub Actions が使えない場合の非常口:

```bash
bun run deploy
```

`bun run deploy` は build → D1 マイグレーション → `wrangler deploy` を実行する。Cloudflare の OAuth ログイン（`bunx wrangler login`）が必要。

## 補足

- 本番のみ。プレビュー環境は作らない。
- Cloudflare は Free プラン、公開は `workers.dev` のみ。
- ビルド・デプロイの設定はリポジトリで管理する（GitHub Actions）。
