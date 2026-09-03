CREATE TYPE "public"."BodyPartCategory" AS ENUM('CHEST', 'BACK', 'SHOULDER', 'ARM', 'ABS', 'LEG');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "body_parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" "BodyPartCategory" NOT NULL,
	"name" text NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_body_parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"exercise_id" integer NOT NULL,
	"body_part_id" integer NOT NULL,
	"load_ratio" integer NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"session_token" text NOT NULL,
	"user_id" integer NOT NULL,
	"expires" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"exercise_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"weight" double precision NOT NULL,
	"reps" integer NOT NULL,
	"date" date NOT NULL,
	"sort_index" integer NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_memos" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit_timers" (
	"id" serial PRIMARY KEY NOT NULL,
	"timer_id" integer NOT NULL,
	"name" text,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"duration" integer NOT NULL,
	"count_sound" text,
	"count_sound_last_3_sec" text,
	"end_sound" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exercise_body_parts" ADD CONSTRAINT "exercise_body_parts_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exercise_body_parts" ADD CONSTRAINT "exercise_body_parts_body_part_id_fkey" FOREIGN KEY ("body_part_id") REFERENCES "public"."body_parts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sets" ADD CONSTRAINT "sets_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sets" ADD CONSTRAINT "sets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "timers" ADD CONSTRAINT "timers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "training_memos" ADD CONSTRAINT "training_memos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "unit_timers" ADD CONSTRAINT "unit_timers_timer_id_fkey" FOREIGN KEY ("timer_id") REFERENCES "public"."timers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "body_parts_category_idx" ON "body_parts" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "body_parts_category_name_key" ON "body_parts" USING btree ("category","name");--> statement-breakpoint
CREATE INDEX "exercise_body_parts_exercise_id_idx" ON "exercise_body_parts" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "exercise_body_parts_body_part_id_idx" ON "exercise_body_parts" USING btree ("body_part_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_body_parts_exercise_id_body_part_id_key" ON "exercise_body_parts" USING btree ("exercise_id","body_part_id");--> statement-breakpoint
CREATE INDEX "exercises_user_id_idx" ON "exercises" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sets_user_id_idx" ON "sets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sets_exercise_id_idx" ON "sets" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "sets_user_id_date_idx" ON "sets" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "sets_user_id_exercise_id_date_idx" ON "sets" USING btree ("user_id","exercise_id","date");--> statement-breakpoint
CREATE INDEX "timers_user_id_idx" ON "timers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "training_memos_user_id_date_idx" ON "training_memos" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "unit_timers_timer_id_idx" ON "unit_timers" USING btree ("timer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");