import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user?: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

// M4（ADR 0008）: 上記の next-auth 拡張は Next 資産温存のため M5 一括切替まで維持する。
// Start 側の正本は better-auth の推論セッション型とし、正本は `@/auth` のみ。
// 本ファイルは再exportに留め、型の二重定義による乖離を避ける。
// ランタイムへの影響はない（型のみ）。
export type { AuthSession, AuthUser } from '@/auth'
