import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { soloService } from "../services/solos.js";

export function soloRoutes(db: Db) {
    const router = Router();
    const svc = soloService(db);

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
    router.get("/companies/:companyId/solo-instances", async (req, res) => {
        try {
            const instances = await svc.listInstances(req.params.companyId!);
            res.json({ instances });
        } catch {
            // Table may not exist yet (migration not applied) — return empty list
            res.json({ instances: [] });
        }
    });

    /** Activate a solo. */
    router.post("/solos/:soloId/activate", async (req, res, next) => {
        try {
            const { companyId, config, agentName } = req.body as {
                companyId: string;
                config?: Record<string, string>;
                agentName?: string;
            };
            if (!companyId) {
                res.status(400).json({ error: "companyId is required" });
                return;
            }
            const def = svc.getDefinition(req.params.soloId!);
            if (!def) {
                res.status(404).json({ error: `Solo "${req.params.soloId}" not found` });
                return;
            }
            const name = agentName || def.name;
            const instance = await svc.activate(companyId, req.params.soloId!, config ?? {}, name);
            res.status(201).json(instance);
        } catch (err) {
            next(err);
        }
    });

    /** Pause a solo instance. */
    router.post("/solo-instances/:instanceId/pause", async (req, res, next) => {
        try {
            await svc.pause(req.params.instanceId!);
            res.json({ ok: true });
        } catch (err) {
            next(err);
        }
    });

    /** Resume a solo instance. */
    router.post("/solo-instances/:instanceId/resume", async (req, res, next) => {
        try {
            await svc.resume(req.params.instanceId!);
            res.json({ ok: true });
        } catch (err) {
            next(err);
        }
    });

    /** Deactivate (soft-delete) a solo instance. */
    router.delete("/solo-instances/:instanceId", async (req, res, next) => {
        try {
            await svc.deactivate(req.params.instanceId!);
            res.json({ ok: true });
        } catch (err) {
            next(err);
        }
    });

    return router;
}
