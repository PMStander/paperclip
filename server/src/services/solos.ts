import { eq, and } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { soloInstances } from "@paperclipai/db";
import { randomUUID } from "node:crypto";
import {
    listSoloDefinitions,
    getSoloDefinition,
} from "../solos/solo-definitions.js";
import type { SoloDefinition, SoloInstance } from "../solos/solo-types.js";

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

        /** List all active (non-inactive) solo instances for a company. */
        async listInstances(companyId: string): Promise<SoloInstance[]> {
            const rows = await db
                .select()
                .from(soloInstances)
                .where(
                    and(
                        eq(soloInstances.companyId, companyId),
                        // Show active, paused, and error — not inactive (deactivated)
                    ),
                )
                .orderBy(soloInstances.createdAt);

            return rows
                .filter((r) => r.status !== "inactive")
                .map(rowToInstance);
        },

        /** Activate a solo — create an instance record. */
        async activate(
            companyId: string,
            soloId: string,
            config: Record<string, string>,
            agentName: string,
        ): Promise<SoloInstance> {
            const def = getSoloDefinition(soloId);
            if (!def) throw new Error(`Solo "${soloId}" not found`);

            const id = randomUUID();
            const now = new Date();

            await db.insert(soloInstances).values({
                id,
                companyId,
                soloId,
                agentName,
                status: "active",
                config,
                createdAt: now,
                updatedAt: now,
            });

            return {
                id,
                companyId,
                soloId,
                agentName,
                status: "active",
                config,
                agentId: null,
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
            await db
                .update(soloInstances)
                .set({ status: "active", updatedAt: new Date() })
                .where(eq(soloInstances.id, instanceId));
        },

        /** Deactivate (soft delete) a solo instance. */
        async deactivate(instanceId: string): Promise<void> {
            await db
                .update(soloInstances)
                .set({ status: "inactive", updatedAt: new Date() })
                .where(eq(soloInstances.id, instanceId));
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
        config: (row.config ?? {}) as Record<string, string>,
        agentId: row.agentId ?? null,
        createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
}
