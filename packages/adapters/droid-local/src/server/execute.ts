import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import {
    asString,
    asNumber,
    asStringArray,
    parseObject,
    buildPaperclipEnv,
    redactEnvForLogs,
    ensureAbsoluteDirectory,
    ensureCommandResolvable,
    ensurePathInEnv,
    renderTemplate,
    runChildProcess,
} from "@paperclipai/adapter-utils/server-utils";
import { DEFAULT_DROID_LOCAL_MODEL } from "../index.js";
import { parseDroidJsonl, isDroidUnknownSessionError } from "./parse.js";

const __moduleDir = path.dirname(fileURLToPath(import.meta.url));
const PAPERCLIP_SKILLS_CANDIDATES = [
    path.resolve(__moduleDir, "../../skills"),
    path.resolve(__moduleDir, "../../../../../skills"),
];

function firstNonEmptyLine(text: string): string {
    return (
        text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find(Boolean) ?? ""
    );
}

async function resolvePaperclipSkillsDir(): Promise<string | null> {
    for (const candidate of PAPERCLIP_SKILLS_CANDIDATES) {
        const isDir = await fs.stat(candidate).then((s) => s.isDirectory()).catch(() => false);
        if (isDir) return candidate;
    }
    return null;
}

/**
 * Inject Paperclip skills into ~/.factory/skills so droid can discover them.
 * Creates symlinks for each skill directory (matching how opencode-local injects
 * into ~/.claude/skills).
 */
