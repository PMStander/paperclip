CREATE TABLE "branch_experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"campaign_id" uuid,
	"variant_id" uuid,
	"project_id" uuid NOT NULL,
	"workspace_id" uuid,
	"source_issue_id" uuid,
	"source_evaluation_run_id" uuid,
	"approval_id" uuid,
	"branch_name" text NOT NULL,
	"worktree_path" text,
	"base_ref" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"patch_summary" text,
	"validator_commands" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"validation_results" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"suite_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"variant_id" uuid,
	"source_heartbeat_run_id" uuid,
	"source_issue_id" uuid,
	"source_schedule_id" uuid,
	"source_workspace_id" uuid,
	"status" text DEFAULT 'queued' NOT NULL,
	"score" double precision,
	"score_label" text,
	"summary" text,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"input_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_suites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"mode" text NOT NULL,
	"source_type" text NOT NULL,
	"selector" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"judge_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phase" text NOT NULL,
	"subject_type" text,
	"subject_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"objective" text,
	"baseline_variant_id" uuid,
	"winner_variant_id" uuid,
	"traffic_allocation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"safety_policy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"summary" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_user_id" text,
	"created_by_agent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"label" text NOT NULL,
	"role" text DEFAULT 'challenger' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"traffic_percent" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"score" double precision,
	"score_label" text,
	"summary" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_version_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_rollouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"policy_pack_id" uuid NOT NULL,
	"policy_version_id" uuid NOT NULL,
	"campaign_id" uuid,
	"approval_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"rollout_scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"activated_at" timestamp with time zone,
	"rolled_back_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"policy_pack_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"summary" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evaluation_suite_id" uuid,
	"created_by_user_id" text,
	"created_by_agent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variant_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"assignment_type" text NOT NULL,
	"assignment_key" text NOT NULL,
	"solo_instance_id" uuid,
	"issue_schedule_id" uuid,
	"issue_id" uuid,
	"heartbeat_run_id" uuid,
	"evaluation_run_id" uuid,
	"status" text DEFAULT 'assigned' NOT NULL,
	"score" double precision,
	"summary" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branch_experiments" ADD CONSTRAINT "branch_experiments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_experiments" ADD CONSTRAINT "branch_experiments_campaign_id_experiment_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."experiment_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_experiments" ADD CONSTRAINT "branch_experiments_variant_id_experiment_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."experiment_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_experiments" ADD CONSTRAINT "branch_experiments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_experiments" ADD CONSTRAINT "branch_experiments_workspace_id_project_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."project_workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_experiments" ADD CONSTRAINT "branch_experiments_source_issue_id_issues_id_fk" FOREIGN KEY ("source_issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_experiments" ADD CONSTRAINT "branch_experiments_source_evaluation_run_id_evaluation_runs_id_fk" FOREIGN KEY ("source_evaluation_run_id") REFERENCES "public"."evaluation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_experiments" ADD CONSTRAINT "branch_experiments_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."approvals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_suite_id_evaluation_suites_id_fk" FOREIGN KEY ("suite_id") REFERENCES "public"."evaluation_suites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_campaign_id_experiment_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."experiment_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_variant_id_experiment_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."experiment_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_source_heartbeat_run_id_heartbeat_runs_id_fk" FOREIGN KEY ("source_heartbeat_run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_source_issue_id_issues_id_fk" FOREIGN KEY ("source_issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_source_schedule_id_issue_schedules_id_fk" FOREIGN KEY ("source_schedule_id") REFERENCES "public"."issue_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_source_workspace_id_project_workspaces_id_fk" FOREIGN KEY ("source_workspace_id") REFERENCES "public"."project_workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_suites" ADD CONSTRAINT "evaluation_suites_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_suites" ADD CONSTRAINT "evaluation_suites_campaign_id_experiment_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."experiment_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_campaigns" ADD CONSTRAINT "experiment_campaigns_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_campaigns" ADD CONSTRAINT "experiment_campaigns_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_variants" ADD CONSTRAINT "experiment_variants_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_variants" ADD CONSTRAINT "experiment_variants_campaign_id_experiment_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."experiment_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_packs" ADD CONSTRAINT "policy_packs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_rollouts" ADD CONSTRAINT "policy_rollouts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_rollouts" ADD CONSTRAINT "policy_rollouts_policy_pack_id_policy_packs_id_fk" FOREIGN KEY ("policy_pack_id") REFERENCES "public"."policy_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_rollouts" ADD CONSTRAINT "policy_rollouts_policy_version_id_policy_versions_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."policy_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_rollouts" ADD CONSTRAINT "policy_rollouts_campaign_id_experiment_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."experiment_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_rollouts" ADD CONSTRAINT "policy_rollouts_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."approvals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_policy_pack_id_policy_packs_id_fk" FOREIGN KEY ("policy_pack_id") REFERENCES "public"."policy_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_evaluation_suite_id_evaluation_suites_id_fk" FOREIGN KEY ("evaluation_suite_id") REFERENCES "public"."evaluation_suites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_assignments" ADD CONSTRAINT "variant_assignments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_assignments" ADD CONSTRAINT "variant_assignments_campaign_id_experiment_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."experiment_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_assignments" ADD CONSTRAINT "variant_assignments_variant_id_experiment_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."experiment_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_assignments" ADD CONSTRAINT "variant_assignments_issue_schedule_id_issue_schedules_id_fk" FOREIGN KEY ("issue_schedule_id") REFERENCES "public"."issue_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_assignments" ADD CONSTRAINT "variant_assignments_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_assignments" ADD CONSTRAINT "variant_assignments_heartbeat_run_id_heartbeat_runs_id_fk" FOREIGN KEY ("heartbeat_run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_assignments" ADD CONSTRAINT "variant_assignments_evaluation_run_id_evaluation_runs_id_fk" FOREIGN KEY ("evaluation_run_id") REFERENCES "public"."evaluation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "branch_experiments_project_status_idx" ON "branch_experiments" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "branch_experiments_approval_idx" ON "branch_experiments" USING btree ("approval_id");--> statement-breakpoint
CREATE INDEX "evaluation_runs_suite_status_idx" ON "evaluation_runs" USING btree ("suite_id","status");--> statement-breakpoint
CREATE INDEX "evaluation_runs_campaign_variant_idx" ON "evaluation_runs" USING btree ("campaign_id","variant_id");--> statement-breakpoint
CREATE INDEX "evaluation_runs_heartbeat_idx" ON "evaluation_runs" USING btree ("source_heartbeat_run_id");--> statement-breakpoint
CREATE INDEX "evaluation_suites_campaign_status_idx" ON "evaluation_suites" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "experiment_campaigns_company_phase_status_idx" ON "experiment_campaigns" USING btree ("company_id","phase","status");--> statement-breakpoint
CREATE INDEX "experiment_campaigns_subject_idx" ON "experiment_campaigns" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "experiment_variants_campaign_status_idx" ON "experiment_variants" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_variants_campaign_label_idx" ON "experiment_variants" USING btree ("campaign_id","label");--> statement-breakpoint
CREATE INDEX "policy_packs_company_target_idx" ON "policy_packs" USING btree ("company_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "policy_rollouts_version_status_idx" ON "policy_rollouts" USING btree ("policy_version_id","status");--> statement-breakpoint
CREATE INDEX "policy_rollouts_approval_idx" ON "policy_rollouts" USING btree ("approval_id");--> statement-breakpoint
CREATE INDEX "policy_versions_pack_status_idx" ON "policy_versions" USING btree ("policy_pack_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "policy_versions_pack_sequence_idx" ON "policy_versions" USING btree ("policy_pack_id","sequence");--> statement-breakpoint
CREATE INDEX "variant_assignments_campaign_type_idx" ON "variant_assignments" USING btree ("campaign_id","assignment_type");--> statement-breakpoint
CREATE INDEX "variant_assignments_variant_idx" ON "variant_assignments" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "variant_assignments_assignment_key_idx" ON "variant_assignments" USING btree ("assignment_key");