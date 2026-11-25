CREATE TABLE `routine_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`sort_index` integer NOT NULL,
	`target_reps` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "routine_sets_target_reps_check" CHECK("routine_sets"."target_reps" IS NULL OR "routine_sets"."target_reps" > 0)
);
--> statement-breakpoint
CREATE INDEX `routine_sets_routine_id_idx` ON `routine_sets` (`routine_id`);--> statement-breakpoint
CREATE INDEX `routine_sets_exercise_id_idx` ON `routine_sets` (`exercise_id`);--> statement-breakpoint
WITH RECURSIVE
	`numbers`(`i`) AS (
		SELECT 1
		UNION ALL
		SELECT `i` + 1 FROM `numbers` WHERE `i` < (SELECT COALESCE(MAX(`set_count`), 0) FROM `routine_items`)
	),
	`expanded` AS (
		SELECT
			`routine_id`,
			`exercise_id`,
			`target_reps`,
			`created_at`,
			`updated_at`,
			`set_count`,
			COALESCE(
				SUM(`set_count`) OVER (
					PARTITION BY `routine_id`
					ORDER BY `sort_index`, `id`
					ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
				),
				0
			) AS `offset`
		FROM `routine_items`
	)
INSERT INTO `routine_sets` (`routine_id`, `exercise_id`, `sort_index`, `target_reps`, `created_at`, `updated_at`)
SELECT
	`e`.`routine_id`,
	`e`.`exercise_id`,
	`e`.`offset` + `n`.`i` - 1,
	`e`.`target_reps`,
	`e`.`created_at`,
	`e`.`updated_at`
FROM `expanded` `e`
JOIN `numbers` `n` ON `n`.`i` <= `e`.`set_count`;--> statement-breakpoint
DROP TABLE `routine_items`;
