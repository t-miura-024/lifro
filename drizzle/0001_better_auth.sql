-- better-auth 既定スキーマへの載せ替え（ADR 0008、M4）。
-- 方針: 旧 next-auth 型テーブル（users / accounts / sessions）は温存し、
-- 新テーブル（user / session / account / verification）を追加する非破壊移行。
-- 既存セッション・旧 OAuth アカウント紐付けは引き継がず、全員再ログイン
--（grill Q1 確定）。旧テーブルは切戻し用に残し、M5 一括切替で削除する。
-- 適用前にバックアップを取得し、DB 差分・不具合検出時は本マイグレーション
-- 未適用の旧ビルドに戻す（完了条件 6）。
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp (3) NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp (3),
	"refresh_token_expires_at" timestamp (3),
	"scope" text,
	"password" text,
	"issuer" text NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp (3) NOT NULL,
	"created_at" timestamp (3) DEFAULT now(),
	"updated_at" timestamp (3) DEFAULT now()
);
--> statement-breakpoint
-- FK2件は冪等ガード付き（`ALTER TABLE ADD CONSTRAINT` は PG 構文上 `IF NOT EXISTS`
-- 不可のため、`pg_constraint` 存在確認の DO ブロックで包む。再適用時の重複制約
-- エラー停止を避け、切替リトライの回復を保つ）。
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_user_id_user_id_fk') THEN
    ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'account_user_id_user_id_fk') THEN
    ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_key" ON "user" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "session_token_key" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