async function ensureDroidSkillsInjected(onLog: AdapterExecutionContext["onLog"]) {
    const skillsDir = await resolvePaperclipSkillsDir();
    if (!skillsDir) return;

    const skillsHome = path.join(process.env.HOME ?? "~", ".factory", "skills");
    await fs.mkdir(skillsHome, { recursive: true });
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const source = path.join(skillsDir, entry.name);
        const target = path.join(skillsHome, entry.name);
        const existing = await fs.lstat(target).catch(() => null);
        if (existing) continue;

        try {
            await fs.symlink(source, target);
            await onLog("stderr", `[paperclip] Injected Droid skill "${entry.name}" into ${skillsHome}\n`);
        } catch (err) {
            await onLog(
                "stderr",
                `[paperclip] Failed to inject Droid skill "${entry.name}": ${err instanceof Error ? err.message : String(err)}\n`,
            );
        }
    }
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
    const { runId, agent, runtime, config, context, onLog, onMeta, authToken } = ctx;

    const promptTemplate = asString(
        config.promptTemplate,
        "You are agent {{agent.id}} ({{agent.name}}). Continue your Paperclip work.",
    );
    const command = asString(config.command, "droid");
    const model = asString(config.model, DEFAULT_DROID_LOCAL_MODEL);

    // autonomyLevel: "low" | "medium" | "high" — default "high" for fully autonomous agents
    const autonomyLevel = asString(config.autonomyLevel, "high");

    // reasoningEffort: "off" | "low" | "medium" | "high"
    const reasoningEffort = asString(config.reasoningEffort, asString(config.thinkingEffort, ""));

    const workspaceContext = parseObject(context.paperclipWorkspace);
    const workspaceCwd = asString(workspaceContext.cwd, "");
    const workspaceSource = asString(workspaceContext.source, "");
    const workspaceId = asString(workspaceContext.workspaceId, "");
    const workspaceRepoUrl = asString(workspaceContext.repoUrl, "");
    const workspaceRepoRef = asString(workspaceContext.repoRef, "");
    const workspaceHints = Array.isArray(context.paperclipWorkspaces)
        ? context.paperclipWorkspaces.filter(
            (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null,
        )
        : [];

    const configuredCwd = asString(config.cwd, "");
    const useConfiguredInsteadOfAgentHome = workspaceSource === "agent_home" && configuredCwd.length > 0;
    const effectiveWorkspaceCwd = useConfiguredInsteadOfAgentHome ? "" : workspaceCwd;
    const cwd = effectiveWorkspaceCwd || configuredCwd || process.cwd();
    await ensureAbsoluteDirectory(cwd, { createIfMissing: true });
    await ensureDroidSkillsInjected(onLog);

    const envConfig = parseObject(config.env);
    const hasExplicitApiKey =
        typeof envConfig.PAPERCLIP_API_KEY === "string" && envConfig.PAPERCLIP_API_KEY.trim().length > 0;
    const env: Record<string, string> = { ...buildPaperclipEnv(agent) };
    env.PAPERCLIP_RUN_ID = runId;

    // Context-driven env vars (mirrors opencode-local pattern)
    const wakeTaskId =
        (typeof context.taskId === "string" && context.taskId.trim().length > 0 && context.taskId.trim()) ||
        (typeof context.issueId === "string" && context.issueId.trim().length > 0 && context.issueId.trim()) ||
        null;
    const wakeReason =
        typeof context.wakeReason === "string" && context.wakeReason.trim().length > 0
            ? context.wakeReason.trim()
            : null;
    const wakeCommentId =
        (typeof context.wakeCommentId === "string" && context.wakeCommentId.trim().length > 0 && context.wakeCommentId.trim()) ||
        (typeof context.commentId === "string" && context.commentId.trim().length > 0 && context.commentId.trim()) ||
        null;
    const approvalId =
        typeof context.approvalId === "string" && context.approvalId.trim().length > 0
            ? context.approvalId.trim()
            : null;
    const approvalStatus =
        typeof context.approvalStatus === "string" && context.approvalStatus.trim().length > 0
            ? context.approvalStatus.trim()
            : null;
    const linkedIssueIds = Array.isArray(context.issueIds)
        ? context.issueIds.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
        : [];

    if (wakeTaskId) env.PAPERCLIP_TASK_ID = wakeTaskId;
    if (wakeReason) env.PAPERCLIP_WAKE_REASON = wakeReason;
    if (wakeCommentId) env.PAPERCLIP_WAKE_COMMENT_ID = wakeCommentId;
    if (approvalId) env.PAPERCLIP_APPROVAL_ID = approvalId;
    if (approvalStatus) env.PAPERCLIP_APPROVAL_STATUS = approvalStatus;
    if (linkedIssueIds.length > 0) env.PAPERCLIP_LINKED_ISSUE_IDS = linkedIssueIds.join(",");
    if (effectiveWorkspaceCwd) env.PAPERCLIP_WORKSPACE_CWD = effectiveWorkspaceCwd;
    if (workspaceSource) env.PAPERCLIP_WORKSPACE_SOURCE = workspaceSource;
    if (workspaceId) env.PAPERCLIP_WORKSPACE_ID = workspaceId;
    if (workspaceRepoUrl) env.PAPERCLIP_WORKSPACE_REPO_URL = workspaceRepoUrl;
    if (workspaceRepoRef) env.PAPERCLIP_WORKSPACE_REPO_REF = workspaceRepoRef;
    if (workspaceHints.length > 0) env.PAPERCLIP_WORKSPACES_JSON = JSON.stringify(workspaceHints);

    for (const [k, v] of Object.entries(envConfig)) {
        if (typeof v === "string") env[k] = v;
    }
    if (!hasExplicitApiKey && authToken) {
        env.PAPERCLIP_API_KEY = authToken;
    }

    const runtimeEnv = ensurePathInEnv({ ...process.env, ...env });
    await ensureCommandResolvable(command, cwd, runtimeEnv);

    const timeoutSec = asNumber(config.timeoutSec, 0);
    const graceSec = asNumber(config.graceSec, 20);
    const extraArgs = (() => {
        const fromExtraArgs = asStringArray(config.extraArgs);
        if (fromExtraArgs.length > 0) return fromExtraArgs;
        return asStringArray(config.args);
    })();

    // Session resume
    const runtimeSessionParams = parseObject(runtime.sessionParams);
    const runtimeSessionId = asString(runtimeSessionParams.sessionId, runtime.sessionId ?? "");
    const runtimeSessionCwd = asString(runtimeSessionParams.cwd, "");
    const canResumeSession =
        runtimeSessionId.length > 0 &&
        (runtimeSessionCwd.length === 0 || path.resolve(runtimeSessionCwd) === path.resolve(cwd));
    const sessionId = canResumeSession ? runtimeSessionId : null;
    if (runtimeSessionId && !canResumeSession) {
        await onLog(
            "stderr",
            `[paperclip] Droid session "${runtimeSessionId}" was saved for cwd "${runtimeSessionCwd}" and will not be resumed in "${cwd}".\n`,
        );
    }

    // Instructions
    const instructionsFilePath = asString(config.instructionsFilePath, "").trim();
    const instructionsDir = instructionsFilePath ? `${path.dirname(instructionsFilePath)}/` : "";
    let instructionsPrefix = "";
    if (instructionsFilePath) {
        try {
            const instructionsContents = await fs.readFile(instructionsFilePath, "utf8");
            instructionsPrefix =
                `${instructionsContents}\n\n` +
                `The above agent instructions were loaded from ${instructionsFilePath}. ` +
                `Resolve any relative file references from ${instructionsDir}.\n\n`;
            await onLog("stderr", `[paperclip] Loaded agent instructions file: ${instructionsFilePath}\n`);
        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            await onLog(
                "stderr",
                `[paperclip] Warning: could not read agent instructions file "${instructionsFilePath}": ${reason}\n`,
            );
        }
    }

    const renderedPrompt = renderTemplate(promptTemplate, {
        agentId: agent.id,
        companyId: agent.companyId,
        runId,
        company: { id: agent.companyId },
        agent,
        run: { id: runId, source: "on_demand" },
        context,
    });
    const prompt = `${instructionsPrefix}${renderedPrompt}`;

    const buildArgs = (resumeSessionId: string | null): string[] => {
        // droid exec [flags] "<prompt>"
        const args = ["exec"];
        // Output format: JSON for machine-readable parsing
        args.push("-o", "json");
        // Model
        if (model) args.push("-m", model);
        // Autonomy level — --auto <level> already implies autonomous operation.
        // --skip-permissions-unsafe is MUTUALLY EXCLUSIVE with --auto; only use it
        // as a fallback when no autonomy level is set (e.g. user cleared it).
        if (autonomyLevel) {
            args.push("--auto", autonomyLevel);
        } else {
            // No --auto flag: use --skip-permissions-unsafe for unattended runs
            args.push("--skip-permissions-unsafe");
        }
        // Reasoning effort
        if (reasoningEffort) args.push("-r", reasoningEffort);
        // Session resume
        if (resumeSessionId) args.push("-s", resumeSessionId);
        // Extra args from config
        if (extraArgs.length > 0) args.push(...extraArgs);
        // Prompt (final positional argument)
        args.push(prompt);
        return args;
    };


    const commandNotes = instructionsFilePath && instructionsPrefix.length > 0
        ? [
            `Loaded agent instructions from ${instructionsFilePath}`,
            `Prepended instructions + path directive to prompt.`,
        ]
        : [];

    const runAttempt = async (resumeSessionId: string | null) => {
        const args = buildArgs(resumeSessionId);
        if (onMeta) {
            await onMeta({
                adapterType: "droid_local",
                command,
                cwd,
                commandNotes,
                commandArgs: args.map((value, idx) => {
                    if (idx === args.length - 1) return `<prompt ${prompt.length} chars>`;
                    return value;
                }),
                env: redactEnvForLogs(env),
                prompt,
                context,
            });
        }

        const proc = await runChildProcess(runId, command, args, {
            cwd,
            env,
            timeoutSec,
            graceSec,
            onLog,
        });

        return {
            proc,
            parsed: parseDroidJsonl(proc.stdout),
        };
    };

    const toResult = (
        attempt: {
            proc: {
                exitCode: number | null;
                signal: string | null;
                timedOut: boolean;
                stdout: string;
                stderr: string;
            };
            parsed: ReturnType<typeof parseDroidJsonl>;
        },
        clearSessionOnMissingSession = false,
    ): AdapterExecutionResult => {
        if (attempt.proc.timedOut) {
            return {
                exitCode: attempt.proc.exitCode,
                signal: attempt.proc.signal,
                timedOut: true,
                errorMessage: `Timed out after ${timeoutSec}s`,
                clearSession: clearSessionOnMissingSession,
            };
        }

        const resolvedSessionId = attempt.parsed.sessionId ?? runtimeSessionId ?? runtime.sessionId ?? null;
        const resolvedSessionParams = resolvedSessionId
            ? ({
                sessionId: resolvedSessionId,
                cwd,
                ...(workspaceId ? { workspaceId } : {}),
                ...(workspaceRepoUrl ? { repoUrl: workspaceRepoUrl } : {}),
                ...(workspaceRepoRef ? { repoRef: workspaceRepoRef } : {}),
            } as Record<string, unknown>)
            : null;

        const parsedError = typeof attempt.parsed.errorMessage === "string" ? attempt.parsed.errorMessage.trim() : "";
        const stderrLine = firstNonEmptyLine(attempt.proc.stderr);
        const fallbackErrorMessage =
            parsedError ||
            stderrLine ||
            `Droid exited with code ${attempt.proc.exitCode ?? -1}`;

        return {
            exitCode: attempt.proc.exitCode,
            signal: attempt.proc.signal,
            timedOut: false,
            errorMessage: (attempt.proc.exitCode ?? 0) === 0 ? null : fallbackErrorMessage,
            usage: attempt.parsed.usage,
            sessionId: resolvedSessionId,
            sessionParams: resolvedSessionParams,
            sessionDisplayId: resolvedSessionId,
            provider: "factory",
            model,
            billingType: "subscription",
            costUsd: attempt.parsed.costUsd,
            resultJson: {
                stdout: attempt.proc.stdout,
                stderr: attempt.proc.stderr,
            },
            summary: attempt.parsed.summary,
            clearSession: Boolean(clearSessionOnMissingSession && !resolvedSessionId),
        };
    };

    const initial = await runAttempt(sessionId);
    if (
        sessionId &&
        !initial.proc.timedOut &&
        (initial.proc.exitCode ?? 0) !== 0 &&
        isDroidUnknownSessionError(initial.proc.stdout, initial.proc.stderr)
    ) {
        await onLog(
            "stderr",
            `[paperclip] Droid session "${sessionId}" is unavailable; retrying with a fresh session.\n`,
        );
        const retry = await runAttempt(null);
        return toResult(retry, true);
    }

    return toResult(initial);
}

export async function testEnvironment(
    config: Record<string, unknown>,
    onLog: (stream: "stderr" | "stdout", data: string) => Promise<void>,
): Promise<{ ok: boolean; message: string }> {
    const command = asString(config.command, "droid");
    try {
        const proc = await runChildProcess(
            "test",
            command,
            ["--version"],
            {
                cwd: process.cwd(),
                env: {},
                timeoutSec: 10,
                graceSec: 5,
                onLog,
            },
        );
        if ((proc.exitCode ?? 0) !== 0) {
            return { ok: false, message: `"${command} --version" exited with code ${proc.exitCode}. Is droid installed?` };
        }
        const version = firstNonEmptyLine(proc.stdout) || firstNonEmptyLine(proc.stderr) || "unknown";
        return { ok: true, message: `droid found: ${version}` };
    } catch (err) {
        return {
            ok: false,
            message: `Cannot find "${command}". Install with: curl -fsSL https://app.factory.ai/cli | sh`,
        };
    }
}

export const sessionCodec = {
    encode: (params: Record<string, unknown>) => JSON.stringify(params),
    decode: (raw: string): Record<string, unknown> => {
        try {
            return JSON.parse(raw) as Record<string, unknown>;
        } catch {
            return {};
        }
    },
};
