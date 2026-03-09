import { z } from "zod";
import {
  BRANCH_EXPERIMENT_STATUSES,
  EVALUATION_RUN_STATUSES,
  EVALUATION_SOURCE_TYPES,
  EVALUATION_SUITE_MODES,
  EVALUATION_SUITE_STATUSES,
  EXPERIMENT_CAMPAIGN_PHASES,
  EXPERIMENT_CAMPAIGN_STATUSES,
  EXPERIMENT_SUBJECT_TYPES,
  EXPERIMENT_VARIANT_ROLES,
  EXPERIMENT_VARIANT_STATUSES,
  POLICY_TARGET_TYPES,
} from "../constants.js";

const recordSchema = z.record(z.unknown());

export const createExperimentCampaignSchema = z.object({
  name: z.string().min(1),
  phase: z.enum(EXPERIMENT_CAMPAIGN_PHASES),
  subjectType: z.enum(EXPERIMENT_SUBJECT_TYPES).optional().nullable(),
  subjectId: z.string().uuid().optional().nullable(),
  objective: z.string().optional().nullable(),
  trafficAllocation: recordSchema.optional(),
  safetyPolicy: recordSchema.optional(),
  summary: z.string().optional().nullable(),
  metadata: recordSchema.optional(),
});

export type CreateExperimentCampaign = z.infer<typeof createExperimentCampaignSchema>;

export const updateExperimentCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(EXPERIMENT_CAMPAIGN_STATUSES).optional(),
  objective: z.string().optional().nullable(),
  baselineVariantId: z.string().uuid().optional().nullable(),
  winnerVariantId: z.string().uuid().optional().nullable(),
  trafficAllocation: recordSchema.optional(),
  safetyPolicy: recordSchema.optional(),
  summary: z.string().optional().nullable(),
  metadata: recordSchema.optional(),
});

export type UpdateExperimentCampaign = z.infer<typeof updateExperimentCampaignSchema>;

export const createExperimentVariantSchema = z.object({
  label: z.string().min(1),
  role: z.enum(EXPERIMENT_VARIANT_ROLES).optional().default("challenger"),
  status: z.enum(EXPERIMENT_VARIANT_STATUSES).optional().default("draft"),
  trafficPercent: z.number().int().min(0).max(100).optional().default(0),
  config: recordSchema.optional(),
  metadata: recordSchema.optional(),
});

export type CreateExperimentVariant = z.infer<typeof createExperimentVariantSchema>;

export const updateExperimentVariantSchema = z.object({
  label: z.string().min(1).optional(),
  role: z.enum(EXPERIMENT_VARIANT_ROLES).optional(),
  status: z.enum(EXPERIMENT_VARIANT_STATUSES).optional(),
  trafficPercent: z.number().int().min(0).max(100).optional(),
  config: recordSchema.optional(),
  score: z.number().optional().nullable(),
  scoreLabel: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  metadata: recordSchema.optional(),
});

export type UpdateExperimentVariant = z.infer<typeof updateExperimentVariantSchema>;

export const createEvaluationSuiteSchema = z.object({
  name: z.string().min(1),
  mode: z.enum(EVALUATION_SUITE_MODES),
  sourceType: z.enum(EVALUATION_SOURCE_TYPES),
  selector: recordSchema.optional(),
  judgeConfig: recordSchema.optional(),
  status: z.enum(EVALUATION_SUITE_STATUSES).optional().default("draft"),
});

export type CreateEvaluationSuite = z.infer<typeof createEvaluationSuiteSchema>;

export const runEvaluationSuiteSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  sourceHeartbeatRunIds: z.array(z.string().uuid()).optional(),
  sourceIssueIds: z.array(z.string().uuid()).optional(),
  sourceScheduleIds: z.array(z.string().uuid()).optional(),
  sourceWorkspaceIds: z.array(z.string().uuid()).optional(),
  variantIds: z.array(z.string().uuid()).optional(),
});

export type RunEvaluationSuite = z.infer<typeof runEvaluationSuiteSchema>;

export const updateEvaluationRunSchema = z.object({
  status: z.enum(EVALUATION_RUN_STATUSES).optional(),
  score: z.number().optional().nullable(),
  scoreLabel: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  metrics: recordSchema.optional(),
  outputSnapshot: recordSchema.optional(),
});

export type UpdateEvaluationRun = z.infer<typeof updateEvaluationRunSchema>;

export const routeVariantAssignmentSchema = z.object({
  assignmentType: z.enum(["solo_run", "issue_schedule", "issue", "heartbeat_run"] as const),
  assignmentKey: z.string().min(1),
  soloInstanceId: z.string().uuid().optional().nullable(),
  issueScheduleId: z.string().uuid().optional().nullable(),
  issueId: z.string().uuid().optional().nullable(),
  heartbeatRunId: z.string().uuid().optional().nullable(),
  evaluationRunId: z.string().uuid().optional().nullable(),
  metadata: recordSchema.optional(),
});

export type RouteVariantAssignment = z.infer<typeof routeVariantAssignmentSchema>;

export const createPolicyPackSchema = z.object({
  name: z.string().min(1),
  targetType: z.enum(POLICY_TARGET_TYPES),
  targetId: z.string().uuid().optional().nullable(),
  metadata: recordSchema.optional(),
});

export type CreatePolicyPack = z.infer<typeof createPolicyPackSchema>;

export const createPolicyVersionSchema = z.object({
  summary: z.string().optional().nullable(),
  config: recordSchema.default({}),
  evaluationSuiteId: z.string().uuid().optional().nullable(),
});

export type CreatePolicyVersion = z.infer<typeof createPolicyVersionSchema>;

export const requestPolicyRolloutSchema = z.object({
  campaignId: z.string().uuid().optional().nullable(),
  rolloutScope: recordSchema.optional(),
  requestApproval: z.boolean().optional().default(true),
});

export type RequestPolicyRollout = z.infer<typeof requestPolicyRolloutSchema>;

export const createBranchExperimentSchema = z.object({
  campaignId: z.string().uuid().optional().nullable(),
  variantId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid(),
  workspaceId: z.string().uuid().optional().nullable(),
  sourceIssueId: z.string().uuid().optional().nullable(),
  sourceEvaluationRunId: z.string().uuid().optional().nullable(),
  branchName: z.string().min(1).optional(),
  worktreePath: z.string().min(1).optional().nullable(),
  baseRef: z.string().optional().nullable(),
  validatorCommands: z.array(z.string().min(1)).optional(),
  metadata: recordSchema.optional(),
});

export type CreateBranchExperiment = z.infer<typeof createBranchExperimentSchema>;

export const updateBranchExperimentSchema = z.object({
  status: z.enum(BRANCH_EXPERIMENT_STATUSES).optional(),
  worktreePath: z.string().min(1).optional().nullable(),
  baseRef: z.string().optional().nullable(),
  patchSummary: z.string().optional().nullable(),
  validatorCommands: z.array(z.string().min(1)).optional(),
  validationResults: recordSchema.optional(),
  metadata: recordSchema.optional(),
});

export type UpdateBranchExperiment = z.infer<typeof updateBranchExperimentSchema>;
