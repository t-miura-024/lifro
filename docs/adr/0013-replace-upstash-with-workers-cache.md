# UpstashからWorkers Cacheへ置換する

Upstash RedisからWorkers Cache（Cache API）へ置換することを決定した。KV単体・併用の代替案を退け、Issue指定と課金要素最小化を優先した。

## Context

完了条件3はTTL付きget/set/del/scanの運用互換維持を要求する。置換先候補はCache API単体・KV単体・Cache＋KV併用であった。

## Decision

Workers Cache（Cache API）単体に置換する。Cache APIは追加課金なしであり、課金要素をWorkers＋D1＋Cache APIのみに抑える。

## KV単体・併用を退けた理由

- KV単体を退けた理由: 読み書きの従量課金要素が増え、完全無料枠内運用の監視対象が増える。Issue指定の置換先はWorkers Cacheであり、指定外のKV単体採用はしない。
- 併用を退けた理由: 二系統の無効化契約・TTL管理・運用手順が二重化し、管理一本化に反する。課金要素最小化を優先した。

## scan制約の受容判断

- `scan`/`deleteByPrefix`は当isolateの書込台帳に対する前方一致のbest-effortである。他isolate書込分は不可視で、削除されずTTL失効頼みになる。
- この制約を受容する。強い無効化が必要な系統はTTL短縮等の別途対応とし、残存窓はTTL失効（既定300秒）で閉じる運用とする。
