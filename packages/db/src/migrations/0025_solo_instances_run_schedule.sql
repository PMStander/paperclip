ALTER TABLE "solo_instances" ADD COLUMN "run_schedule" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "solo_instances" ADD COLUMN "last_run_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "solo_instances" ADD COLUMN "next_run_at" timestamp with time zone;
