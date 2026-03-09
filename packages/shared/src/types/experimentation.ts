import type {
  BranchExperimentStatus,
  EvaluationRunStatus,
  EvaluationSourceType,
  EvaluationSuiteMode,
  EvaluationSuiteStatus,
  ExperimentCampaignPhase,
  ExperimentCampaignStatus,
  ExperimentSubjectType,
  ExperimentVariantRole,
  ExperimentVariantStatus,
  PolicyPackStatus,
  PolicyRolloutStatus,
  PolicyTargetType,
  PolicyVersionStatus,
  VariantAssignmentStatus,
  VariantAssignmentType,
} from "../constants.js";

export interface ExperimentCampaign {
  id: string;
  companyId: string;
  name: string;
  phase: ExperimentCampaignPhase;
  subjectType: ExperimentSubjectType | null;
  subjectId: string | null;
  status: ExperimentCampaignStatus;
  objective: string | null;
  baselineVariantId: string | null;
  winnerVariantId: string | null;
  trafficAllocation: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  summary: string | null;
  metadata: Record<string, unknown>;
  createdByUserId: string | null;
  createdByAgentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentVariant {
  id: string;
  companyId: string;
  campaignId: string;
  label: string;
  role: ExperimentVariantRole;
  status: ExperimentVariantStatus;
  trafficPercent: number;
  config: Record<string, unknown>;
  score: number | null;
  scoreLabel: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationSuite {
  id: string;
  companyId: string;
  campaignId: string;
  name: string;
  mode: EvaluationSuiteMode;
  sourceType: EvaluationSourceType;
  selector: Record<string, unknown>;
  judgeConfig: Record<string, unknown>;
  status: EvaluationSuiteStatus;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationRun {
  id: string;
  companyId: string;
  suiteId: string;
  campaignId: string;
  variantId: string | null;
  sourceHeartbeatRunId: string | null;
  sourceIssueId: string | null;
  sourceScheduleId: string | null;
  sourceWorkspaceId: string | null;
  status: EvaluationRunStatus;
  score: number | null;
  scoreLabel: string | null;
  summary: string | null;
  metrics: Record<string, unknown>;
  inputSnapshot: Record<string, unknown>;
  outputSnapshot: Record<string, unknown>;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VariantAssignment {
  id: string;
  companyId: string;
  campaignId: string;
  variantId: string;
  assignmentType: VariantAssignmentType;
  assignmentKey: string;
  soloInstanceId: string | null;
  issueScheduleId: string | null;
  issueId: string | null;
  heartbeatRunId: string | null;
  evaluationRunId: string | null;
  status: VariantAssignmentStatus;
  score: number | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyPack {
  id: string;
  companyId: string;
  name: string;
  targetType: PolicyTargetType;
  targetId: string | null;
  status: PolicyPackStatus;
  currentVersionId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyVersion {
  id: string;
  companyId: string;
  policyPackId: string;
  sequence: number;
  status: PolicyVersionStatus;
  summary: string | null;
  config: Record<string, unknown>;
  evaluationSuiteId: string | null;
  createdByUserId: string | null;
  createdByAgentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyRollout {
  id: string;
  companyId: string;
  policyPackId: string;
  policyVersionId: string;
  campaignId: string | null;
  approvalId: string | null;
  status: PolicyRolloutStatus;
  rolloutScope: Record<string, unknown>;
  metrics: Record<string, unknown>;
  activatedAt: string | null;
  rolledBackAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BranchExperiment {
  id: string;
  companyId: string;
  campaignId: string | null;
  variantId: string | null;
  projectId: string;
  workspaceId: string | null;
  sourceIssueId: string | null;
  sourceEvaluationRunId: string | null;
  approvalId: string | null;
  branchName: string;
  worktreePath: string | null;
  baseRef: string | null;
  status: BranchExperimentStatus;
  patchSummary: string | null;
  validatorCommands: string[];
  validationResults: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
