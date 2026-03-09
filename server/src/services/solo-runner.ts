import { eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents } from "@paperclipai/db";
import { parseObject } from "../adapters/utils.js";
import { logger } from "../middleware/logger.js";
import type { SoloDefinition, SoloInstance } from "../solos/solo-types.js";
import { applyVariantToIssueDraft, experimentService } from "./experiments.js";
import { heartbeatService } from "./heartbeat.js";
import { issueService } from "./issues.js";
import { soloExperimentService } from "./solo-experiments.js";
import { soloService } from "./solos.js";

const DEFAULT_PROMPT_TEMPLATE = "You are agent {{agent.id}} ({{agent.name}}). Continue your Paperclip work.";

export type SoloRunTrigger = "manual" | "schedule";

export type SoloRunRequestedBy = {
    actorType: "user" | "agent" | "system";
    actorId: string;
    agentId?: string | null;
    runId?: string | null;
};

export type SoloRunResult = {
    status: "queued" | "skipped";
    runId?: string;
    experimentId: string;
    instance: SoloInstance;
    issueId: string;
    issueIdentifier: string;
};

export function buildSoloTaskKey(instanceId: string) {
    return `solo-instance:${instanceId}`;
}

export function buildSoloPromptTemplate(input: {
    definition: SoloDefinition;
    existingPromptTemplate: string | null;
}) {
    const basePromptTemplate = input.existingPromptTemplate?.trim() || DEFAULT_PROMPT_TEMPLATE;

    return [
        input.definition.agent.system_prompt.trim(),
        "",
        "Treat repeated wakes with the same `context.taskKey` as one persistent solo thread.",
        "Use the issue description as the run brief for the current iteration, but preserve the experiment log, best-known baseline, and keep/discard history across runs.",
        "When `context.soloExperimentId` is present, record a structured outcome with `PATCH /api/solo-experiments/:id` before you finish the run.",
        "",
        basePromptTemplate,
    ].join("\n");
}

function buildIssueTitle(definition: SoloDefinition, instance: SoloInstance) {
    const summary = Object.values(instance.config)
        .filter((value) => value && value.trim().length > 0)
        .slice(0, 2)
        .join(", ");

    return `[Solo] ${definition.name}: ${summary || "Run"}`;
}

function buildIssueBody(input: {
    definition: SoloDefinition;
    instance: SoloInstance;
    experimentId: string;
    experimentSequence: number;
    taskKey: string;
    trigger: SoloRunTrigger;
}) {
    const { definition, experimentId, experimentSequence, instance, taskKey, trigger } = input;
    const configEntries = Object.entries(instance.config)
        .filter(([, value]) => value && value.trim().length > 0)
        .map(([key, value]) => {
            const setting = definition.settings.find((candidate) => candidate.key === key);
            const label = setting?.label ?? key;
            return `- **${label}**: ${value}`;
        })
        .join("\n");

    const bestSummary = instance.bestSummary?.trim() || null;
    const bestScore = instance.bestScore != null
        ? `${instance.bestScore}${instance.bestScoreLabel ? ` ${instance.bestScoreLabel}` : ""}`
        : null;

    return [
        `## Solo: ${definition.name}`,
        "",
        definition.description,
        "",
        "### Continuity & Ledger",
        `- **Solo Instance ID**: \`${instance.id}\``,
        `- **Experiment ID**: \`${experimentId}\``,
        `- **Experiment Sequence**: ${experimentSequence}`,
        `- **Research Thread Key**: \`${taskKey}\``,
        `- **Trigger**: ${trigger === "schedule" ? "Scheduled run" : "Manual run"}`,
        `- **Previous run**: ${instance.lastRunAt ? new Date(instance.lastRunAt).toISOString() : "None yet"}`,
        `- **Experiments recorded**: ${instance.experimentCount}`,
        `- **Current best**: ${bestSummary ?? "No best variant recorded yet"}${bestScore ? ` (${bestScore})` : ""}`,
        "",
        "### Solo Instructions",
        definition.agent.system_prompt,
        "",
        "### Configuration",
        configEntries || "No custom configuration.",
        "",
        "### Available Tools",
        definition.tools.map((tool) => `- \`${tool}\``).join("\n"),
        "",
        "### Structured Experiment Reporting",
        `Before you finish, call \`PATCH /api/solo-experiments/${experimentId}\` with structured outcome fields like \`status\`, \`score\`, \`metrics\`, \`decision\`, \`summary\`, and optional \`promoteToBest\`.`,
        "Use `decision: \"baseline\"` for the first successful baseline and `decision: \"keep\"` or `\"discard\"` for later variants.",
        "",
        "### Run Brief",
        "Continue the same long-lived experimentation thread for this solo instance.",
        "Preserve the current best-known baseline, experiment log, and keep/discard decisions across runs.",
        "Report meaningful progress as comments on this issue.",
    ].join("\n");
}

