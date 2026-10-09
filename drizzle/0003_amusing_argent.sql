CREATE TABLE `translation_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`source_language` text NOT NULL,
	`target_language` text NOT NULL,
	`source_text` text NOT NULL,
	`translated` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `upstream_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`source_hash` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`base_revision` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `upstream_resource_hash_unique` ON `upstream_updates` (`resource_id`,`source_hash`);--> statement-breakpoint
CREATE INDEX `upstream_status_idx` ON `upstream_updates` (`status`);--> statement-breakpoint
ALTER TABLE `resources` ADD `original_language` text DEFAULT 'zh' NOT NULL;

--> statement-breakpoint
UPDATE resources SET content_en=replace(replace(replace(replace(replace(content_en,'{{论文内容}}','{{paper_content}}'),'{{运行环境}}','{{runtime_environment}}'),'{{代码}}','{{code}}'),'{{目标读者}}','{{target_audience}}'),'{{原始笔记}}','{{original_notes}}') WHERE id IN ('paper-prompt','review-prompt','writing-prompt');
--> statement-breakpoint
UPDATE resources SET status='hidden' WHERE source='GitHub · 自动采集' AND status='pending' AND revision=1;
