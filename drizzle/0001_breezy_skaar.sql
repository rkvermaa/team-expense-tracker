CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`description` text NOT NULL,
	`expense_date` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "expenses_amount_check" CHECK("expenses"."amount_cents" > 0),
	CONSTRAINT "expenses_status_check" CHECK("expenses"."status" IN ('draft', 'submitted', 'approved', 'rejected'))
);
