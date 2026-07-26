CREATE TABLE `recurring_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`wallet_id` text NOT NULL,
	`category_id` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text,
	`frequency` text NOT NULL,
	`anchor_day` integer,
	`start_on` text NOT NULL,
	`end_on` text,
	`next_run_on` text NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `recurring_due_idx` ON `recurring_transactions` (`archived_at`,`next_run_on`);--> statement-breakpoint
CREATE INDEX `recurring_user_idx` ON `recurring_transactions` (`user_id`);