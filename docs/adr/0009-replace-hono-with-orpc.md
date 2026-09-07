---
status: accepted
---

# HonoをoRPCに一括置換する

0006のHono温存マウントを撤回し、50+エンドポイントをoRPCに全面移行する。見通し改善のためcatch-allマウント・barrel集約・`hc<AppType>`を廃止し、互換レイヤーを残さない。auth＋zodはoRPC middlewareに共通化し、動詞・payloadはquery/mutation再分類に寄せる。
