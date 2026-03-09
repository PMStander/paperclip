import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { approvals } from "./approvals.js";
import { companies } from "./companies.js";
import { heartbeatRuns } from "./heartbeat_runs.js";
import { issueSchedules } from "./issue_schedules.js";
import { issues } from "./issues.js";
import { projects } from "./projects.js";
import { projectWorkspaces } from "./project_workspaces.js";

export const experimentCampaigns = pgTable(
  "experiment_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    name: text("name").notNull(),
    phase: text("phase").notNull(),
    subjectType: text("subject_type"),
    subjectId: uuid("subject_id"),
    status: text("status").notNull().default("draft"),
    objective: text("objective"),
    baselineVariantId: uuid("baseline_variant_id"),
    winnerVariantId: uuid("winner_variant_id"),
    trafficAllocation: jsonb("traffic_allocation").$type<Record<string, unknown>>().notNull().default({}),
    safetyPolicy: jsonb("safety_policy").$type<Record<string, unknown>>().notNull().default({}),
    summary: text("summary"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdByUserId: text("created_by_user_id"),
    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyPhaseStatusIdx: index("experiment_campaigns_company_phase_status_idx").on(table.companyId, table.phase, table.status),
    subjectIdx: index("experiment_campaigns_subject_idx").on(table.subjectType, table.subjectId),
  }),
);

export const experimentVariants = pgTable(
  "experiment_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    campaignId: uuid("campaign_id").notNull().references(() => experimentCampaigns.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    role: text("role").notNull().default("challenger"),
    status: text("status").notNull().default("draft"),
    trafficPercent: integer("traffic_percent").notNull().default(0),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    score: doublePrecision("score"),
    scoreLabel: text("score_label"),
    summary: text("summary"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    campaignStatusIdx: index("experiment_variants_campaign_status_idx").on(table.campaignId, table.status),
    campaignLabelIdx: uniqueIndex("experiment_variants_campaign_label_idx").on(table.campaignId, table.label),
  }),
);

export const evaluationSuites = pgTable(
  "evaluation_suites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    campaignId: uuid("campaign_id").notNull().references(() => experimentCampaigns.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mode: text("mode").notNull(),
    sourceType: text("source_type").notNull(),
    selector: jsonb("selector").$type<Record<string, unknown>>().notNull().default({}),
    judgeConfig: jsonb("judge_config").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").notNull().default("draft"),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    campaignStatusIdx: index("evaluation_suites_campaign_status_idx").on(table.campaignId, table.status),
  }),
);

export const evaluationRuns = pgTable(
  "evaluation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    suiteId: uuid("suite_id").notNull().references(() => evaluationSuites.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").notNull().references(() => experimentCampaigns.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => experimentVariants.id, { onDelete: "set null" }),
    sourceHeartbeatRunId: uuid("source_heartbeat_run_id").references(() => heartbeatRuns.id, { onDelete: "set null" }),
    sourceIssueId: uuid("source_issue_id").references(() => issues.id, { onDelete: "set null" }),
    sourceScheduleId: uuid("source_schedule_id").references(() => issueSchedules.id, { onDelete: "set null" }),
    sourceWorkspaceId: uuid("source_workspace_id").references(() => projectWorkspaces.id, { onDelete: "set null" }),
    status: text("status").notNull().default("queued"),
    score: doublePrecision("score"),
    scoreLabel: text("score_label"),
    summary: text("summary"),
    metrics: jsonb("metrics").$type<Record<string, unknown>>().notNull().default({}),
    inputSnapshot: jsonb("input_snapshot").$type<Record<string, unknown>>().notNull().default({}),
    outputSnapshot: jsonb("output_snapshot").$type<Record<string, unknown>>().notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    suiteStatusIdx: index("evaluation_runs_suite_status_idx").on(table.suiteId, table.status),
    campaignVariantIdx: index("evaluation_runs_campaign_variant_idx").on(table.campaignId, table.variantId),
    heartbeatIdx: index("evaluation_runs_heartbeat_idx").on(table.sourceHeartbeatRunId),
  }),
);

