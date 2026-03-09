CREATE TABLE "solo_experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"solo_instance_id" uuid NOT NULL,
	"based_on_experiment_id" uuid,
	"issue_id" uuid,
	"heartbeat_run_id" uuid,
	"sequence" integer NOT NULL,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"decision" text DEFAULT 'pending' NOT NULL,
	"variant_label" text,
	"hypothesis" text,
	"summary" text,
	"decision_reason" text,
	"score" double precision,
	"score_label" text,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"input_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_best" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "solo_instances" ADD COLUMN "experiment_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "solo_instances" ADD COLUMN "best_experiment_id" uuid;--> statement-breakpoint
ALTER TABLE "solo_instances" ADD COLUMN "best_score" double precision;--> statement-breakpoint
ALTER TABLE "solo_instances" ADD COLUMN "best_score_label" text;--> statement-breakpoint
ALTER TABLE "solo_instances" ADD COLUMN "best_summary" text;--> statement-breakpoint
ALTER TABLE "solo_experiments" ADD CONSTRAINT "solo_experiments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solo_experiments" ADD CONSTRAINT "solo_experiments_solo_instance_id_solo_instances_id_fk" FOREIGN KEY ("solo_instance_id") REFERENCES "public"."solo_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solo_experiments" ADD CONSTRAINT "solo_experiments_based_on_experiment_id_solo_experiments_id_fk" FOREIGN KEY ("based_on_experiment_id") REFERENCES "public"."solo_experiments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solo_experiments" ADD CONSTRAINT "solo_experiments_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solo_experiments" ADD CONSTRAINT "solo_experiments_heartbeat_run_id_heartbeat_runs_id_fk" FOREIGN KEY ("heartbeat_run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "solo_experiments_company_instance_created_idx" ON "solo_experiments" USING btree ("company_id","solo_instance_id","created_at");--> statement-breakpoint
CREATE INDEX "solo_experiments_instance_best_idx" ON "solo_experiments" USING btree ("solo_instance_id","is_best");--> statement-breakpoint
CREATE INDEX "solo_experiments_heartbeat_run_idx" ON "solo_experiments" USING btree ("heartbeat_run_id");--> statement-breakpoint
CREATE INDEX "solo_experiments_issue_idx" ON "solo_experiments" USING btree ("issue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "solo_experiments_instance_sequence_idx" ON "solo_experiments" USING btree ("solo_instance_id","sequence");--> statement-breakpoint
CREATE INDEX "solo_instances_best_experiment_idx" ON "solo_instances" USING btree ("best_experiment_id");