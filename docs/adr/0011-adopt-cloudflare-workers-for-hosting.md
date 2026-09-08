# HostingにCloudflare Workersを採用する

VercelからCloudflare Workers（Static Assets＋Workers全量配信）へ寄せることを決定した。Pages併用の代替案を退け、完全脱却と管理一本化を優先した。

## Context

Issue #20は完全Vercel脱却（Hosting/DB/CacheのVercel/Neon/Upstash依存ゼロ）と完全無料枠内運用を目標とする。公開はworkers.devのみ、カスタムドメインなし、本番のみ（dev/previewなし）。

## Decision

Workers（Static Assets＋Workers全量配信）に一本化する。8ルート・API・PWAを同一Workerで配信する。

## Pages併用を退けた理由

- コスト: Pages＋Workersの二系統にすると無料枠の監視対象が増える。単一Workerに寄せて課金要素をWorkers＋D1＋Cache APIのみに抑える。
- 運用: デプロイ・Metrics・secret管理をwrangler単一に一本化する。Issue方針の管理一本化を優先した。
- 制約: 本アプリはAPI・認証コールバック・PWA precacheを同一originで配信する必要があり、Hosting分離の利点がない。

## Consequences

- 良い点: デプロイ先・課金監視・手順書（`tmp/cloudflare-manual-deploy-guide.md`手順6）が単一になる。
- 悪い点: Workers単一障害点になる。超過時は停止・縮退＋手動復旧とする（ガイド手順10）。
