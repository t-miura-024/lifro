---
status: accepted
---

# file routesをディレクトリ統一する

api系ドット記法と画面系ディレクトリの混在を解消し、全体をディレクトリ統一とする。APIは`src/routes/api/`配下にpath素直写しで50+配置し、`routeTree.gen.ts`を再生成する。
