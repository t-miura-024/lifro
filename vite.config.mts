import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflare } from '@cloudflare/vite-plugin'
import {
  createApi,
  createContext,
  dev as devPlugin,
  main as mainPlugin,
} from '@serwist/vite'
import type {
  PluginOptions,
  SerwistViteApi,
  SerwistViteContext,
} from '@serwist/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * TanStack Start 用の Serwist ビルドプラグイン。
 * `@serwist/vite` 9.5.0 既定の buildPlugin（出典: `node_modules/@serwist/vite/dist/index.js`
 * の `buildPlugin`。条件 `!ctx.viteConfig.build.ssr && !ctx.options.disable`、
 * `enforce: 'post'`）を起点にしている。既定のままでは Start の client→ssr 2回
 * closeBundle の双方で大域の `build.ssr` が真となり sw.js が一度も生成されないため、
 * Vite 公式 Environments API の環境ごと条件（`this.environment.config.build.ssr`。
 * 出典: `node_modules/vite/dist/node/index.js` の `PluginContextExtension.environment`。
 * closeBundle を含む non-global hooks で利用可能な公式 API）で判定する。
 * 環境名（`client` 等）の前提は置かない。2回目の発火に備えた重複抑止は
 * `generated` フラグ一本に集約している。
 * 除去条件: Start が単一バンドルに戻るか、上流が多環境対応の単発生成を備えたら
 * 本自前合成をやめ既定の buildPlugin に戻す（PWA 除去時も同時に削除）。
 */
const buildPlugin = (
  ctx: SerwistViteContext,
  api: SerwistViteApi
): Plugin => {
  let generated = false
  return {
    name: '@serwist/vite:build',
    apply: 'build',
    enforce: 'post',
    closeBundle: {
      sequential: true,
      order: ctx.userOptions?.integration?.closeBundleOrder,
      async handler() {
        // 公式条件ベース（環境ごと）: ssr 環境では生成しない。無効化時は警告して終える。
        // `this.environment` は Vite 公式の PluginContext 拡張（型注釈なしで公式型を使う）。
        // 前提: Vite ^7 の Environments API（対応バージョン固定。`package.json` の
        // `vite` 参照）。欠落時は既知の壊れた大域値へ沈黙フォールバックせず throw する。
        // 壊れた値での build 成功（sw.js 未生成のまま合格→PWA 沈黙）を防ぐため。
        // per-env 側が undefined の場合も同様に大域へ fallback せず throw する。
        // 大域 `build.ssr` は Start の client/ssr 2回 closeBundle で真偽が混在する
        // 既知の壊れた値であり、無音 fallback は ssr 誤判定→sw.js 未生成のまま合格する。
        const environment = this.environment
        if (environment == null) {
          throw new Error('[serwist] missing build environment (expected Vite ^7 Environments API)')
        }
        const envSsr = environment.config?.build?.ssr
        if (envSsr === undefined) {
          throw new Error('[serwist] missing per-environment build.ssr (expected Vite ^7 Environments API)')
        }
        if (ctx.options.disable) {
          console.warn('[serwist] skip generateSW: plugin is disabled (development)')
          return
        }
        if (envSsr) {
          console.warn('[serwist] skip generateSW: ssr environment')
          return
        }
        // 重複抑止は本フラグ一本に集約する（2回目の closeBundle は想定内のため警告のみ）。
        if (generated) {
          console.warn('[serwist] skip generateSW: already generated once')
          return
        }
        generated = true
        await api.generateSW()
        console.info('[serwist] sw.js generated')
      },
    },
    buildEnd(error) {
      if (error) throw error
    },
  }
}

/**
 * Next 版 `next.config.ts` の `@serwist/next` と同等。
 * 単一ソース `src/sw.ts` を injectManifest 方式でバンドルし、
 * Start のクライアント出力 (`dist/client`) を precache 対象にする。
 * 開発時は Next 版と同様に無効化する。
 */
const serwistStart = (): Plugin[] => {
  const options: PluginOptions = {
    swSrc: path.resolve(rootDir, 'src/sw.ts'),
    swDest: path.resolve(rootDir, 'dist/client/sw.js'),
    swUrl: '/sw.js',
    globDirectory: path.resolve(rootDir, 'dist/client'),
    // Next 版の precache（画像・音声・アイコン・スクリーンショット含む）と同等にする。
    globPatterns: ['**/*.{js,css,html,png,svg,mp3,webmanifest,json,ico,woff2}'],
    // 生成物 sw.js 自身は precache 対象外（2回目以降の glob 対策の保険）。
    globIgnores: ['sw.js'],
    // スクリーンショット（約2.1MB）を含めるため既定の2MBから引き上げる。
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
    injectionPoint: 'self.__SW_MANIFEST',
    rollupFormat: 'iife',
    disable: process.env.NODE_ENV === 'development',
  }
  const ctx = createContext(options, undefined)
  const api = createApi(ctx)
  return [mainPlugin(ctx, api), devPlugin(ctx, api), buildPlugin(ctx, api)]
}

export default defineConfig({
  // Cloudflare Workers 配信 (ADR 0011: Static Assets＋Workers全量配信)。
  // 公式手順通り `@cloudflare/vite-plugin` を Start より前に置き、
  // Start の SSR 環境 (`ssr`) を Worker バンドル対象に指定する。
  // client 環境の出力はプラグインが静的資産として自動配信するため
  // `[assets]` の手動指定はしない。serwist (PWA) の precache 対象
  // (`dist/client`)・sw.js 生成条件は変更なし。
  plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), tanstackStart(), viteReact(), serwistStart()],
  resolve: {
    // tsconfig の paths (`@/*` → `./src/*`) と対応させる。
    // Next.js では自動解決されていた分を Vite 側に明示する。
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
})
