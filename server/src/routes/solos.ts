import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { updateSoloExperimentSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { soloService } from "../services/solos.js";
import { soloExperimentService } from "../services/solo-experiments.js";
import { soloRunnerService } from "../services/solo-runner.js";
import { logActivity } from "../services/activity-log.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

function isMissingSoloInstancesTableError(err: unknown) {
    return err instanceof Error &&
        /solo_instances/i.test(err.message) &&
        /(does not exist|no such table|relation)/i.test(err.message);
}

export function soloRoutes(db: Db) {
    const router = Router();
    const svc = soloService(db);
    const experimentSvc = soloExperimentService(db);
    const runner = soloRunnerService(db);

    // ── Solo definitions (marketplace) ────────────────────────────────────

    /** List all available solo definitions. */
    router.get("/solos", (_req, res) => {
        const definitions = svc.listDefinitions();
        res.json({ solos: definitions });
    });

    /** Get a single solo definition by id. */
    router.get("/solos/:soloId", (req, res) => {
        const def = svc.getDefinition(req.params.soloId!);
        if (!def) {
            res.status(404).json({ error: `Solo "${req.params.soloId}" not found` });
            return;
        }
        res.json(def);
    });

    // ── Solo instances (activated solos) ──────────────────────────────────

    /** List active solo instances for a company. */
    router.get("/companies/:companyId/solo-instances", async (req, res, next) => {
        const companyId = req.params.companyId!;
        assertCompanyAccess(req, companyId);

        try {
            const instances = await svc.listInstances(companyId);
            res.json({ instances });
        } catch (err) {
            // Table may not exist yet (migration not applied) — return empty list
            if (isMissingSoloInstancesTableError(err)) {
                res.json({ instances: [] });
                return;
            }
            next(err);
        }
    });

    /** Activate a solo. */
    router.post("/solos/:soloId/activate", async (req, res, next) => {
        const { companyId, config, agentName, agentId, runSchedule } = req.body as {
            companyId: string;
            config?: Record<string, string>;
            agentName?: string;
            agentId?: string;
            runSchedule?: string;
        };

        if (!companyId) {
            res.status(400).json({ error: "companyId is required" });
            return;
        }

        assertCompanyAccess(req, companyId);

        try {
            const def = svc.getDefinition(req.params.soloId!);
            if (!def) {
                res.status(404).json({ error: `Solo "${req.params.soloId}" not found` });
                return;
            }
            const name = agentName || def.name;
            const schedule = (runSchedule ?? "manual") as "once" | "hourly" | "daily" | "weekly" | "manual";
            const instance = await svc.activate(companyId, req.params.soloId!, config ?? {}, name, agentId, schedule);

            const actor = getActorInfo(req);
            await logActivity(db, {
                companyId,
                actorType: actor.actorType,
                actorId: actor.actorId,
                agentId: actor.agentId,
                runId: actor.runId,
                action: "solo.activated",
                entityType: "solo_instance",
                entityId: instance.id,
                details: {
                    soloId: instance.soloId,
                    agentId: instance.agentId,
                    runSchedule: instance.runSchedule,
                },
            });

            res.status(201).json(instance);
        } catch (err) {
            if (isMissingSoloInstancesTableError(err)) {
                res.status(503).json({ error: "Solo storage is unavailable until the solo_instances migration is applied" });
                return;
            }
            next(err);
        }
    });

    /** Pause a solo instance. */
    router.post("/solo-instances/:instanceId/pause", async (req, res, next) => {
        try {
            const existing = await svc.getInstance(req.params.instanceId!);
            if (!existing) {
                res.status(404).json({ error: "Solo instance not found" });
                return;
            }

            assertCompanyAccess(req, existing.companyId);
            await svc.pause(req.params.instanceId!);

            const actor = getActorInfo(req);
            await logActivity(db, {
                companyId: existing.companyId,
                actorType: actor.actorType,
                actorId: actor.actorId,
                agentId: actor.agentId,
                runId: actor.runId,
                action: "solo.paused",
                entityType: "solo_instance",
                entityId: existing.id,
                details: {
                    soloId: existing.soloId,
                    agentId: existing.agentId,
                },
            });

            res.json({ ok: true });
        } catch (err) {
            next(err);
        }
    });

    /** Resume a solo instance. */
    router.post("/solo-instances/:instanceId/resume", async (req, res, next) => {
        try {
            const existing = await svc.getInstance(req.params.instanceId!);
            if (!existing) {
                res.status(404).json({ error: "Solo instance not found" });
                return;
            }

            assertCompanyAccess(req, existing.companyId);
            await svc.resume(req.params.instanceId!);

            const actor = getActorInfo(req);
            await logActivity(db, {
                companyId: existing.companyId,
                actorType: actor.actorType,
                actorId: actor.actorId,
                agentId: actor.agentId,
                runId: actor.runId,
                action: "solo.resumed",
                entityType: "solo_instance",
                entityId: existing.id,
                details: {
                    soloId: existing.soloId,
                    agentId: existing.agentId,
                },
            });

            res.json({ ok: true });
        } catch (err) {
            next(err);
        }
    });

    /** Deactivate (soft-delete) a solo instance. */
    router.delete("/solo-instances/:instanceId", async (req, res, next) => {
        try {
            const existing = await svc.getInstance(req.params.instanceId!);
            if (!existing) {
                res.status(404).json({ error: "Solo instance not found" });
                return;
            }

            assertCompanyAccess(req, existing.companyId);
            await svc.deactivate(req.params.instanceId!);

            const actor = getActorInfo(req);
            await logActivity(db, {
                companyId: existing.companyId,
                actorType: actor.actorType,
                actorId: actor.actorId,
                agentId: actor.agentId,
                runId: actor.runId,
                action: "solo.deactivated",
                entityType: "solo_instance",
                entityId: existing.id,
                details: {
                    soloId: existing.soloId,
                    agentId: existing.agentId,
                },
            });

            res.json({ ok: true });
        } catch (err) {
            next(err);
        }
    });

    /** Trigger an immediate run of a solo instance. */
    router.post("/solo-instances/:instanceId/run-now", async (req, res, next) => {
        try {
            const existing = await svc.getInstance(req.params.instanceId!);
            if (!existing) {
                res.status(404).json({ error: "Solo instance not found" });
                return;
            }

            assertCompanyAccess(req, existing.companyId);
            const actor = getActorInfo(req);

            const result = await runner.triggerInstance(req.params.instanceId!, {
                trigger: "manual",
                requestedBy: {
                    actorType: actor.actorType,
                    actorId: actor.actorId,
                    agentId: actor.agentId,
                    runId: actor.runId,
                },
            });

            await logActivity(db, {
                companyId: existing.companyId,
                actorType: actor.actorType,
                actorId: actor.actorId,
                agentId: actor.agentId,
                runId: actor.runId,
                action: "solo.run_triggered",
                entityType: "solo_instance",
                entityId: existing.id,
                details: {
                    soloId: existing.soloId,
                    experimentId: result.experimentId,
                    issueId: result.issueId,
                    issueIdentifier: result.issueIdentifier,
                    heartbeatRunId: result.runId ?? null,
                    status: result.status,
                },
            });

            res.status(202).json(result);
        } catch (err) {
            next(err);
        }
    });

    /** List experiments for a solo instance. */
    router.get("/companies/:companyId/solo-instances/:instanceId/experiments", async (req, res, next) => {
        try {
            const companyId = req.params.companyId!;
            const instanceId = req.params.instanceId!;
            assertCompanyAccess(req, companyId);

            const instance = await svc.getInstance(instanceId);
            if (!instance || instance.companyId !== companyId) {
                res.status(404).json({ error: "Solo instance not found" });
                return;
            }

            const experiments = await experimentSvc.listForInstance(companyId, instanceId);
            res.json({ experiments });
        } catch (err) {
            next(err);
        }
    });

    /** Get a single experiment ledger entry. */
    router.get("/solo-experiments/:experimentId", async (req, res, next) => {
        try {
            const experimentId = req.params.experimentId as string;
            const experiment = await experimentSvc.getById(experimentId);
            if (!experiment) {
                res.status(404).json({ error: "Solo experiment not found" });
                return;
            }

            assertCompanyAccess(req, experiment.companyId);
            res.json(experiment);
        } catch (err) {
            next(err);
        }
    });

    /** Update structured experiment ledger fields and optionally promote a best variant. */
    router.patch("/solo-experiments/:experimentId", validate(updateSoloExperimentSchema), async (req, res, next) => {
        try {
            const experimentId = req.params.experimentId as string;
            const existing = await experimentSvc.getById(experimentId);
            if (!existing) {
                res.status(404).json({ error: "Solo experiment not found" });
                return;
            }

            assertCompanyAccess(req, existing.companyId);
            const updated = await experimentSvc.update(existing.id, req.body);
            if (!updated) {
                res.status(404).json({ error: "Solo experiment not found" });
                return;
            }

            const actor = getActorInfo(req);
            await logActivity(db, {
                companyId: updated.companyId,
                actorType: actor.actorType,
                actorId: actor.actorId,
                agentId: actor.agentId,
                runId: actor.runId,
                action: req.body.promoteToBest ? "solo_experiment.promoted" : "solo_experiment.updated",
                entityType: "solo_experiment",
                entityId: updated.id,
                details: {
                    soloInstanceId: updated.soloInstanceId,
                    issueId: updated.issueId,
                    sequence: updated.sequence,
                    status: updated.status,
                    decision: updated.decision,
                    promoteToBest: Boolean(req.body.promoteToBest),
                },
            });

            res.json(updated);
        } catch (err) {
            next(err);
        }
    });

    return router;
}
