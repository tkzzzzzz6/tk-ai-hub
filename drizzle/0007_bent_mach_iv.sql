ALTER TABLE `resources` ADD `demo_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `resources` ADD `demo_type` text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `demo_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `demo_type` text DEFAULT 'auto' NOT NULL;