import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { heartbeatRuns, soloExperiments, soloInstances } from "@paperclipai/db";
import type {
  SoloExperiment,
  SoloExperimentDecision,
  SoloExperimentStatus,
  SoloExperimentTrigger,
  UpdateSoloExperiment,
} from "@paperclipai/shared";
import { parseObject } from "../adapters/utils.js";

type SoloExperimentRow = typeof soloExperiments.$inferSelect;

const TERMINAL_SOLO_EXPERIMENT_STATUSES = new Set<SoloExperimentStatus>([
  "succeeded",
  "failed",
  "cancelled",
  "timed_out",
  "skipped",
]);

function rowToSoloExperiment(row: SoloExperimentRow): SoloExperiment {
  return {
    id: row.id,
    companyId: row.companyId,
    soloInstanceId: row.soloInstanceId,
    basedOnExperimentId: row.basedOnExperimentId ?? null,
    issueId: row.issueId ?? null,
    heartbeatRunId: row.heartbeatRunId ?? null,
    sequence: row.sequence,
    trigger: row.trigger as SoloExperimentTrigger,
    status: row.status as SoloExperimentStatus,
    decision: row.decision as SoloExperimentDecision,
    variantLabel: row.variantLabel ?? null,
    hypothesis: row.hypothesis ?? null,
    summary: row.summary ?? null,
    decisionReason: row.decisionReason ?? null,
    score: row.score ?? null,
    scoreLabel: row.scoreLabel ?? null,
    metrics: (row.metrics ?? {}) as Record<string, unknown>,
    inputSnapshot: (row.inputSnapshot ?? {}) as Record<string, unknown>,
    isBest: Boolean(row.isBest),
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function isTerminalSoloExperimentStatus(status: SoloExperimentStatus) {
  return TERMINAL_SOLO_EXPERIMENT_STATUSES.has(status);
}

export function shouldAutoPromoteSoloExperiment(input: {
  promoteToBest?: boolean;
  existingBestExperimentId: string | null;
  status: SoloExperimentStatus;
  decision: SoloExperimentDecision;
}) {
  if (input.promoteToBest) return input.status === "succeeded";
  if (input.existingBestExperimentId) return false;
  return input.status === "succeeded" && input.decision === "baseline";
}

function normalizeExperimentDecisionOnPromote(input: {
  currentDecision: SoloExperimentDecision;
  existingBestExperimentId: string | null;
}) {
  if (input.currentDecision === "pending" || input.currentDecision === "discard") {
    return input.existingBestExperimentId ? "keep" : "baseline";
  }
  return input.currentDecision;
}

function mapHeartbeatStatusToSoloExperimentStatus(status: string): SoloExperimentStatus | null {
  switch (status) {
    case "queued":
    case "running":
    case "succeeded":
    case "failed":
    case "cancelled":
    case "timed_out":
      return status;
    default:
      return null;
  }
}

export function soloExperimentService(db: Db) {
  async function getById(id: string): Promise<SoloExperiment | null> {
    const row = await db
      .select()
      .from(soloExperiments)
      .where(eq(soloExperiments.id, id))
      .then((rows) => rows[0] ?? null);

    return row ? rowToSoloExperiment(row) : null;
  }

  async function promoteToBest(experimentId: string) {
    return db.transaction(async (tx) => {
      const experiment = await tx
        .select()
        .from(soloExperiments)
        .where(eq(soloExperiments.id, experimentId))
        .then((rows) => rows[0] ?? null);

      if (!experiment) return null;
      if (experiment.status !== "succeeded") {
        throw new Error("Only succeeded experiments can be promoted to best");
      }

      const instance = await tx
        .select({
          id: soloInstances.id,
          bestExperimentId: soloInstances.bestExperimentId,
        })
        .from(soloInstances)
        .where(eq(soloInstances.id, experiment.soloInstanceId))
        .then((rows) => rows[0] ?? null);

      if (!instance) {
        throw new Error(`Solo instance \"${experiment.soloInstanceId}\" not found`);
      }

      const now = new Date();
      const nextDecision = normalizeExperimentDecisionOnPromote({
        currentDecision: experiment.decision as SoloExperimentDecision,
        existingBestExperimentId: instance.bestExperimentId ?? null,
      });

      await tx
        .update(soloExperiments)
        .set({ isBest: false, updatedAt: now })
        .where(eq(soloExperiments.soloInstanceId, experiment.soloInstanceId));

      const promoted = await tx
        .update(soloExperiments)
        .set({
          isBest: true,
          decision: nextDecision,
          updatedAt: now,
        })
        .where(eq(soloExperiments.id, experiment.id))
        .returning()
        .then((rows) => rows[0] ?? null);

      if (!promoted) return null;

      await tx
        .update(soloInstances)
        .set({
          bestExperimentId: promoted.id,
          bestScore: promoted.score ?? null,
          bestScoreLabel: promoted.scoreLabel ?? null,
          bestSummary: promoted.summary ?? null,
          updatedAt: now,
        })
        .where(eq(soloInstances.id, promoted.soloInstanceId));

      return rowToSoloExperiment(promoted);
    });
  }

  return {
    getById,

    listForInstance: async (
      companyId: string,
      soloInstanceId: string,
      opts?: { limit?: number },
    ): Promise<SoloExperiment[]> => {
      const query = db
        .select()
        .from(soloExperiments)
        .where(
          and(
            eq(soloExperiments.companyId, companyId),
            eq(soloExperiments.soloInstanceId, soloInstanceId),
          ),
        )
        .orderBy(desc(soloExperiments.sequence), desc(soloExperiments.createdAt));

      const rows = opts?.limit ? await query.limit(opts.limit) : await query;
      return rows.map(rowToSoloExperiment);
    },

    createQueued: async (input: {
      companyId: string;
      soloInstanceId: string;
      trigger: SoloExperimentTrigger;
      variantLabel?: string | null;
      hypothesis?: string | null;
      inputSnapshot?: Record<string, unknown>;
    }): Promise<SoloExperiment> => {
      return db.transaction(async (tx) => {
        const instance = await tx
          .select({
            id: soloInstances.id,
            companyId: soloInstances.companyId,
            experimentCount: soloInstances.experimentCount,
            bestExperimentId: soloInstances.bestExperimentId,
          })
          .from(soloInstances)
          .where(eq(soloInstances.id, input.soloInstanceId))
          .then((rows) => rows[0] ?? null);

        if (!instance || instance.companyId !== input.companyId) {
          throw new Error(`Solo instance \"${input.soloInstanceId}\" not found`);
        }

        const [{ maxSequence }] = await tx
          .select({ maxSequence: sql<number>`coalesce(max(${soloExperiments.sequence}), 0)` })
          .from(soloExperiments)
          .where(eq(soloExperiments.soloInstanceId, input.soloInstanceId));

        const now = new Date();
        const [created] = await tx
          .insert(soloExperiments)
          .values({
            companyId: input.companyId,
            soloInstanceId: input.soloInstanceId,
            basedOnExperimentId: instance.bestExperimentId ?? null,
            sequence: Number(maxSequence ?? 0) + 1,
            trigger: input.trigger,
            status: "queued",
            decision: "pending",
            variantLabel: input.variantLabel ?? null,
            hypothesis: input.hypothesis ?? null,
            inputSnapshot: input.inputSnapshot ?? {},
            metrics: {},
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        await tx
          .update(soloInstances)
          .set({
            experimentCount: (instance.experimentCount ?? 0) + 1,
            updatedAt: now,
          })
          .where(eq(soloInstances.id, input.soloInstanceId));

        return rowToSoloExperiment(created);
      });
    },

    attachIssueAndHeartbeat: async (input: {
      experimentId: string;
      issueId?: string | null;
      heartbeatRunId?: string | null;
      status?: SoloExperimentStatus;
    }) => {
      const now = new Date();
      const patch: Partial<typeof soloExperiments.$inferInsert> = {
        updatedAt: now,
      };

      if (input.issueId !== undefined) patch.issueId = input.issueId;
      if (input.heartbeatRunId !== undefined) patch.heartbeatRunId = input.heartbeatRunId;
      if (input.status !== undefined) patch.status = input.status;
      if (input.status === "running") patch.startedAt = now;
      if (input.status && isTerminalSoloExperimentStatus(input.status)) {
        patch.completedAt = now;
      }

      const row = await db
        .update(soloExperiments)
        .set(patch)
        .where(eq(soloExperiments.id, input.experimentId))
        .returning()
        .then((rows) => rows[0] ?? null);

      return row ? rowToSoloExperiment(row) : null;
    },

    markSkipped: async (experimentId: string, summary?: string | null) => {
      const now = new Date();
      const row = await db
        .update(soloExperiments)
        .set({
          status: "skipped",
          summary: summary ?? null,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(soloExperiments.id, experimentId))
        .returning()
        .then((rows) => rows[0] ?? null);

      return row ? rowToSoloExperiment(row) : null;
    },

    update: async (experimentId: string, patch: UpdateSoloExperiment) => {
      const existing = await db
        .select({
          id: soloExperiments.id,
          soloInstanceId: soloExperiments.soloInstanceId,
          isBest: soloExperiments.isBest,
          status: soloExperiments.status,
          decision: soloExperiments.decision,
        })
        .from(soloExperiments)
        .where(eq(soloExperiments.id, experimentId))
        .then((rows) => rows[0] ?? null);

      if (!existing) return null;

      return db.transaction(async (tx) => {
        const now = new Date();
        const nextStatus = patch.status ?? (existing.status as SoloExperimentStatus);
        const nextDecision = patch.decision ?? (existing.decision as SoloExperimentDecision);
        const updateValues: Partial<typeof soloExperiments.$inferInsert> = {
          updatedAt: now,
        };

        if (patch.trigger !== undefined) updateValues.trigger = patch.trigger;
        if (patch.status !== undefined) updateValues.status = patch.status;
        if (patch.decision !== undefined) updateValues.decision = patch.decision;
        if (patch.variantLabel !== undefined) updateValues.variantLabel = patch.variantLabel ?? null;
        if (patch.hypothesis !== undefined) updateValues.hypothesis = patch.hypothesis ?? null;
        if (patch.summary !== undefined) updateValues.summary = patch.summary ?? null;
        if (patch.decisionReason !== undefined) updateValues.decisionReason = patch.decisionReason ?? null;
        if (patch.score !== undefined) updateValues.score = patch.score ?? null;
        if (patch.scoreLabel !== undefined) updateValues.scoreLabel = patch.scoreLabel ?? null;
        if (patch.metrics !== undefined) updateValues.metrics = patch.metrics;
        if (patch.inputSnapshot !== undefined) updateValues.inputSnapshot = patch.inputSnapshot;
        if (nextStatus === "running") {
          updateValues.startedAt = now;
        }
        if (isTerminalSoloExperimentStatus(nextStatus)) {
          updateValues.completedAt = now;
        }

        const updated = await tx
          .update(soloExperiments)
          .set(updateValues)
          .where(eq(soloExperiments.id, experimentId))
          .returning()
          .then((rows) => rows[0] ?? null);

        if (!updated) return null;

        const currentBest = await tx
          .select({ bestExperimentId: soloInstances.bestExperimentId })
          .from(soloInstances)
          .where(eq(soloInstances.id, updated.soloInstanceId))
          .then((rows) => rows[0] ?? null);

        const shouldPromote = shouldAutoPromoteSoloExperiment({
          promoteToBest: patch.promoteToBest,
          existingBestExperimentId: currentBest?.bestExperimentId ?? null,
          status: nextStatus,
          decision: nextDecision,
        });

        if (!shouldPromote) {
          if (updated.isBest) {
            const shouldRemainBest = nextStatus === "succeeded" && nextDecision !== "discard";
            if (shouldRemainBest) {
              await tx
                .update(soloInstances)
                .set({
                  bestExperimentId: updated.id,
                  bestScore: updated.score ?? null,
                  bestScoreLabel: updated.scoreLabel ?? null,
                  bestSummary: updated.summary ?? null,
                  updatedAt: now,
                })
                .where(eq(soloInstances.id, updated.soloInstanceId));
              return rowToSoloExperiment(updated);
            }

            const cleared = await tx
              .update(soloExperiments)
              .set({ isBest: false, updatedAt: now })
              .where(eq(soloExperiments.id, updated.id))
              .returning()
              .then((rows) => rows[0] ?? null);

            await tx
              .update(soloInstances)
              .set({
                bestExperimentId: null,
                bestScore: null,
                bestScoreLabel: null,
                bestSummary: null,
                updatedAt: now,
              })
              .where(eq(soloInstances.id, updated.soloInstanceId));

            return cleared ? rowToSoloExperiment(cleared) : null;
          }

          return rowToSoloExperiment(updated);
        }

        await tx
          .update(soloExperiments)
          .set({ isBest: false, updatedAt: now })
          .where(eq(soloExperiments.soloInstanceId, updated.soloInstanceId));

        const promotedDecision = normalizeExperimentDecisionOnPromote({
          currentDecision: nextDecision,
          existingBestExperimentId: currentBest?.bestExperimentId ?? null,
        });

        const promoted = await tx
          .update(soloExperiments)
          .set({
            isBest: true,
            decision: promotedDecision,
            updatedAt: now,
          })
          .where(eq(soloExperiments.id, updated.id))
          .returning()
          .then((rows) => rows[0] ?? null);

        if (!promoted) return null;

        await tx
          .update(soloInstances)
          .set({
            bestExperimentId: promoted.id,
            bestScore: promoted.score ?? null,
            bestScoreLabel: promoted.scoreLabel ?? null,
            bestSummary: promoted.summary ?? null,
            updatedAt: now,
          })
          .where(eq(soloInstances.id, promoted.soloInstanceId));

        return rowToSoloExperiment(promoted);
      });
    },

    promoteToBest,

    syncFromHeartbeatRun: async (runId: string) => {
      const run = await db
        .select({
          id: heartbeatRuns.id,
          status: heartbeatRuns.status,
          startedAt: heartbeatRuns.startedAt,
          finishedAt: heartbeatRuns.finishedAt,
          contextSnapshot: heartbeatRuns.contextSnapshot,
        })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, runId))
        .then((rows) => rows[0] ?? null);

      if (!run) return null;

      const context = parseObject(run.contextSnapshot);
      const experimentId = typeof context.soloExperimentId === "string" && context.soloExperimentId.trim().length > 0
        ? context.soloExperimentId.trim()
        : null;
      if (!experimentId) return null;

      const nextStatus = mapHeartbeatStatusToSoloExperimentStatus(run.status);
      if (!nextStatus) return null;

      const now = new Date();
      const patch: Partial<typeof soloExperiments.$inferInsert> = {
        heartbeatRunId: run.id,
        updatedAt: now,
      };

      if (typeof context.issueId === "string" && context.issueId.trim().length > 0) {
        patch.issueId = context.issueId.trim();
      }

      patch.status = nextStatus;
      if (nextStatus === "running") {
        patch.startedAt = run.startedAt ?? now;
      }
      if (isTerminalSoloExperimentStatus(nextStatus)) {
        patch.completedAt = run.finishedAt ?? now;
      }

      const row = await db
        .update(soloExperiments)
        .set(patch)
        .where(eq(soloExperiments.id, experimentId))
        .returning()
        .then((rows) => rows[0] ?? null);

      return row ? rowToSoloExperiment(row) : null;
    },
  };
}
