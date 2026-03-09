import { api } from "./client";

// ─── Types (mirrors server solo-types.ts) ───────────────────────────────────

export interface SoloSettingOption {
    value: string;
    label: string;
    binary?: string;
    provider_env?: string;
}

export interface SoloSetting {
    key: string;
    label: string;
    description: string;
    setting_type: "select" | "text" | "toggle";
    default: string;
    env_var?: string;
    options?: SoloSettingOption[];
}

export interface SoloInstallInfo {
    macos?: string;
    windows?: string;
    linux_apt?: string;
    linux_dnf?: string;
    linux_pacman?: string;
    pip?: string;
    manual_url?: string;
    signup_url?: string;
    docs_url?: string;
    env_example?: string;
    estimated_time?: string;
    steps?: string[];
}

export interface SoloRequirement {
    key: string;
    label: string;
    requirement_type: "binary" | "env_var" | "api_key";
    check_value: string;
    description: string;
    install?: SoloInstallInfo;
}

export interface SoloDashboardMetric {
    label: string;
    memory_key: string;
    format: "number" | "text" | "percentage" | "duration";
}

export interface SoloAgentConfig {
    name: string;
    description: string;
    module: string;
    provider: string;
    model: string;
    max_tokens: number;
    temperature: number;
    max_iterations: number;
    system_prompt: string;
}

export type SoloCategory =
    | "content"
    | "security"
    | "productivity"
    | "development"
    | "communication"
    | "data";

export interface SoloDefinition {
    id: string;
    name: string;
    description: string;
    category: SoloCategory;
    icon: string;
    tools: string[];
    requires?: SoloRequirement[];
    settings: SoloSetting[];
    agent: SoloAgentConfig;
    dashboard: { metrics: SoloDashboardMetric[] };
}

export interface SoloInstance {
    id: string;
    companyId: string;
    soloId: string;
    agentName: string;
    status: "active" | "paused" | "error" | "inactive";
    runSchedule: "once" | "hourly" | "daily" | "weekly" | "manual";
    config: Record<string, string>;
    agentId: string | null;
    experimentCount: number;
    bestExperimentId: string | null;
    bestScore: number | null;
    bestScoreLabel: string | null;
    bestSummary: string | null;
    lastRunAt: string | null;
    nextRunAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SoloExperiment {
    id: string;
    companyId: string;
    soloInstanceId: string;
    basedOnExperimentId: string | null;
    issueId: string | null;
    heartbeatRunId: string | null;
    sequence: number;
    trigger: "manual" | "schedule" | "retry";
    status: "queued" | "running" | "succeeded" | "failed" | "cancelled" | "timed_out" | "skipped";
    decision: "pending" | "baseline" | "keep" | "discard";
    variantLabel: string | null;
    hypothesis: string | null;
    summary: string | null;
    decisionReason: string | null;
    score: number | null;
    scoreLabel: string | null;
    metrics: Record<string, unknown>;
    inputSnapshot: Record<string, unknown>;
    isBest: boolean;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

// ─── API Client ─────────────────────────────────────────────────────────────

export const solosApi = {
    listDefinitions: () =>
        api.get<{ solos: SoloDefinition[] }>("/solos").then((r) => r.solos),

    getDefinition: (soloId: string) =>
        api.get<SoloDefinition>(`/solos/${encodeURIComponent(soloId)}`),

    listInstances: (companyId: string) =>
        api
            .get<{ instances: SoloInstance[] }>(`/companies/${companyId}/solo-instances`)
            .then((r) => r.instances),

    activate: (companyId: string, soloId: string, config: Record<string, string>, agentName?: string, agentId?: string, runSchedule?: string) =>
        api.post<SoloInstance>(`/solos/${encodeURIComponent(soloId)}/activate`, {
            companyId,
            config,
            agentName,
            agentId,
            runSchedule,
        }),

    pause: (instanceId: string) =>
        api.post<{ ok: true }>(`/solo-instances/${encodeURIComponent(instanceId)}/pause`, {}),

    resume: (instanceId: string) =>
        api.post<{ ok: true }>(`/solo-instances/${encodeURIComponent(instanceId)}/resume`, {}),

    deactivate: (instanceId: string) =>
        api.delete<{ ok: true }>(`/solo-instances/${encodeURIComponent(instanceId)}`),

    runNow: (instanceId: string) =>
        api.post<{ status: string; runId?: string; experimentId: string; instance: SoloInstance; issueId?: string; issueIdentifier?: string }>(`/solo-instances/${encodeURIComponent(instanceId)}/run-now`, {}),

    listExperiments: (companyId: string, instanceId: string) =>
        api
            .get<{ experiments: SoloExperiment[] }>(`/companies/${encodeURIComponent(companyId)}/solo-instances/${encodeURIComponent(instanceId)}/experiments`)
            .then((r) => r.experiments),

    getExperiment: (experimentId: string) =>
        api.get<SoloExperiment>(`/solo-experiments/${encodeURIComponent(experimentId)}`),

    updateExperiment: (
        experimentId: string,
        data: Partial<Pick<SoloExperiment, "trigger" | "status" | "decision" | "variantLabel" | "hypothesis" | "summary" | "decisionReason" | "score" | "scoreLabel" | "metrics" | "inputSnapshot">> & { promoteToBest?: boolean },
    ) => api.patch<SoloExperiment>(`/solo-experiments/${encodeURIComponent(experimentId)}`, data),
};