-- 既存行の UPDATE 移行: users → "user"。
-- id は text 化して継承し、ドメイン層（exercises.user_id 等の integer FK →
-- 旧 users.id）との互換を維持する。auth.ts の create.before も同規則で採番する。
-- email_verified=true の根拠: 旧 users 行は旧 next-auth の Google プロバイダ経由でのみ
-- 作成されたアドレスに限られる（auth.legacy.ts の GoogleProvider＋signIn ゲートが
-- 既存 email のみ許可）。Google が所有証明済みの verified email のため、新 user でも
-- verified 扱いとする（初回 OAuth 時の暗黙リンクに必要）。
-- dispute への回答（防御側との整合性）: 旧 signIn は存在のみで verified を見なかったが、
-- 移行後の防御は二重化されている。(1) `src/auth.ts` の validateUserInfo が
-- `emailVerified === true` の既存 email のみを通し、(2) create.before も未検証 email を
-- fail-closed で throw する。移行複写時の true は Google 発行アドレス自体の verified 性に
-- 由来し、新規 OAuth 時の validate/before の verified 必須化と合わせた二重防御になる。
-- false 既定への変更は初回 OAuth 時の暗黙リンクを壊し招待済み正規ユーザの再ログイン不能を
-- 招くため採用しない（判断記録）。
-- name は旧 Adapter が保持しなかったため local-part で補完する（表示のみ。以降は
-- better-auth が OAuth プロフィールで管理し、再適用時は温存する）。
-- image は旧スキーマに存在しないため初回 NULL。以降は better-auth が管理し温存する。
-- created_at は旧値を継承し以降不変。updated_at のみ移行時点の値を記録する。
-- 再適用ポリシー（冪等ガード）:
-- - DDL は `IF NOT EXISTS` 付きで再適用時の `already exists` 停止を避ける（B2）。
--   `ALTER TABLE ... ADD CONSTRAINT`（FK2件）のみ PG 構文上 `IF NOT EXISTS` が
--   付与できないため、再適用時は同名制約の存在確認後に実行すること。
-- - DML は `ON CONFLICT DO NOTHING` で既存行を温存する。
-- 切替後に better-auth 側で更新された email / name / image / email_verified を
-- 旧 users の古い値で上書きしないための決定。再適用時は未移行行のみ追加される。
-- email 正規化: better-auth は全経路で `email.toLowerCase()` する（実測:
-- `better-auth/dist/db/internal-adapter.mjs` の createUser/createOAuthUser）。
-- 旧行 `Foo@Ex.com` をそのまま複写すると、OAuth 後の招待照会（lowercase）と
-- 不一致になり招待済み正規ユーザが弾かれるか重複行が別 id で作られる。
-- そのため複写時に `lower("email")` で正規化する（`src/auth.ts` の
-- findLegacyUserId も lower 比較に統一済み）。name の local-part も正規化後の
-- 値から切り出す。UNIQUE(email) のため、大文字小文字違いの重複旧行がある場合は
-- 生存規則に従い1行のみ複写し、残りは `ON CONFLICT DO NOTHING` で skip する。
-- 生存規則（logic-2・決定的）: `created_at` 最古を優先し、同値は `id` 最小を
-- 優先する（下記 `ORDER BY "created_at", "id"`。`src/auth.ts` の
-- findLegacyUserId も同一 ORDER BY で同一行を引く）。敗者側の訓練記録は
-- 孤児化し得るため、適用前必須ゲートの通過（重複 0 件）が適用条件。
-- 制約対象を指定しない素の `DO NOTHING` は id 競合・email 競合の双方を温存扱いにし、
-- 文全体の abort を起こさない。
-- DB 強制層の選定（ai-1）: `UNIQUE(lower(email))` 式インデックスには変えない。
-- better-auth 既定スキーマ（`auth-schema.ts` の `uniqueIndex.on(t.email)`）との
-- 差分を作ると将来の `drizzle-kit generate` 差分・better-auth 動作前提との乖離を
-- 招く。`CHECK(email = lower(email))` も同様に既定スキーマ外であり、better-auth
-- の全書込経路の lowercase 化の監査が不完全なまま入れると正規書込を fail-closed で
-- 壊す恐れがある。よって DB 側の式強制は見送り、代わりに下記の適用前必須ゲート
-- （読取のみ・違反時は abort）で重複混入を遮断する。以降の email 書込は
-- better-auth 経路（全経路 lowercase 化）に一本化し、直 SQL 書込は migration 経由の
-- Human 操作に限る（残余リスクとして記録）。
-- 適用前必須ゲート: 下記が 1 行でも返れば適用禁止。Human 判断で名寄せしてから
-- 再適用すること。
--   SELECT lower(email), count(*) FROM users GROUP BY 1 HAVING count(*) > 1;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "users" GROUP BY lower("email") HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'case-insensitive duplicate emails in users; resolve manually before applying 0001';
  END IF;
