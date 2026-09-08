PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_body_parts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`sort_index` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "body_parts_category_check" CHECK("category" IN ('CHEST', 'BACK', 'SHOULDER', 'ARM', 'ABS', 'LEG'))
);
--> statement-breakpoint
INSERT INTO `__new_body_parts`("id", "category", "name", "sort_index", "created_at", "updated_at") SELECT "id", "category", "name", "sort_index", "created_at", "updated_at" FROM `body_parts`;--> statement-breakpoint
DROP TABLE `body_parts`;--> statement-breakpoint
ALTER TABLE `__new_body_parts` RENAME TO `body_parts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `body_parts_category_idx` ON `body_parts` (`category`);--> statement-breakpoint
CREATE UNIQUE INDEX `body_parts_category_name_key` ON `body_parts` (`category`,`name`);