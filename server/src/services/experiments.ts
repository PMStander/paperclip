import { randomUUID } from "node:crypto";
import { basename, dirname, join } from "node:path";
import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  approvals,
  branchExperiments,
  evaluationRuns,
  evaluationSuites,
  experimentCampaigns,
  experimentVariants,
  heartbeatRuns,
  issueSchedules,
  issues,
  policyPacks,
  policyRollouts,
  policyVersions,
  projectWorkspaces,
  projects,
  soloInstances,
  variantAssignments,
} from "@paperclipai/db";
import type {
  BranchExperiment,
  CreateBranchExperiment,
  CreateEvaluationSuite,
  CreateExperimentCampaign,
  CreateExperimentVariant,
  CreatePolicyPack,
  CreatePolicyVersion,
  EvaluationRun,
  EvaluationSourceType,
  EvaluationSuite,
  ExperimentCampaign,
  ExperimentSubjectType,
  ExperimentVariant,
  PolicyPack,
  PolicyRollout,
  PolicyTargetType,
  PolicyVersion,
  RequestPolicyRollout,
  RouteVariantAssignment,
  UpdateBranchExperiment,
  UpdateEvaluationRun,
  UpdateExperimentCampaign,
  UpdateExperimentVariant,
  VariantAssignment,
  VariantAssignmentStatus,
} from "@paperclipai/shared";
import { parseObject } from "../adapters/utils.js";
import { computeNextRunAt } from "./schedule.js";
import { computeSoloInitialNextRun } from "./solos.js";

