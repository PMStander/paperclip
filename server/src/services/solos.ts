import { eq, and, asc, lte } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { soloInstances } from "@paperclipai/db";
import { randomUUID } from "node:crypto";
import {
    listSoloDefinitions,
    getSoloDefinition,
} from "../solos/solo-definitions.js";
import type { SoloDefinition, SoloInstance, RunSchedule } from "../solos/solo-types.js";

export function soloService(db: Db) {
    return {
        /** Return all bundled solo definitions. */
        listDefinitions(): SoloDefinition[] {
            return listSoloDefinitions();
        },

        /** Return a single solo definition by id. */
        getDefinition(soloId: string): SoloDefinition | undefined {
            return getSoloDefinition(soloId);
        },

        /** Return a single solo instance by id. */
        async getInstance(instanceId: string): Promise<SoloInstance | null> {
            const rows = await db
                .select()
                .from(soloInstances)
                .where(eq(soloInstances.id, instanceId));

            return rows[0] ? rowToInstance(rows[0]) : null;
        },

        /** List all active (non-inactive) solo instances for a company. */
        async listInstances(companyId: string): Promise<SoloInstance[]> {
            const rows = await db
                .select()
                .from(soloInstances)
                .where(eq(soloInstances.companyId, companyId))
                .orderBy(soloInstances.createdAt);

            return rows
                .filter((r) => r.status !== "inactive")
                .map(rowToInstance);
        },

        /** List all due active solo instances whose next run time has arrived. */
        async listDueInstances(now: Date): Promise<SoloInstance[]> {
            const rows = await db
                .select()
                .from(soloInstances)
                .where(
                    and(
                        eq(soloInstances.status, "active"),
                        lte(soloInstances.nextRunAt, now),
                    ),
                )
                .orderBy(asc(soloInstances.nextRunAt), asc(soloInstances.createdAt));

            return rows.map(rowToInstance);
        },

        /** Activate a solo — create an instance record. */
        async activate(
            companyId: string,
            soloId: string,
            config: Record<string, string>,
            agentName: string,
            agentId?: string,
            runSchedule: RunSchedule = "manual",
        ): Promise<SoloInstance> {
            const def = getSoloDefinition(soloId);
            if (!def) throw new Error(`Solo "${soloId}" not found`);

            const id = randomUUID();
            const now = new Date();
            const nextRun = computeSoloInitialNextRun(runSchedule, now);

            await db.insert(soloInstances).values({
                id,
                companyId,
                soloId,
                agentName,
                status: "active",
                runSchedule,
                config,
                agentId: agentId ?? null,
                nextRunAt: nextRun,
                createdAt: now,
                updatedAt: now,
            });

            return {
                id,
                companyId,
                soloId,
                agentName,
                status: "active",
                runSchedule,
                config,
                agentId: agentId ?? null,
                experimentCount: 0,
                bestExperimentId: null,
                bestScore: null,
                bestScoreLabel: null,
                bestSummary: null,
                lastRunAt: null,
                nextRunAt: nextRun?.toISOString() ?? null,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
            };
        },

        /** Pause a running solo instance. */
        async pause(instanceId: string): Promise<void> {
            await db
                .update(soloInstances)
                .set({ status: "paused", updatedAt: new Date() })
                .where(eq(soloInstances.id, instanceId));
        },

        /** Resume a paused solo instance. */
        async resume(instanceId: string): Promise<void> {
            const rows = await db
                .select()
                .from(soloInstances)
                .where(eq(soloInstances.id, instanceId));

            const existing = rows[0];
            if (!existing) throw new Error(`Solo instance "${instanceId}" not found`);

            const now = new Date();
            const runSchedule = (existing.runSchedule ?? "manual") as RunSchedule;
            const nextRunAt = computeSoloInitialNextRun(runSchedule, now);

            await db
                .update(soloInstances)
                .set({ status: "active", nextRunAt, updatedAt: now })
                .where(eq(soloInstances.id, instanceId));
        },

        /** Mark a solo instance as errored until manually resumed. */
        async markError(instanceId: string): Promise<void> {
            await db
                .update(soloInstances)
                .set({ status: "error", updatedAt: new Date() })
                .where(eq(soloInstances.id, instanceId));
        },

        /** Deactivate (soft delete) a solo instance. */
        async deactivate(instanceId: string): Promise<void> {
            await db
                .update(soloInstances)
                .set({ status: "inactive", updatedAt: new Date() })
                .where(eq(soloInstances.id, instanceId));
        },

        /** Trigger an immediate run of a solo instance. */
        async runNow(instanceId: string): Promise<SoloInstance> {
            const rows = await db
                .select()
                .from(soloInstances)
                .where(eq(soloInstances.id, instanceId));

            const existing = rows[0];
            if (!existing) throw new Error(`Solo instance "${instanceId}" not found`);

            const now = new Date();
            const runSchedule = (existing.runSchedule ?? "manual") as RunSchedule;
            const nextRunAt = computeSoloNextRunAfterExecution(runSchedule, now);

            await db
                .update(soloInstances)
                .set({ status: "active", lastRunAt: now, nextRunAt, updatedAt: now })
                .where(eq(soloInstances.id, instanceId));

            const updatedRows = await db
                .select()
                .from(soloInstances)
                .where(eq(soloInstances.id, instanceId));

            if (!updatedRows[0]) throw new Error(`Solo instance "${instanceId}" not found`);
            return rowToInstance(updatedRows[0]);
        },
    };
}

function rowToInstance(row: typeof soloInstances.$inferSelect): SoloInstance {
    return {
        id: row.id,
        companyId: row.companyId,
        soloId: row.soloId,
        agentName: row.agentName,
        status: row.status as SoloInstance["status"],
        runSchedule: (row.runSchedule ?? "manual") as RunSchedule,
        config: (row.config ?? {}) as Record<string, string>,
        agentId: row.agentId ?? null,
        experimentCount: row.experimentCount ?? 0,
        bestExperimentId: row.bestExperimentId ?? null,
        bestScore: row.bestScore ?? null,
        bestScoreLabel: row.bestScoreLabel ?? null,
        bestSummary: row.bestSummary ?? null,
        lastRunAt: row.lastRunAt?.toISOString() ?? null,
        nextRunAt: row.nextRunAt?.toISOString() ?? null,
        createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
}

export function computeSoloInitialNextRun(schedule: RunSchedule, from: Date): Date | null {
    switch (schedule) {
        case "once":
            return from; // run immediately
        case "hourly":
            return new Date(from.getTime() + 60 * 60 * 1000);
        case "daily":
            return new Date(from.getTime() + 24 * 60 * 60 * 1000);
        case "weekly":
            return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
        case "manual":
        default:
            return null;
    }
}

export function computeSoloNextRunAfterExecution(schedule: RunSchedule, from: Date): Date | null {
    switch (schedule) {
        case "hourly":
            return new Date(from.getTime() + 60 * 60 * 1000);
        case "daily":
            return new Date(from.getTime() + 24 * 60 * 60 * 1000);
        case "weekly":
            return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
        case "once":
        case "manual":
        default:
            return null;
    }
}
