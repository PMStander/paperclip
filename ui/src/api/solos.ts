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
    config: Record<string, string>;
    agentId: string | null;
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

    activate: (companyId: string, soloId: string, config: Record<string, string>, agentName?: string) =>
        api.post<SoloInstance>(`/solos/${encodeURIComponent(soloId)}/activate`, {
            companyId,
            config,
            agentName,
        }),

    pause: (instanceId: string) =>
        api.post<{ ok: true }>(`/solo-instances/${encodeURIComponent(instanceId)}/pause`, {}),

    resume: (instanceId: string) =>
        api.post<{ ok: true }>(`/solo-instances/${encodeURIComponent(instanceId)}/resume`, {}),

    deactivate: (instanceId: string) =>
        api.delete<{ ok: true }>(`/solo-instances/${encodeURIComponent(instanceId)}`),
};