END $$;--> statement-breakpoint
INSERT INTO "user" ("id", "name", "email", "email_verified", "image", "created_at", "updated_at")
SELECT "id"::text, split_part(lower("email"), '@', 1), lower("email"), true, NULL, "created_at", "updated_at"
FROM "users"
ORDER BY "created_at" ASC, "id" ASC
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- 旧セッションの失効（全員再ログイン方針と整合。grill Q1 確定）。
-- 根拠: 旧 "sessions" 行を残すと漏洩済みの旧セッション cookie が有効期限まで API 利用
-- 可能となり、セッション奪取済み攻撃者のアクセスが切替後も存続する。新 "session" とは
-- 別テーブル・別署名系のため旧 cookie は新認証では受理されないが、切戻し時の混同と
-- 温存データへの残存アクセスを断つため移行時に削除する。DELETE は再実行で 0 行となり
-- 冪等。旧 users / accounts 行は切戻し用に温存し、ここでは削除しない。
-- 時期の判断（logic-3 への dispute 回答）: DELETE を切替成功確定後ではなく移行時
-- （チェックリスト前）に置くのは意図的設計。確定後に分離すると、チェックリスト
-- 不合格→旧ビルド復旧の筋書きで漏洩済み旧セッションが復活し、奪取済み攻撃者の
-- アクセスが存続する。漏洩セッション断絶を優先し、切戻し後は全員再ログイン必須と
-- する（`docs/migration-cutover.md` 手順3・手順4で開示済み）。適用直前の退避取得を
-- 必須条件とし（同手順書の事前条件3・手順3）、退避テーブル `sessions_backup` の
-- 存在＋集合一致を下記 DO ブロックで機械的に検証する（logic-2・ai-1 への回答）。
-- 切戻し時の復旧選択肢は同手順書手順4参照。
-- 破壊的 DELETE の機械的必須ゲート（logic-2・ai-1 への回答）: 下記 DO ブロックは
-- DB 状態（退避テーブルの実在＋集合一致）で判定し、DELETE 到達前に abort する。
-- GUC 自己申告方式（`SET app.backup_taken = 'on'`）は廃止した。不採用理由:
-- GUC は同一セッション前提に依存するが drizzle-kit は statement 分割・別コネクションで
-- 適用するため手動セッションの SET が継承されず、正規手順でも常時 abort する DoS か
-- SET 埋め込みの本末転倒に崩れる（ai-1）。かつ SET は誰でもバックアップ無しで実行でき、
-- 設定した瞬間に不可逆 DELETE が素通しになる自己申告である（logic-2）。
-- 退避テーブル方式の採用理由: 漏洩セッション断絶（移行時 DELETE）と切戻し復旧可能性を
-- 両立させる。退避テーブル自体は旧セッション行の温存だが、新認証では受理されない旧署名系の
-- 行であり、切戻し時の Human 判断による復旧選択肢として残す（復旧手順は
-- `docs/migration-cutover.md` 手順4 参照。無断復旧はしない）。
-- 適用手順: 適用直前に `CREATE TABLE sessions_backup AS TABLE sessions;` で退避を
-- 作成してから本マイグレーションを適用する（`docs/migration-cutover.md` 手順3参照）。
-- 下記ガードは `sessions_backup` の存在と、適用時点の `sessions` との集合一致
-- （`session_token` の両方向 EXCEPT が空集合）を検証する。件数一致では不十分:
-- 退避後の logout＋login が同件数で入れ替わると件数は一致したまま素通りし、
-- 退避にない新規行を不可逆に消す一方、切戻しで古い行を復活させるため。
-- 不一致は退避後の書込（新規ログイン等）の合図であり、退避を取り直して再適用する
-- （本ガード以前の文はすべて冪等なため再適用は安全。fail-closed）。
-- 再適用時は sessions 空（DELETE 済み）かつ backup 非空なら成功済みとみなし、
-- 不一致ガードを skip する（後段 DELETE は 0 行で冪等）。初回適用（sessions 非空時）は
-- 従来どおり集合不一致で abort する。
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions_backup') THEN
    RAISE EXCEPTION 'sessions_backup missing; create it with CREATE TABLE sessions_backup AS TABLE sessions immediately before applying 0001 (see docs/migration-cutover.md step 3)';
  END IF;
  IF EXISTS (SELECT 1 FROM "sessions") AND EXISTS (
    (SELECT "session_token" FROM "sessions" EXCEPT SELECT "session_token" FROM "sessions_backup")
    UNION ALL
    (SELECT "session_token" FROM "sessions_backup" EXCEPT SELECT "session_token" FROM "sessions")
  ) THEN
    RAISE EXCEPTION 'sessions_backup content mismatch (only-in-sessions=%, only-in-backup=%); re-take the backup immediately before applying 0001 (see docs/migration-cutover.md step 3)',
      (SELECT count(*) FROM ((SELECT "session_token" FROM "sessions" EXCEPT SELECT "session_token" FROM "sessions_backup")) AS "missing_in_backup"),
      (SELECT count(*) FROM ((SELECT "session_token" FROM "sessions_backup" EXCEPT SELECT "session_token" FROM "sessions")) AS "stale_in_backup");
  END IF;
END $$;--> statement-breakpoint
DELETE FROM "sessions";