export const variantAssignments = pgTable(
  "variant_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    campaignId: uuid("campaign_id").notNull().references(() => experimentCampaigns.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").notNull().references(() => experimentVariants.id, { onDelete: "cascade" }),
    assignmentType: text("assignment_type").notNull(),
    assignmentKey: text("assignment_key").notNull(),
    soloInstanceId: uuid("solo_instance_id"),
    issueScheduleId: uuid("issue_schedule_id").references(() => issueSchedules.id, { onDelete: "set null" }),
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
    heartbeatRunId: uuid("heartbeat_run_id").references(() => heartbeatRuns.id, { onDelete: "set null" }),
    evaluationRunId: uuid("evaluation_run_id").references(() => evaluationRuns.id, { onDelete: "set null" }),
    status: text("status").notNull().default("assigned"),
    score: doublePrecision("score"),
    summary: text("summary"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    campaignTypeIdx: index("variant_assignments_campaign_type_idx").on(table.campaignId, table.assignmentType),
    variantIdx: index("variant_assignments_variant_idx").on(table.variantId),
    assignmentKeyIdx: index("variant_assignments_assignment_key_idx").on(table.assignmentKey),
  }),
);

export const policyPacks = pgTable(
  "policy_packs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    name: text("name").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id"),
    status: text("status").notNull().default("draft"),
    currentVersionId: uuid("current_version_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyTargetIdx: index("policy_packs_company_target_idx").on(table.companyId, table.targetType, table.targetId),
  }),
);

export const policyVersions = pgTable(
  "policy_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    policyPackId: uuid("policy_pack_id").notNull().references(() => policyPacks.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    status: text("status").notNull().default("draft"),
    summary: text("summary"),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    evaluationSuiteId: uuid("evaluation_suite_id").references(() => evaluationSuites.id, { onDelete: "set null" }),
    createdByUserId: text("created_by_user_id"),
    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    packStatusIdx: index("policy_versions_pack_status_idx").on(table.policyPackId, table.status),
    packSequenceIdx: uniqueIndex("policy_versions_pack_sequence_idx").on(table.policyPackId, table.sequence),
  }),
);

export const policyRollouts = pgTable(
  "policy_rollouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    policyPackId: uuid("policy_pack_id").notNull().references(() => policyPacks.id, { onDelete: "cascade" }),
    policyVersionId: uuid("policy_version_id").notNull().references(() => policyVersions.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => experimentCampaigns.id, { onDelete: "set null" }),
    approvalId: uuid("approval_id").references(() => approvals.id, { onDelete: "set null" }),
    status: text("status").notNull().default("draft"),
    rolloutScope: jsonb("rollout_scope").$type<Record<string, unknown>>().notNull().default({}),
    metrics: jsonb("metrics").$type<Record<string, unknown>>().notNull().default({}),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    versionStatusIdx: index("policy_rollouts_version_status_idx").on(table.policyVersionId, table.status),
    approvalIdx: index("policy_rollouts_approval_idx").on(table.approvalId),
  }),
);

export const branchExperiments = pgTable(
  "branch_experiments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    campaignId: uuid("campaign_id").references(() => experimentCampaigns.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => experimentVariants.id, { onDelete: "set null" }),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").references(() => projectWorkspaces.id, { onDelete: "set null" }),
    sourceIssueId: uuid("source_issue_id").references(() => issues.id, { onDelete: "set null" }),
    sourceEvaluationRunId: uuid("source_evaluation_run_id").references(() => evaluationRuns.id, { onDelete: "set null" }),
    approvalId: uuid("approval_id").references(() => approvals.id, { onDelete: "set null" }),
    branchName: text("branch_name").notNull(),
    worktreePath: text("worktree_path"),
    baseRef: text("base_ref"),
    status: text("status").notNull().default("draft"),
    patchSummary: text("patch_summary"),
    validatorCommands: jsonb("validator_commands").$type<string[]>().notNull().default([]),
    validationResults: jsonb("validation_results").$type<Record<string, unknown>>().notNull().default({}),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectStatusIdx: index("branch_experiments_project_status_idx").on(table.projectId, table.status),
    approvalIdx: index("branch_experiments_approval_idx").on(table.approvalId),
  }),
);
