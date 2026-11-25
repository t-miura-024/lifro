CREATE TABLE `routine_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`sort_index` integer DEFAULT 0 NOT NULL,
	`set_count` integer NOT NULL,
	`target_reps` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "routine_items_set_count_check" CHECK("routine_items"."set_count" > 0),
	CONSTRAINT "routine_items_target_reps_check" CHECK("routine_items"."target_reps" IS NULL OR "routine_items"."target_reps" > 0)
);
--> statement-breakpoint
CREATE INDEX `routine_items_routine_id_idx` ON `routine_items` (`routine_id`);--> statement-breakpoint
CREATE INDEX `routine_items_exercise_id_idx` ON `routine_items` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`sort_index` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `routines_user_id_idx` ON `routines` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `routines_user_id_name_key` ON `routines` (`user_id`,`name`);