ALTER TABLE `exercises` ADD `supports_assist` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `exercises` SET `supports_assist` = 1 WHERE `user_id` = 1 AND `name` IN ('ディップス', 'プルアップ');