export function soloRunnerService(db: Db) {
    const soloSvc = soloService(db);
    const experimentSvc = soloExperimentService(db);
    const experimentPlatform = experimentService(db);
    const issueSvc = issueService(db);
    const heartbeat = heartbeatService(db);

    async function getAgentPromptTemplate(agentId: string) {
        const row = await db
            .select({ adapterConfig: agents.adapterConfig })
            .from(agents)
            .where(eq(agents.id, agentId))
            .then((rows) => rows[0] ?? null);

        if (!row) return null;

        const adapterConfig = parseObject(row.adapterConfig);
        const promptTemplate = typeof adapterConfig.promptTemplate === "string"
            ? adapterConfig.promptTemplate.trim()
            : "";

        return promptTemplate.length > 0 ? promptTemplate : null;
    }

    async function triggerInstance(
        instanceId: string,
        opts: {
            trigger?: SoloRunTrigger;
            requestedBy?: SoloRunRequestedBy;
        } = {},
    ): Promise<SoloRunResult> {
        const instance = await soloSvc.getInstance(instanceId);
        if (!instance) {
            throw new Error(`Solo instance "${instanceId}" not found`);
        }

        const definition = soloSvc.getDefinition(instance.soloId);
        if (!definition) {
            throw new Error(`Solo definition "${instance.soloId}" not found`);
        }

        if (!instance.agentId) {
            throw new Error("No agent assigned to this solo instance");
        }

        const trigger = opts.trigger ?? "manual";
        const taskKey = buildSoloTaskKey(instance.id);
        const existingPromptTemplate = await getAgentPromptTemplate(instance.agentId);
        const populationRoute = await experimentPlatform.routePopulationVariant({
            companyId: instance.companyId,
            subjectType: "solo_instance",
            subjectId: instance.id,
            assignmentType: "solo_run",
            assignmentKey: `${instance.id}:${trigger}:${Date.now()}`,
            soloInstanceId: instance.id,
            metadata: {
                trigger,
                soloId: definition.id,
            },
        });
        const variantConfig = populationRoute?.variant.config ?? {};
        const variantAdapterConfig = parseObject(variantConfig.adapterConfig);
        const promptTemplateAppend = typeof variantConfig.promptTemplateAppend === "string"
            ? variantConfig.promptTemplateAppend.trim()
            : "";
        const promptTemplate = [
            buildSoloPromptTemplate({
                definition,
                existingPromptTemplate,
            }),
            promptTemplateAppend,
        ].filter(Boolean).join("\n\n");
        const experiment = await experimentSvc.createQueued({
            companyId: instance.companyId,
            soloInstanceId: instance.id,
            trigger,
            inputSnapshot: {
                soloId: definition.id,
                soloName: definition.name,
                taskKey,
                trigger,
                config: instance.config,
                runSchedule: instance.runSchedule,
                populationCampaignId: populationRoute?.campaign.id ?? null,
                populationVariantId: populationRoute?.variant.id ?? null,
            },
        });

        let issue;
        try {
            const issueDraft = applyVariantToIssueDraft({
                title: buildIssueTitle(definition, instance),
                description: buildIssueBody({
                    definition,
                    experimentId: experiment.id,
                    experimentSequence: experiment.sequence,
                    instance: {
                        ...instance,
                        experimentCount: Math.max(instance.experimentCount, experiment.sequence),
                    },
                    taskKey,
                    trigger,
                }),
                status: "todo",
                priority: "medium",
                assigneeAgentId: instance.agentId,
                assigneeAdapterOverrides: {
                    adapterConfig: {
                        promptTemplate,
                        ...variantAdapterConfig,
                    },
                },
            }, populationRoute?.variant ?? null);

            issue = await issueSvc.create(instance.companyId, issueDraft as any);
        } catch (err) {
            await experimentSvc.update(experiment.id, {
                status: "failed",
                summary: err instanceof Error ? err.message : "Failed to create solo issue",
            }).catch(() => {});
            throw err;
        }

        const requestedBy = opts.requestedBy ?? {
            actorType: "system",
            actorId: "system",
        };

        const run = await heartbeat.wakeup(instance.agentId, {
            source: "automation",
            triggerDetail: trigger === "manual" ? "manual" : "system",
            reason: trigger === "manual" ? `solo_run:${definition.id}` : `solo_schedule:${definition.id}`,
            payload: {
                issueId: issue.id,
                soloExperimentId: experiment.id,
                soloId: definition.id,
                soloName: definition.name,
                soloInstanceId: instance.id,
                taskKey,
                soloTrigger: trigger,
                populationCampaignId: populationRoute?.campaign.id ?? null,
                populationVariantId: populationRoute?.variant.id ?? null,
                variantAssignmentId: populationRoute?.assignment.id ?? null,
            },
            contextSnapshot: {
                issueId: issue.id,
                taskId: issue.id,
                taskKey,
                soloExperimentId: experiment.id,
                soloId: definition.id,
                soloName: definition.name,
                soloInstanceId: instance.id,
                soloTrigger: trigger,
                populationCampaignId: populationRoute?.campaign.id ?? null,
                populationVariantId: populationRoute?.variant.id ?? null,
                variantAssignmentId: populationRoute?.assignment.id ?? null,
                source: trigger === "manual" ? "solo.run_now" : "solo.schedule",
                wakeReason:
                    trigger === "manual"
                        ? `Solo Run: ${definition.name}`
                        : `Scheduled Solo Run: ${definition.name}`,
                triggeredBy: requestedBy.actorType,
            },
            requestedByActorType: requestedBy.actorType,
            requestedByActorId: requestedBy.actorId,
        });

        if (run) {
            await experimentSvc.attachIssueAndHeartbeat({
                experimentId: experiment.id,
                issueId: issue.id,
                heartbeatRunId: run.id,
                status: run.status === "running" ? "running" : "queued",
            });
        } else {
            await experimentSvc.attachIssueAndHeartbeat({
                experimentId: experiment.id,
                issueId: issue.id,
            });
            await experimentSvc.markSkipped(
                experiment.id,
                "Heartbeat wakeup was skipped or deferred before a dedicated run was created.",
            );
        }

        const updatedInstance = await soloSvc.runNow(instance.id);

        return {
            status: run ? "queued" : "skipped",
            runId: run?.id,
            experimentId: experiment.id,
            instance: updatedInstance,
            issueId: issue.id,
            issueIdentifier: issue.identifier ?? issue.id,
        };
    }

    async function tickDueInstances(now: Date): Promise<{ fired: number }> {
        const dueInstances = await soloSvc.listDueInstances(now);
        let fired = 0;

        for (const instance of dueInstances) {
            try {
                await triggerInstance(instance.id, {
                    trigger: "schedule",
                    requestedBy: {
                        actorType: "system",
                        actorId: "system",
                    },
                });
                fired++;
            } catch (err) {
                await soloSvc.markError(instance.id).catch((markErr) => {
                    logger.error(
                        { err: markErr, instanceId: instance.id },
                        "Failed to mark solo instance as errored after scheduled trigger failure",
                    );
                });
                logger.error(
                    { err, instanceId: instance.id, soloId: instance.soloId },
                    "Failed to trigger due solo instance",
                );
            }
        }

        return { fired };
    }

    return {
        triggerInstance,
        tickDueInstances,
    };
}
