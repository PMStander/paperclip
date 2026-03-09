import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { issues, companies, issueSchedules } from "@paperclipai/db";
import { eq, sql } from "drizzle-orm";
import {
    createIssueScheduleSchema,
    updateIssueScheduleSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import {
    issueService,
    issueScheduleService,
    heartbeatService,
    logActivity,
} from "../services/index.js";
import { logger } from "../middleware/logger.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function issueScheduleRoutes(db: Db) {
    const router = Router();
    const svc = issueScheduleService(db);
    const issueSvc = issueService(db);
    const heartbeat = heartbeatService(db);

    // List all schedules for a company
    router.get("/companies/:companyId/issue-schedules", async (req, res) => {
        const companyId = req.params.companyId as string;
        assertCompanyAccess(req, companyId);
        const result = await svc.list(companyId);
        // Enrich with template issue info
        const enriched = await Promise.all(
            result.map(async (schedule) => {
                const issue = await issueSvc.getById(schedule.templateIssueId);
                return {
                    ...schedule,
                    templateIssue: issue
                        ? {
                            id: issue.id,
                            title: issue.title,
                            description: issue.description,
                            assigneeAgentId: issue.assigneeAgentId,
                            assigneeUserId: issue.assigneeUserId,
                            projectId: issue.projectId,
                            priority: issue.priority,
                        }
                        : null,
                };
            }),
        );
        res.json(enriched);
    });

    // Get a single schedule
    router.get("/issue-schedules/:id", async (req, res) => {
        const id = req.params.id as string;
        const schedule = await svc.getById(id);
        if (!schedule) {
            res.status(404).json({ error: "Schedule not found" });
            return;
        }
        assertCompanyAccess(req, schedule.companyId);
        const issue = await issueSvc.getById(schedule.templateIssueId);
        res.json({
            ...schedule,
            templateIssue: issue
                ? {
                    id: issue.id,
                    title: issue.title,
                    description: issue.description,
                    assigneeAgentId: issue.assigneeAgentId,
                    assigneeUserId: issue.assigneeUserId,
                    projectId: issue.projectId,
                    priority: issue.priority,
                }
                : null,
        });
    });

    // Create a schedule
    router.post(
        "/companies/:companyId/issue-schedules",
        validate(createIssueScheduleSchema),
        async (req, res) => {
            const companyId = req.params.companyId as string;
            assertCompanyAccess(req, companyId);

            // Verify template issue exists and belongs to this company
            const templateIssue = await issueSvc.getById(req.body.templateIssueId);
            if (!templateIssue || templateIssue.companyId !== companyId) {
                res.status(404).json({ error: "Template issue not found" });
                return;
            }

            const actor = getActorInfo(req);
            const schedule = await svc.create(companyId, {
                ...req.body,
                createdByUserId: actor.actorType === "user" ? actor.actorId : null,
            });

            await logActivity(db, {
                companyId,
                actorType: actor.actorType,
                actorId: actor.actorId,
                agentId: actor.agentId,
                runId: actor.runId,
                action: "issue_schedule.created",
                entityType: "issue_schedule",
                entityId: schedule.id,
                details: {
                    templateIssueId: schedule.templateIssueId,
                    scheduleType: schedule.scheduleType,
                    frequency: schedule.frequency,
                },
            });

            res.status(201).json(schedule);
        },
    );

    // Update a schedule
    router.patch(
        "/issue-schedules/:id",
        validate(updateIssueScheduleSchema),
        async (req, res) => {
            const id = req.params.id as string;
            const existing = await svc.getById(id);
            if (!existing) {
                res.status(404).json({ error: "Schedule not found" });
                return;
            }
            assertCompanyAccess(req, existing.companyId);

            const schedule = await svc.update(id, req.body);
            if (!schedule) {
                res.status(404).json({ error: "Schedule not found" });
                return;
            }

            const actor = getActorInfo(req);
            await logActivity(db, {
                companyId: schedule.companyId,
                actorType: actor.actorType,
                actorId: actor.actorId,
                agentId: actor.agentId,
                runId: actor.runId,
                action: "issue_schedule.updated",
                entityType: "issue_schedule",
                entityId: schedule.id,
            });

            res.json(schedule);
        },
    );

    // Delete a schedule
    router.delete("/issue-schedules/:id", async (req, res) => {
        const id = req.params.id as string;
        const existing = await svc.getById(id);
        if (!existing) {
            res.status(404).json({ error: "Schedule not found" });
            return;
        }
        assertCompanyAccess(req, existing.companyId);

        const deleted = await svc.remove(id);
        const actor = getActorInfo(req);
        await logActivity(db, {
            companyId: existing.companyId,
            actorType: actor.actorType,
            actorId: actor.actorId,
            agentId: actor.agentId,
            runId: actor.runId,
            action: "issue_schedule.deleted",
            entityType: "issue_schedule",
            entityId: existing.id,
        });
        res.json(deleted);
    });

    // Pause a schedule
    router.post("/issue-schedules/:id/pause", async (req, res) => {
        const id = req.params.id as string;
        const existing = await svc.getById(id);
        if (!existing) {
            res.status(404).json({ error: "Schedule not found" });
            return;
        }
        assertCompanyAccess(req, existing.companyId);

        const schedule = await svc.pause(id);
        const actor = getActorInfo(req);
        await logActivity(db, {
            companyId: existing.companyId,
            actorType: actor.actorType,
            actorId: actor.actorId,
            agentId: actor.agentId,
            runId: actor.runId,
            action: "issue_schedule.paused",
            entityType: "issue_schedule",
            entityId: existing.id,
        });
        res.json(schedule);
    });

    // Resume a schedule
    router.post("/issue-schedules/:id/resume", async (req, res) => {
        const id = req.params.id as string;
        const existing = await svc.getById(id);
        if (!existing) {
            res.status(404).json({ error: "Schedule not found" });
            return;
        }
        assertCompanyAccess(req, existing.companyId);

        const schedule = await svc.resume(id);
        const actor = getActorInfo(req);
        await logActivity(db, {
            companyId: existing.companyId,
            actorType: actor.actorType,
            actorId: actor.actorId,
            agentId: actor.agentId,
            runId: actor.runId,
            action: "issue_schedule.resumed",
            entityType: "issue_schedule",
            entityId: existing.id,
        });
        res.json(schedule);
    });

    return router;
}