type ExperimentCampaignRow = typeof experimentCampaigns.$inferSelect;
type ExperimentVariantRow = typeof experimentVariants.$inferSelect;
type EvaluationSuiteRow = typeof evaluationSuites.$inferSelect;
type EvaluationRunRow = typeof evaluationRuns.$inferSelect;
type VariantAssignmentRow = typeof variantAssignments.$inferSelect;
type PolicyPackRow = typeof policyPacks.$inferSelect;
type PolicyVersionRow = typeof policyVersions.$inferSelect;
type PolicyRolloutRow = typeof policyRollouts.$inferSelect;
type BranchExperimentRow = typeof branchExperiments.$inferSelect;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function mapCampaign(row: ExperimentCampaignRow): ExperimentCampaign {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    phase: row.phase as ExperimentCampaign["phase"],
    subjectType: (row.subjectType as ExperimentSubjectType | null) ?? null,
    subjectId: row.subjectId ?? null,
    status: row.status as ExperimentCampaign["status"],
    objective: row.objective ?? null,
    baselineVariantId: row.baselineVariantId ?? null,
    winnerVariantId: row.winnerVariantId ?? null,
    trafficAllocation: (row.trafficAllocation ?? {}) as Record<string, unknown>,
    safetyPolicy: (row.safetyPolicy ?? {}) as Record<string, unknown>,
    summary: row.summary ?? null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdByUserId: row.createdByUserId ?? null,
    createdByAgentId: row.createdByAgentId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapVariant(row: ExperimentVariantRow): ExperimentVariant {
  return {
    id: row.id,
    companyId: row.companyId,
    campaignId: row.campaignId,
    label: row.label,
    role: row.role as ExperimentVariant["role"],
    status: row.status as ExperimentVariant["status"],
    trafficPercent: row.trafficPercent,
    config: (row.config ?? {}) as Record<string, unknown>,
    score: row.score ?? null,
    scoreLabel: row.scoreLabel ?? null,
    summary: row.summary ?? null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapSuite(row: EvaluationSuiteRow): EvaluationSuite {
  return {
    id: row.id,
    companyId: row.companyId,
    campaignId: row.campaignId,
    name: row.name,
    mode: row.mode as EvaluationSuite["mode"],
    sourceType: row.sourceType as EvaluationSuite["sourceType"],
    selector: (row.selector ?? {}) as Record<string, unknown>,
    judgeConfig: (row.judgeConfig ?? {}) as Record<string, unknown>,
    status: row.status as EvaluationSuite["status"],
    lastRunAt: toIso(row.lastRunAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapEvaluationRun(row: EvaluationRunRow): EvaluationRun {
  return {
    id: row.id,
    companyId: row.companyId,
    suiteId: row.suiteId,
    campaignId: row.campaignId,
    variantId: row.variantId ?? null,
    sourceHeartbeatRunId: row.sourceHeartbeatRunId ?? null,
    sourceIssueId: row.sourceIssueId ?? null,
    sourceScheduleId: row.sourceScheduleId ?? null,
    sourceWorkspaceId: row.sourceWorkspaceId ?? null,
    status: row.status as EvaluationRun["status"],
    score: row.score ?? null,
    scoreLabel: row.scoreLabel ?? null,
    summary: row.summary ?? null,
    metrics: (row.metrics ?? {}) as Record<string, unknown>,
    inputSnapshot: (row.inputSnapshot ?? {}) as Record<string, unknown>,
    outputSnapshot: (row.outputSnapshot ?? {}) as Record<string, unknown>,
    startedAt: toIso(row.startedAt),
    completedAt: toIso(row.completedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapAssignment(row: VariantAssignmentRow): VariantAssignment {
  return {
    id: row.id,
    companyId: row.companyId,
    campaignId: row.campaignId,
    variantId: row.variantId,
    assignmentType: row.assignmentType as VariantAssignment["assignmentType"],
    assignmentKey: row.assignmentKey,
    soloInstanceId: row.soloInstanceId ?? null,
    issueScheduleId: row.issueScheduleId ?? null,
    issueId: row.issueId ?? null,
    heartbeatRunId: row.heartbeatRunId ?? null,
    evaluationRunId: row.evaluationRunId ?? null,
    status: row.status as VariantAssignmentStatus,
    score: row.score ?? null,
    summary: row.summary ?? null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPolicyPack(row: PolicyPackRow): PolicyPack {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    targetType: row.targetType as PolicyTargetType,
    targetId: row.targetId ?? null,
    status: row.status as PolicyPack["status"],
    currentVersionId: row.currentVersionId ?? null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPolicyVersion(row: PolicyVersionRow): PolicyVersion {
  return {
    id: row.id,
    companyId: row.companyId,
    policyPackId: row.policyPackId,
    sequence: row.sequence,
    status: row.status as PolicyVersion["status"],
    summary: row.summary ?? null,
    config: (row.config ?? {}) as Record<string, unknown>,
    evaluationSuiteId: row.evaluationSuiteId ?? null,
    createdByUserId: row.createdByUserId ?? null,
    createdByAgentId: row.createdByAgentId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPolicyRollout(row: PolicyRolloutRow): PolicyRollout {
  return {
    id: row.id,
    companyId: row.companyId,
    policyPackId: row.policyPackId,
    policyVersionId: row.policyVersionId,
    campaignId: row.campaignId ?? null,
    approvalId: row.approvalId ?? null,
    status: row.status as PolicyRollout["status"],
    rolloutScope: (row.rolloutScope ?? {}) as Record<string, unknown>,
    metrics: (row.metrics ?? {}) as Record<string, unknown>,
    activatedAt: toIso(row.activatedAt),
    rolledBackAt: toIso(row.rolledBackAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapBranchExperiment(row: BranchExperimentRow): BranchExperiment {
  return {
    id: row.id,
    companyId: row.companyId,
    campaignId: row.campaignId ?? null,
    variantId: row.variantId ?? null,
    projectId: row.projectId,
    workspaceId: row.workspaceId ?? null,
    sourceIssueId: row.sourceIssueId ?? null,
    sourceEvaluationRunId: row.sourceEvaluationRunId ?? null,
    approvalId: row.approvalId ?? null,
    branchName: row.branchName,
    worktreePath: row.worktreePath ?? null,
    baseRef: row.baseRef ?? null,
    status: row.status as BranchExperiment["status"],
    patchSummary: row.patchSummary ?? null,
    validatorCommands: (row.validatorCommands ?? []) as string[],
    validationResults: (row.validationResults ?? {}) as Record<string, unknown>,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asRawNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function deriveBranchName(input: { projectName: string; providedBranchName?: string | null }) {
  const explicit = asString(input.providedBranchName);
  if (explicit) return explicit;
  const slug = input.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "project";
  return `paperclip/exp/${slug}-${randomUUID().slice(0, 8)}`;
}

function deriveWorktreePath(input: { cwd: string | null; branchName: string; providedPath?: string | null }) {
  const explicit = asString(input.providedPath);
  if (explicit) return explicit;
  if (!input.cwd) return null;
  const parent = dirname(input.cwd);
  const branchSlug = input.branchName.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return join(parent, ".paperclip-worktrees", branchSlug);
}

export function scoreFromHistoricalHeartbeat(row: { status: string; usageJson: unknown; resultJson: unknown }) {
  const usage = parseObject(row.usageJson);
  const result = parseObject(row.resultJson);
  const totalCost = asNumber(usage.totalCostUsd) ?? asNumber(usage.costUsd) ?? 0;
  const success = row.status === "succeeded" ? 1 : 0;
  const completedTasks = asNumber(result.completedTaskCount) ?? 0;
  return Number((success * 100 + completedTasks * 10 - totalCost * 20).toFixed(3));
}

function mergeRecord(base: Record<string, unknown> | undefined, patch: Record<string, unknown> | undefined) {
  return {
    ...(base ?? {}),
    ...(patch ?? {}),
  };
}

export function applyVariantToIssueDraft<T extends Record<string, unknown>>(
  draft: T,
  variant: ExperimentVariant | null,
) {
  if (!variant) return draft;
  const config = variant.config ?? {};
  const issuePatch = parseObject(config.issuePatch);
  const adapterConfig = parseObject(config.adapterConfig);
  const metadata = parseObject(config.metadata);

  const next = { ...draft } as T & {
    title?: string;
    description?: string | null;
    priority?: string;
    assigneeAgentId?: string | null;
    assigneeUserId?: string | null;
    assigneeAdapterOverrides?: { adapterConfig?: Record<string, unknown> };
    metadata?: Record<string, unknown>;
  };

  const titlePrefix = asRawNonEmptyString(issuePatch.titlePrefix);
  const titleSuffix = asRawNonEmptyString(issuePatch.titleSuffix);
  const descriptionPrefix = asRawNonEmptyString(issuePatch.descriptionPrefix);
  const descriptionSuffix = asRawNonEmptyString(issuePatch.descriptionSuffix);

  if (titlePrefix && next.title) next.title = `${titlePrefix}${next.title}`;
  if (titleSuffix && next.title) next.title = `${next.title}${titleSuffix}`;
  if (descriptionPrefix) next.description = `${descriptionPrefix}${next.description ?? ""}`.trim();
  if (descriptionSuffix) next.description = `${next.description ?? ""}${descriptionSuffix}`.trim();
  if (asString(issuePatch.priority)) next.priority = String(issuePatch.priority);
  if (asString(issuePatch.assigneeAgentId)) next.assigneeAgentId = String(issuePatch.assigneeAgentId);
  if (asString(issuePatch.assigneeUserId)) next.assigneeUserId = String(issuePatch.assigneeUserId);
  if (Object.keys(adapterConfig).length > 0) {
    next.assigneeAdapterOverrides = {
      adapterConfig: mergeRecord(next.assigneeAdapterOverrides?.adapterConfig, adapterConfig),
    };
  }
  if (Object.keys(metadata).length > 0) {
    next.metadata = mergeRecord(next.metadata, metadata);
  }

  return next;
}

export function experimentService(db: Db) {
  async function getCampaign(id: string) {
    const row = await db.select().from(experimentCampaigns).where(eq(experimentCampaigns.id, id)).then((rows) => rows[0] ?? null);
    return row ? mapCampaign(row) : null;
  }

  async function getVariant(id: string) {
    const row = await db.select().from(experimentVariants).where(eq(experimentVariants.id, id)).then((rows) => rows[0] ?? null);
    return row ? mapVariant(row) : null;
  }

  async function getPolicyPack(id: string) {
    const row = await db.select().from(policyPacks).where(eq(policyPacks.id, id)).then((rows) => rows[0] ?? null);
    return row ? mapPolicyPack(row) : null;
  }

  async function getPolicyVersion(id: string) {
    const row = await db.select().from(policyVersions).where(eq(policyVersions.id, id)).then((rows) => rows[0] ?? null);
    return row ? mapPolicyVersion(row) : null;
  }

  async function getPolicyRollout(id: string) {
    const row = await db.select().from(policyRollouts).where(eq(policyRollouts.id, id)).then((rows) => rows[0] ?? null);
    return row ? mapPolicyRollout(row) : null;
  }

  async function getBranchExperiment(id: string) {
    const row = await db.select().from(branchExperiments).where(eq(branchExperiments.id, id)).then((rows) => rows[0] ?? null);
    return row ? mapBranchExperiment(row) : null;
  }

  async function listSourceHeartbeats(companyId: string, suite: EvaluationSuite, input: { limit?: number; sourceHeartbeatRunIds?: string[] }) {
    const selector = suite.selector ?? {};
    const conditions = [eq(heartbeatRuns.companyId, companyId)] as any[];
    if (input.sourceHeartbeatRunIds?.length) {
      conditions.push(inArray(heartbeatRuns.id, input.sourceHeartbeatRunIds));
    } else {
      const agentId = asString(selector.agentId);
      const invocationSource = asString(selector.invocationSource);
      const status = asString(selector.status);
      if (agentId) conditions.push(eq(heartbeatRuns.agentId, agentId));
      if (invocationSource) conditions.push(eq(heartbeatRuns.invocationSource, invocationSource));
      if (status) conditions.push(eq(heartbeatRuns.status, status));
    }
    const limit = input.limit ?? asNumber(selector.limit) ?? 20;
    return db
      .select()
      .from(heartbeatRuns)
      .where(and(...conditions))
      .orderBy(desc(heartbeatRuns.createdAt))
      .limit(limit);
  }

  async function listSourceIssues(companyId: string, suite: EvaluationSuite, input: { limit?: number; sourceIssueIds?: string[] }) {
    const selector = suite.selector ?? {};
    const conditions = [eq(issues.companyId, companyId)] as any[];
    if (input.sourceIssueIds?.length) {
      conditions.push(inArray(issues.id, input.sourceIssueIds));
    } else {
      const projectId = asString(selector.projectId);
      const status = asString(selector.status);
      if (projectId) conditions.push(eq(issues.projectId, projectId));
      if (status) conditions.push(eq(issues.status, status));
    }
    const limit = input.limit ?? asNumber(selector.limit) ?? 20;
    return db.select().from(issues).where(and(...conditions)).orderBy(desc(issues.createdAt)).limit(limit);
  }

  async function listSourceSchedules(companyId: string, suite: EvaluationSuite, input: { limit?: number; sourceScheduleIds?: string[] }) {
    const selector = suite.selector ?? {};
    const conditions = [eq(issueSchedules.companyId, companyId)] as any[];
    if (input.sourceScheduleIds?.length) {
      conditions.push(inArray(issueSchedules.id, input.sourceScheduleIds));
    } else {
      const templateIssueId = asString(selector.templateIssueId);
      const status = asString(selector.status);
      if (templateIssueId) conditions.push(eq(issueSchedules.templateIssueId, templateIssueId));
      if (status) conditions.push(eq(issueSchedules.status, status));
    }
    const limit = input.limit ?? asNumber(selector.limit) ?? 20;
    return db.select().from(issueSchedules).where(and(...conditions)).orderBy(desc(issueSchedules.createdAt)).limit(limit);
  }

  async function listSourceWorkspaces(companyId: string, suite: EvaluationSuite, input: { limit?: number; sourceWorkspaceIds?: string[] }) {
    const selector = suite.selector ?? {};
    const conditions = [eq(projectWorkspaces.companyId, companyId)] as any[];
    if (input.sourceWorkspaceIds?.length) {
      conditions.push(inArray(projectWorkspaces.id, input.sourceWorkspaceIds));
    } else {
      const projectId = asString(selector.projectId);
      if (projectId) conditions.push(eq(projectWorkspaces.projectId, projectId));
    }
    const limit = input.limit ?? asNumber(selector.limit) ?? 20;
    return db.select().from(projectWorkspaces).where(and(...conditions)).orderBy(desc(projectWorkspaces.createdAt)).limit(limit);
  }

  async function findActivePopulationCampaign(companyId: string, subjectType: ExperimentSubjectType, subjectId: string) {
    const row = await db
      .select()
      .from(experimentCampaigns)
      .where(
        and(
          eq(experimentCampaigns.companyId, companyId),
          eq(experimentCampaigns.phase, "population"),
          eq(experimentCampaigns.status, "active"),
          eq(experimentCampaigns.subjectType, subjectType),
          eq(experimentCampaigns.subjectId, subjectId),
        ),
      )
      .orderBy(desc(experimentCampaigns.updatedAt))
      .then((rows) => rows[0] ?? null);
    return row ? mapCampaign(row) : null;
  }

  async function findLatestApprovalByTypeAndPayload<T extends Record<string, unknown>>(
    companyId: string,
    type: string,
    predicate: (payload: T) => boolean,
  ) {
    const rows = await db
      .select()
      .from(approvals)
      .where(and(eq(approvals.companyId, companyId), eq(approvals.type, type)))
      .orderBy(desc(approvals.createdAt));

    for (const row of rows) {
      const payload = parseObject(row.payload) as T;
      if (predicate(payload)) return row;
    }
    return null;
  }

  return {
    getCampaign,
    getVariant,
    getPolicyPack,
    getPolicyVersion,
    getPolicyRollout,
    getBranchExperiment,

    async listCampaigns(companyId: string, phase?: ExperimentCampaign["phase"]) {
      const conditions = [eq(experimentCampaigns.companyId, companyId)] as any[];
      if (phase) conditions.push(eq(experimentCampaigns.phase, phase));
      const rows = await db.select().from(experimentCampaigns).where(and(...conditions)).orderBy(desc(experimentCampaigns.createdAt));
      return rows.map(mapCampaign);
    },

    async createCampaign(companyId: string, input: CreateExperimentCampaign & { createdByUserId?: string | null; createdByAgentId?: string | null }) {
      const now = new Date();
      const row = await db.insert(experimentCampaigns).values({
        companyId,
        name: input.name,
        phase: input.phase,
        subjectType: input.subjectType ?? null,
        subjectId: input.subjectId ?? null,
        status: "draft",
        objective: input.objective ?? null,
        trafficAllocation: input.trafficAllocation ?? {},
        safetyPolicy: input.safetyPolicy ?? {},
        summary: input.summary ?? null,
        metadata: input.metadata ?? {},
        createdByUserId: input.createdByUserId ?? null,
        createdByAgentId: input.createdByAgentId ?? null,
        createdAt: now,
        updatedAt: now,
      }).returning().then((rows) => rows[0]);
      return mapCampaign(row);
    },

    async updateCampaign(id: string, patch: UpdateExperimentCampaign) {
      const row = await db.update(experimentCampaigns).set({ ...patch, updatedAt: new Date() }).where(eq(experimentCampaigns.id, id)).returning().then((rows) => rows[0] ?? null);
      return row ? mapCampaign(row) : null;
    },

    async listVariants(campaignId: string) {
      const rows = await db.select().from(experimentVariants).where(eq(experimentVariants.campaignId, campaignId)).orderBy(desc(experimentVariants.role), desc(experimentVariants.updatedAt));
      return rows.map(mapVariant);
    },

    async createVariant(companyId: string, campaignId: string, input: CreateExperimentVariant) {
      const row = await db.insert(experimentVariants).values({
        companyId,
        campaignId,
        label: input.label,
        role: input.role,
        status: input.status,
        trafficPercent: input.trafficPercent,
        config: input.config ?? {},
        metadata: input.metadata ?? {},
      }).returning().then((rows) => rows[0]);

      if (input.role === "baseline") {
        await db.update(experimentCampaigns).set({ baselineVariantId: row.id, updatedAt: new Date() }).where(eq(experimentCampaigns.id, campaignId));
      }

      return mapVariant(row);
    },

    async updateVariant(id: string, patch: UpdateExperimentVariant) {
      const row = await db.update(experimentVariants).set({ ...patch, updatedAt: new Date() }).where(eq(experimentVariants.id, id)).returning().then((rows) => rows[0] ?? null);
      return row ? mapVariant(row) : null;
    },

    async requestVariantPromotion(id: string, actor: { actorId: string; actorType: "user" | "agent" }) {
      return db.transaction(async (tx) => {
        const variant = await tx.select().from(experimentVariants).where(eq(experimentVariants.id, id)).then((rows) => rows[0] ?? null);
        if (!variant) return null;
        const now = new Date();
        const approval = await tx.insert(approvals).values({
          companyId: variant.companyId,
          type: "promote_experiment_variant",
          requestedByAgentId: actor.actorType === "agent" ? actor.actorId : null,
          requestedByUserId: actor.actorType === "user" ? actor.actorId : null,
          status: "pending",
          payload: {
            variantId: variant.id,
            campaignId: variant.campaignId,
            label: variant.label,
          },
          createdAt: now,
          updatedAt: now,
        }).returning().then((rows) => rows[0]);
        await tx.update(experimentVariants).set({ status: "paused", updatedAt: now }).where(eq(experimentVariants.id, variant.id));
        return { approvalId: approval.id };
      });
    },

    async promoteVariant(id: string, opts?: { allowWithoutApproval?: boolean }) {
      return db.transaction(async (tx) => {
        const variant = await tx.select().from(experimentVariants).where(eq(experimentVariants.id, id)).then((rows) => rows[0] ?? null);
        if (!variant) return null;
        if (!opts?.allowWithoutApproval) {
          const approval = await findLatestApprovalByTypeAndPayload<{ variantId?: string }>(
            variant.companyId,
            "promote_experiment_variant",
            (payload) => payload.variantId === variant.id,
          );
          if (!approval || approval.status !== "approved") {
            throw new Error("Variant promotion approval has not been approved yet");
          }
        }
        const now = new Date();
        await tx.update(experimentVariants).set({ status: "retired", updatedAt: now }).where(and(eq(experimentVariants.campaignId, variant.campaignId), eq(experimentVariants.role, "challenger")));
        const promoted = await tx.update(experimentVariants).set({ status: "promoted", updatedAt: now }).where(eq(experimentVariants.id, id)).returning().then((rows) => rows[0] ?? null);
        await tx.update(experimentCampaigns).set({ winnerVariantId: id, updatedAt: now, status: "active" }).where(eq(experimentCampaigns.id, variant.campaignId));
        return promoted ? mapVariant(promoted) : null;
      });
    },

    async listEvaluationSuites(campaignId: string) {
      const rows = await db.select().from(evaluationSuites).where(eq(evaluationSuites.campaignId, campaignId)).orderBy(desc(evaluationSuites.createdAt));
      return rows.map(mapSuite);
    },

    async getEvaluationSuite(id: string) {
      const row = await db.select().from(evaluationSuites).where(eq(evaluationSuites.id, id)).then((rows) => rows[0] ?? null);
      return row ? mapSuite(row) : null;
    },

    async createEvaluationSuite(companyId: string, campaignId: string, input: CreateEvaluationSuite) {
      const row = await db.insert(evaluationSuites).values({
        companyId,
        campaignId,
        name: input.name,
        mode: input.mode,
        sourceType: input.sourceType,
        selector: input.selector ?? {},
        judgeConfig: input.judgeConfig ?? {},
        status: input.status,
      }).returning().then((rows) => rows[0]);
      return mapSuite(row);
    },

    async listEvaluationRunsForSuite(suiteId: string) {
      const rows = await db.select().from(evaluationRuns).where(eq(evaluationRuns.suiteId, suiteId)).orderBy(desc(evaluationRuns.createdAt));
      return rows.map(mapEvaluationRun);
    },

    async getEvaluationRun(id: string) {
      const row = await db.select().from(evaluationRuns).where(eq(evaluationRuns.id, id)).then((rows) => rows[0] ?? null);
      return row ? mapEvaluationRun(row) : null;
    },

    async updateEvaluationRun(id: string, patch: UpdateEvaluationRun) {
      const now = new Date();
      const updateValues: Partial<typeof evaluationRuns.$inferInsert> = { updatedAt: now };
      if (patch.status !== undefined) updateValues.status = patch.status;
      if (patch.score !== undefined) updateValues.score = patch.score ?? null;
      if (patch.scoreLabel !== undefined) updateValues.scoreLabel = patch.scoreLabel ?? null;
      if (patch.summary !== undefined) updateValues.summary = patch.summary ?? null;
      if (patch.metrics !== undefined) updateValues.metrics = patch.metrics;
      if (patch.outputSnapshot !== undefined) updateValues.outputSnapshot = patch.outputSnapshot;
      if (patch.status === "running") updateValues.startedAt = now;
      if (patch.status && ["succeeded", "failed", "cancelled", "skipped"].includes(patch.status)) {
        updateValues.completedAt = now;
      }
      const row = await db.update(evaluationRuns).set(updateValues).where(eq(evaluationRuns.id, id)).returning().then((rows) => rows[0] ?? null);
      if (!row) return null;

      if (row.variantId && row.score != null) {
        await db.update(experimentVariants).set({ score: row.score, scoreLabel: row.scoreLabel ?? null, summary: row.summary ?? null, updatedAt: now }).where(eq(experimentVariants.id, row.variantId));
      }

      return mapEvaluationRun(row);
    },

    async runEvaluationSuite(
      suiteId: string,
      input: {
        limit?: number;
        sourceHeartbeatRunIds?: string[];
        sourceIssueIds?: string[];
        sourceScheduleIds?: string[];
        sourceWorkspaceIds?: string[];
        variantIds?: string[];
      },
    ) {
      const suite = await this.getEvaluationSuite(suiteId);
      if (!suite) throw new Error(`Evaluation suite \"${suiteId}\" not found`);
      const variants = input.variantIds?.length
        ? await db.select().from(experimentVariants).where(inArray(experimentVariants.id, input.variantIds))
        : await db.select().from(experimentVariants).where(eq(experimentVariants.campaignId, suite.campaignId));
      const now = new Date();
      const created: EvaluationRun[] = [];

      if (suite.sourceType === "heartbeat_run") {
        const sources = await listSourceHeartbeats(suite.companyId, suite, input);
        for (const source of sources) {
          for (const variant of variants) {
            const score = variant.role === "baseline" ? scoreFromHistoricalHeartbeat(source) : null;
            const status = variant.role === "baseline" ? "succeeded" : "queued";
            const row = await db.insert(evaluationRuns).values({
              companyId: suite.companyId,
              suiteId: suite.id,
              campaignId: suite.campaignId,
              variantId: variant.id,
              sourceHeartbeatRunId: source.id,
              status,
              score,
              scoreLabel: score != null ? "historical_heuristic" : null,
              summary: variant.role === "baseline" ? "Baseline score derived from historical run telemetry." : "Queued for shadow replay execution.",
              metrics: {
                sourceStatus: source.status,
                invocationSource: source.invocationSource,
                historicalScore: score,
              },
              inputSnapshot: {
                suite,
                variant: mapVariant(variant),
                source: {
                  id: source.id,
                  status: source.status,
                  contextSnapshot: source.contextSnapshot ?? {},
                  usageJson: source.usageJson ?? {},
                  resultJson: source.resultJson ?? {},
                },
              },
              outputSnapshot: {},
              startedAt: status === "succeeded" ? now : null,
              completedAt: status === "succeeded" ? now : null,
              createdAt: now,
              updatedAt: now,
            }).returning().then((rows) => rows[0]);
            created.push(mapEvaluationRun(row));
          }
        }
      } else if (suite.sourceType === "issue") {
        const sources = await listSourceIssues(suite.companyId, suite, input);
        for (const source of sources) {
          for (const variant of variants) {
            const row = await db.insert(evaluationRuns).values({
              companyId: suite.companyId,
              suiteId: suite.id,
              campaignId: suite.campaignId,
              variantId: variant.id,
              sourceIssueId: source.id,
              status: "queued",
              summary: "Queued for issue replay evaluation.",
              metrics: { issueStatus: source.status, priority: source.priority },
              inputSnapshot: { suite, variant: mapVariant(variant), source },
              outputSnapshot: {},
              createdAt: now,
              updatedAt: now,
            }).returning().then((rows) => rows[0]);
            created.push(mapEvaluationRun(row));
          }
        }
      } else if (suite.sourceType === "schedule") {
        const sources = await listSourceSchedules(suite.companyId, suite, input);
        for (const source of sources) {
          for (const variant of variants) {
            const row = await db.insert(evaluationRuns).values({
              companyId: suite.companyId,
              suiteId: suite.id,
              campaignId: suite.campaignId,
              variantId: variant.id,
              sourceScheduleId: source.id,
              status: "queued",
              summary: "Queued for schedule replay evaluation.",
              metrics: { scheduleType: source.scheduleType, frequency: source.frequency },
              inputSnapshot: { suite, variant: mapVariant(variant), source },
              outputSnapshot: {},
              createdAt: now,
              updatedAt: now,
            }).returning().then((rows) => rows[0]);
            created.push(mapEvaluationRun(row));
          }
        }
      } else {
        const sources = await listSourceWorkspaces(suite.companyId, suite, input);
        for (const source of sources) {
          for (const variant of variants) {
            const row = await db.insert(evaluationRuns).values({
              companyId: suite.companyId,
              suiteId: suite.id,
              campaignId: suite.campaignId,
              variantId: variant.id,
              sourceWorkspaceId: source.id,
              status: "queued",
              summary: "Queued for branch/workspace evaluation.",
              metrics: { workspaceName: source.name, repoRef: source.repoRef },
              inputSnapshot: { suite, variant: mapVariant(variant), source },
              outputSnapshot: {},
              createdAt: now,
              updatedAt: now,
            }).returning().then((rows) => rows[0]);
            created.push(mapEvaluationRun(row));
          }
        }
      }

      await db.update(evaluationSuites).set({ lastRunAt: now, updatedAt: now, status: "active" }).where(eq(evaluationSuites.id, suite.id));
      return created;
    },

    async listAssignments(campaignId: string) {
      const rows = await db.select().from(variantAssignments).where(eq(variantAssignments.campaignId, campaignId)).orderBy(desc(variantAssignments.createdAt));
      return rows.map(mapAssignment);
    },

    async routeVariant(campaignId: string, input: RouteVariantAssignment) {
      const campaign = await getCampaign(campaignId);
      if (!campaign) throw new Error(`Experiment campaign \"${campaignId}\" not found`);

      const variantRows = await db
        .select()
        .from(experimentVariants)
        .where(and(eq(experimentVariants.campaignId, campaignId), inArray(experimentVariants.status, ["active", "promoted"] as any)));
      if (variantRows.length === 0) {
        throw new Error("No active variants are available for routing");
      }

      const totalWeight = variantRows.reduce((sum, row) => sum + Math.max(0, row.trafficPercent), 0);
      const fallbackBaseline = variantRows.find((row) => row.role === "baseline") ?? variantRows[0]!;
      const target = totalWeight <= 0
        ? fallbackBaseline
        : (() => {
            const ticket = hashString(`${campaignId}:${input.assignmentKey}`) % totalWeight;
            let cursor = 0;
            for (const row of variantRows) {
              cursor += Math.max(0, row.trafficPercent);
              if (ticket < cursor) return row;
            }
            return fallbackBaseline;
          })();

      const row = await db.insert(variantAssignments).values({
        companyId: campaign.companyId,
        campaignId,
        variantId: target.id,
        assignmentType: input.assignmentType,
        assignmentKey: input.assignmentKey,
        soloInstanceId: input.soloInstanceId ?? null,
        issueScheduleId: input.issueScheduleId ?? null,
        issueId: input.issueId ?? null,
        heartbeatRunId: input.heartbeatRunId ?? null,
        evaluationRunId: input.evaluationRunId ?? null,
        status: "assigned",
        metadata: input.metadata ?? {},
      }).returning().then((rows) => rows[0]);

      return {
        campaign,
        variant: mapVariant(target),
        assignment: mapAssignment(row),
      };
    },

    async routePopulationVariant(input: { companyId: string; subjectType: ExperimentSubjectType; subjectId: string } & RouteVariantAssignment) {
      const campaign = await findActivePopulationCampaign(input.companyId, input.subjectType, input.subjectId);
      if (!campaign) return null;
      return this.routeVariant(campaign.id, input);
    },

    async listPolicyPacks(companyId: string) {
      const rows = await db.select().from(policyPacks).where(eq(policyPacks.companyId, companyId)).orderBy(desc(policyPacks.createdAt));
      return rows.map(mapPolicyPack);
    },

    async createPolicyPack(companyId: string, input: CreatePolicyPack) {
      const row = await db.insert(policyPacks).values({
        companyId,
        name: input.name,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        status: "draft",
        metadata: input.metadata ?? {},
      }).returning().then((rows) => rows[0]);
      return mapPolicyPack(row);
    },

    async listPolicyVersions(policyPackId: string) {
      const rows = await db.select().from(policyVersions).where(eq(policyVersions.policyPackId, policyPackId)).orderBy(desc(policyVersions.sequence));
      return rows.map(mapPolicyVersion);
    },

    async listPolicyRollouts(policyPackId: string) {
      const rows = await db.select().from(policyRollouts).where(eq(policyRollouts.policyPackId, policyPackId)).orderBy(desc(policyRollouts.createdAt));
      return rows.map(mapPolicyRollout);
    },

    async createPolicyVersion(policyPackId: string, input: CreatePolicyVersion & { companyId: string; createdByUserId?: string | null; createdByAgentId?: string | null }) {
      const [{ maxSequence }] = await db.select({ maxSequence: sql<number>`coalesce(max(${policyVersions.sequence}), 0)` }).from(policyVersions).where(eq(policyVersions.policyPackId, policyPackId));
      const row = await db.insert(policyVersions).values({
        companyId: input.companyId,
        policyPackId,
        sequence: Number(maxSequence ?? 0) + 1,
        status: "draft",
        summary: input.summary ?? null,
        config: input.config ?? {},
        evaluationSuiteId: input.evaluationSuiteId ?? null,
        createdByUserId: input.createdByUserId ?? null,
        createdByAgentId: input.createdByAgentId ?? null,
      }).returning().then((rows) => rows[0]);
      return mapPolicyVersion(row);
    },

    async requestPolicyRollout(policyVersionId: string, input: RequestPolicyRollout, actor: { actorId: string; actorType: "user" | "agent"; agentId?: string | null }) {
      return db.transaction(async (tx) => {
        const version = await tx.select().from(policyVersions).where(eq(policyVersions.id, policyVersionId)).then((rows) => rows[0] ?? null);
        if (!version) throw new Error(`Policy version \"${policyVersionId}\" not found`);
        const pack = await tx.select().from(policyPacks).where(eq(policyPacks.id, version.policyPackId)).then((rows) => rows[0] ?? null);
        if (!pack) throw new Error(`Policy pack \"${version.policyPackId}\" not found`);
        const now = new Date();
        const rollout = await tx.insert(policyRollouts).values({
          companyId: version.companyId,
          policyPackId: version.policyPackId,
          policyVersionId: version.id,
          campaignId: input.campaignId ?? null,
          status: input.requestApproval === false ? "approved" : "pending_approval",
          rolloutScope: input.rolloutScope ?? {},
          metrics: {},
          createdAt: now,
          updatedAt: now,
        }).returning().then((rows) => rows[0]);

        let approvalId: string | null = null;
        if (input.requestApproval !== false) {
          const approval = await tx.insert(approvals).values({
            companyId: version.companyId,
            type: "apply_policy_rollout",
            requestedByAgentId: actor.actorType === "agent" ? actor.actorId : null,
            requestedByUserId: actor.actorType === "user" ? actor.actorId : null,
            status: "pending",
            payload: {
              policyRolloutId: rollout.id,
              policyPackId: pack.id,
              policyVersionId: version.id,
              targetType: pack.targetType,
              targetId: pack.targetId,
              config: version.config,
            },
            createdAt: now,
            updatedAt: now,
          }).returning().then((rows) => rows[0]);
          approvalId = approval.id;
          await tx.update(policyRollouts).set({ approvalId, updatedAt: now }).where(eq(policyRollouts.id, rollout.id));
        }

        await tx.update(policyVersions).set({ status: input.requestApproval === false ? "approved" : "pending_approval", updatedAt: now }).where(eq(policyVersions.id, version.id));

        return {
          rollout: mapPolicyRollout({ ...rollout, approvalId }),
          approvalId,
        };
      });
    },

    async activatePolicyRollout(rolloutId: string, opts?: { allowWithoutApproval?: boolean }) {
      return db.transaction(async (tx) => {
        const rollout = await tx.select().from(policyRollouts).where(eq(policyRollouts.id, rolloutId)).then((rows) => rows[0] ?? null);
        if (!rollout) throw new Error(`Policy rollout \"${rolloutId}\" not found`);
        if (rollout.approvalId && !opts?.allowWithoutApproval) {
          const approval = await tx.select().from(approvals).where(eq(approvals.id, rollout.approvalId)).then((rows) => rows[0] ?? null);
          if (!approval || approval.status !== "approved") {
            throw new Error("Policy rollout approval has not been approved yet");
          }
        }

        const pack = await tx.select().from(policyPacks).where(eq(policyPacks.id, rollout.policyPackId)).then((rows) => rows[0] ?? null);
        const version = await tx.select().from(policyVersions).where(eq(policyVersions.id, rollout.policyVersionId)).then((rows) => rows[0] ?? null);
        if (!pack || !version) throw new Error("Policy rollout is missing its pack or version");

        const config = parseObject(version.config);
        const now = new Date();

        if (pack.targetType === "solo_instance" && pack.targetId) {
          const schedule = asString(config.runSchedule);
          if (schedule) {
            await tx.update(soloInstances).set({
              runSchedule: schedule,
              nextRunAt: computeSoloInitialNextRun(schedule as any, now),
              updatedAt: now,
            }).where(eq(soloInstances.id, pack.targetId));
          }
        }

        if (pack.targetType === "issue_schedule" && pack.targetId) {
          const schedule = await tx.select().from(issueSchedules).where(eq(issueSchedules.id, pack.targetId)).then((rows) => rows[0] ?? null);
          if (schedule) {
            const frequency = asString(config.frequency) ?? schedule.frequency;
            const scheduleType = asString(config.scheduleType) ?? schedule.scheduleType;
            const runAt = asString(config.runAt) ? new Date(String(config.runAt)) : schedule.runAt;
            const hourOfDay = asNumber(config.hourOfDay) ?? schedule.hourOfDay;
            const minuteOfHour = asNumber(config.minuteOfHour) ?? schedule.minuteOfHour;
            const dayOfWeek = asNumber(config.dayOfWeek) ?? schedule.dayOfWeek;
            const dayOfMonth = asNumber(config.dayOfMonth) ?? schedule.dayOfMonth;
            const endAt = asString(config.endAt) ? new Date(String(config.endAt)) : schedule.endAt;
            const nextRunAt = computeNextRunAt(scheduleType, frequency, now, {
              runAt,
              hourOfDay,
              minuteOfHour,
              dayOfWeek,
              dayOfMonth,
              endAt,
            });
            await tx.update(issueSchedules).set({
              scheduleType,
              frequency,
              runAt,
              hourOfDay,
              minuteOfHour,
              dayOfWeek,
              dayOfMonth,
              endAt,
              nextRunAt,
              updatedAt: now,
            }).where(eq(issueSchedules.id, schedule.id));
          }
        }

        const activated = await tx.update(policyRollouts).set({ status: "active", activatedAt: now, updatedAt: now }).where(eq(policyRollouts.id, rollout.id)).returning().then((rows) => rows[0] ?? null);
        await tx.update(policyVersions).set({ status: "active", updatedAt: now }).where(eq(policyVersions.id, rollout.policyVersionId));
        await tx.update(policyPacks).set({ status: "active", currentVersionId: rollout.policyVersionId, updatedAt: now }).where(eq(policyPacks.id, rollout.policyPackId));
        return activated ? mapPolicyRollout(activated) : null;
      });
    },

    async listBranchExperiments(companyId: string) {
      const rows = await db.select().from(branchExperiments).where(eq(branchExperiments.companyId, companyId)).orderBy(desc(branchExperiments.createdAt));
      return rows.map(mapBranchExperiment);
    },

    async createBranchExperiment(companyId: string, input: CreateBranchExperiment) {
      const project = await db.select().from(projects).where(eq(projects.id, input.projectId)).then((rows) => rows[0] ?? null);
      if (!project || project.companyId !== companyId) {
        throw new Error(`Project \"${input.projectId}\" not found`);
      }
      const workspace = input.workspaceId
        ? await db.select().from(projectWorkspaces).where(eq(projectWorkspaces.id, input.workspaceId)).then((rows) => rows[0] ?? null)
        : await db.select().from(projectWorkspaces).where(and(eq(projectWorkspaces.projectId, project.id), eq(projectWorkspaces.isPrimary, true))).then((rows) => rows[0] ?? null);
      const branchName = deriveBranchName({ projectName: project.name, providedBranchName: input.branchName });
      const worktreePath = deriveWorktreePath({ cwd: workspace?.cwd ?? null, branchName, providedPath: input.worktreePath ?? null });
      const baseRef = asString(input.baseRef) ?? workspace?.repoRef ?? null;

      const row = await db.insert(branchExperiments).values({
        companyId,
        campaignId: input.campaignId ?? null,
        variantId: input.variantId ?? null,
        projectId: project.id,
        workspaceId: workspace?.id ?? null,
        sourceIssueId: input.sourceIssueId ?? null,
        sourceEvaluationRunId: input.sourceEvaluationRunId ?? null,
        branchName,
        worktreePath,
        baseRef,
        status: "draft",
        patchSummary: null,
        validatorCommands: input.validatorCommands ?? ["pnpm -r typecheck", "pnpm test:run"],
        validationResults: workspace?.cwd ? { suggestedBaseDir: dirname(workspace.cwd), workspaceName: workspace.name, workspaceCwd: workspace.cwd } : {},
        metadata: mergeRecord(input.metadata ?? {}, workspace ? { workspaceName: workspace.name, repoUrl: workspace.repoUrl, repoRef: workspace.repoRef, projectName: project.name, workspaceBasename: workspace.cwd ? basename(workspace.cwd) : null } : { projectName: project.name }),
      }).returning().then((rows) => rows[0]);
      return mapBranchExperiment(row);
    },

    async updateBranchExperiment(id: string, patch: UpdateBranchExperiment) {
      const row = await db.update(branchExperiments).set({ ...patch, updatedAt: new Date() }).where(eq(branchExperiments.id, id)).returning().then((rows) => rows[0] ?? null);
      return row ? mapBranchExperiment(row) : null;
    },

    async requestBranchPromotion(id: string, actor: { actorId: string; actorType: "user" | "agent" }) {
      return db.transaction(async (tx) => {
        const experiment = await tx.select().from(branchExperiments).where(eq(branchExperiments.id, id)).then((rows) => rows[0] ?? null);
        if (!experiment) throw new Error(`Branch experiment \"${id}\" not found`);
        const now = new Date();
        const approval = await tx.insert(approvals).values({
          companyId: experiment.companyId,
          type: "promote_branch_experiment",
          requestedByAgentId: actor.actorType === "agent" ? actor.actorId : null,
          requestedByUserId: actor.actorType === "user" ? actor.actorId : null,
          status: "pending",
          payload: {
            branchExperimentId: experiment.id,
            projectId: experiment.projectId,
            workspaceId: experiment.workspaceId,
            branchName: experiment.branchName,
            worktreePath: experiment.worktreePath,
            baseRef: experiment.baseRef,
          },
          createdAt: now,
          updatedAt: now,
        }).returning().then((rows) => rows[0]);
        const updated = await tx.update(branchExperiments).set({ approvalId: approval.id, status: "pending_approval", updatedAt: now }).where(eq(branchExperiments.id, id)).returning().then((rows) => rows[0] ?? null);
        return updated ? mapBranchExperiment(updated) : null;
      });
    },

    async promoteBranchExperiment(id: string, opts?: { allowWithoutApproval?: boolean }) {
      return db.transaction(async (tx) => {
        const experiment = await tx.select().from(branchExperiments).where(eq(branchExperiments.id, id)).then((rows) => rows[0] ?? null);
        if (!experiment) return null;
        if (experiment.approvalId && !opts?.allowWithoutApproval) {
          const approval = await tx.select().from(approvals).where(eq(approvals.id, experiment.approvalId)).then((rows) => rows[0] ?? null);
          if (!approval || approval.status !== "approved") {
            throw new Error("Branch experiment promotion approval has not been approved yet");
          }
        }
        const now = new Date();
        const updated = await tx.update(branchExperiments).set({ status: "promoted", updatedAt: now }).where(eq(branchExperiments.id, id)).returning().then((rows) => rows[0] ?? null);
        return updated ? mapBranchExperiment(updated) : null;
      });
    },

    async syncFromHeartbeatRun(runId: string) {
      const run = await db.select({
        id: heartbeatRuns.id,
        status: heartbeatRuns.status,
        startedAt: heartbeatRuns.startedAt,
        finishedAt: heartbeatRuns.finishedAt,
        contextSnapshot: heartbeatRuns.contextSnapshot,
        resultJson: heartbeatRuns.resultJson,
        usageJson: heartbeatRuns.usageJson,
      }).from(heartbeatRuns).where(eq(heartbeatRuns.id, runId)).then((rows) => rows[0] ?? null);
      if (!run) return null;
      const context = parseObject(run.contextSnapshot);
      const assignmentId = asString(context.variantAssignmentId);
      const evaluationRunId = asString(context.evaluationRunId);
      const score = scoreFromHistoricalHeartbeat(run);
      const now = new Date();

      if (evaluationRunId) {
        await db.update(evaluationRuns).set({
          status: run.status === "running" ? "running" : run.status === "succeeded" ? "succeeded" : ["failed", "cancelled"].includes(run.status) ? "failed" : "queued",
          score: run.status === "succeeded" ? score : null,
          scoreLabel: run.status === "succeeded" ? "live_telemetry" : null,
          summary: run.status === "succeeded" ? "Evaluation run completed from live heartbeat." : null,
          metrics: { runStatus: run.status, usage: run.usageJson ?? {}, result: run.resultJson ?? {} },
          outputSnapshot: { runId: run.id, resultJson: run.resultJson ?? {}, usageJson: run.usageJson ?? {} },
          startedAt: run.startedAt ?? undefined,
          completedAt: run.finishedAt ?? undefined,
          updatedAt: now,
        }).where(eq(evaluationRuns.id, evaluationRunId));
      }

      if (assignmentId) {
        const nextStatus: VariantAssignmentStatus =
          run.status === "running"
            ? "running"
            : run.status === "succeeded"
              ? "succeeded"
              : ["failed", "cancelled", "timed_out"].includes(run.status)
                ? "failed"
                : "assigned";
        const updated = await db.update(variantAssignments).set({
          heartbeatRunId: run.id,
          status: nextStatus,
          score: run.status === "succeeded" ? score : null,
          summary: run.status === "succeeded" ? "Live population assignment completed successfully." : null,
          metadata: { runStatus: run.status },
          updatedAt: now,
        }).where(eq(variantAssignments.id, assignmentId)).returning().then((rows) => rows[0] ?? null);
        return updated ? mapAssignment(updated) : null;
      }

      return null;
    },
  };
}
