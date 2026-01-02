# 未使用カラム・テーブルの削除計画

## 概要
現在のアプリケーション実装とデータベーススキーマ（`prisma/schema.prisma`）およびテーブル定義書（`docs/design/テーブル定義.md`）を比較・分析した結果、以下の要素がアプリケーションで使用されていない、または不要であると判断されました。これらを削除することで、データベース構造を最適化します。

## 削除対象

### 1. `VerificationToken` テーブル（モデル）
- **理由**: 現在の認証フロー（`src/auth.ts`）では `GoogleProvider` のみが設定されており、Email Provider（マジックリンク等）は使用されていません。また、`createUser` も無効化されているため、メール検証用のトークンを保存するこのテーブルは不要です。
- **削除カラム**: テーブルごと削除
  - `identifier`
  - `token`
  - `expires`

### 2. `User.emailVerified` カラム
- **理由**: 上記同様、NextAuth の Email Provider を使用していないため、アプリケーション側でメール認証日時を参照・更新するロジックが存在しません（コードベース検索で利用箇所なし）。`GoogleProvider` からの情報としては取得される可能性がありますが、アプリのロジックとしては不要です。
- **削除カラム**: `users.email_verified` (`User.emailVerified`)

## 作業手順

### Step 1: Prismaスキーマの更新
`prisma/schema.prisma` から以下の定義を削除します。
1. `model VerificationToken { ... }` ブロック全体
2. `model User` 内の `emailVerified DateTime? @map("email_verified")` 行

### Step 2: マイグレーションの作成と適用
スキーマ変更をデータベースに適用します。
```bash
npx prisma migrate dev --name remove_unused_auth_columns
```
※ これにより、DB上の `verification_tokens` テーブルと `users.email_verified` カラムが削除されます（データが含まれている場合は失われますが、不要データのため問題ありません）。

### Step 3: ドキュメントの更新
`docs/design/テーブル定義.md` から削除された項目を除外します。
1. `## users - ユーザー` の表から `email_verified` の行を削除
2. `### verification_tokens - 検証トークン` のセクション全体を削除

### Step 4: 動作検証
1. ビルドが通ることを確認（`npm run build`）。NextAuthの型定義等で競合がないかチェック。
2. アプリケーションを起動し、Googleログイン（ログアウト→ログイン）が正常に動作することを確認。
   - `PrismaAdapter` が `emailVerified` カラムがないことによってエラーを吐かないか確認（通常はオプショナルまたはスキーマに合わせて動作するはずですが、念のため確認）。

## 備考
- `Account` テーブルの `refresh_token`, `access_token` 等のカラムについても、現在のアプリロジックでは明示的に参照していませんが、NextAuth の `PrismaAdapter` がデフォルトで保存しようとするため、今回は削除対象外とします（削除するとログイン時にエラーになる可能性があります）。
