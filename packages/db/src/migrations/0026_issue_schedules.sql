CREATE TABLE "issue_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"template_issue_id" uuid NOT NULL,
	"schedule_type" text DEFAULT 'once' NOT NULL,
	"frequency" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"run_at" timestamp with time zone,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"hour_of_day" integer,
	"minute_of_hour" integer,
	"day_of_week" integer,
	"day_of_month" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"next_run_at" timestamp with time zone,
	"last_run_at" timestamp with time zone,
	"run_count" integer DEFAULT 0 NOT NULL,
	"max_runs" integer,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issue_schedules" ADD CONSTRAINT "issue_schedules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_schedules" ADD CONSTRAINT "issue_schedules_template_issue_id_issues_id_fk" FOREIGN KEY ("template_issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_schedules_company_status_idx" ON "issue_schedules" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "issue_schedules_status_next_run_idx" ON "issue_schedules" USING btree ("status","next_run_at");
