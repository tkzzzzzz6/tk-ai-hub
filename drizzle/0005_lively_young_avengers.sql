CREATE TABLE `submission_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`window_start` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `submission_limits_window_idx` ON `submission_limits` (`window_start`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text DEFAULT '待判断' NOT NULL,
	`raw_text` text NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`nickname` text DEFAULT '访客' NOT NULL,
	`submitted_by` text,
	`content_hash` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`resource_id` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text,
	`reviewed_by` text,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `submissions` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_hash_unique` ON `submissions` (`content_hash`);