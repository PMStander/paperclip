import type { AdapterModel } from "./types.js";
import { models as opencodeFallbackModels } from "@paperclipai/adapter-opencode-local";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Reads the user's ~/.opencode.json and extracts available models from
 * the configured providers and agents. Returns the static fallback list
 * if the config cannot be read or contains no provider information.
 */
export async function listOpenCodeModels(): Promise<AdapterModel[]> {
    try {
        const configPath = join(homedir(), ".opencode.json");
        const raw = readFileSync(configPath, "utf-8");
        const config = JSON.parse(raw) as Record<string, unknown>;

        const models: AdapterModel[] = [];
        const seen = new Set<string>();

        // 1. Collect model IDs referenced in "agents" (e.g. "gemini-2.5-flash")
        const agents = config.agents as Record<string, { model?: string }> | undefined;
        if (agents && typeof agents === "object") {
            for (const agent of Object.values(agents)) {
                if (typeof agent?.model === "string" && agent.model.trim()) {
                    const id = agent.model.trim();
                    if (!seen.has(id)) {
                        seen.add(id);
                        models.push({ id, label: id });
                    }
                }
            }
        }

        // 2. Collect models explicitly listed in provider "models" blocks
        const providers = config.providers as Record<string, { models?: Record<string, unknown>; disabled?: boolean }> | undefined;
        if (providers && typeof providers === "object") {
            for (const [providerName, provider] of Object.entries(providers)) {
                if (provider?.disabled) continue;
                if (provider?.models && typeof provider.models === "object") {
                    for (const modelKey of Object.keys(provider.models)) {
                        // Models inside provider blocks may be keyed as literal model IDs
                        const id = modelKey.trim();
                        if (id && !seen.has(id)) {
                            seen.add(id);
                            models.push({ id, label: `${providerName}/${id}` });
                        }
                    }
                }
            }
        }

        if (models.length > 0) {
            // Also include the static fallback models so the user sees the full picture
            for (const m of opencodeFallbackModels) {
                if (!seen.has(m.id)) {
                    seen.add(m.id);
                    models.push(m);
                }
            }
            return models.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true, sensitivity: "base" }));
        }
    } catch {
        // Config not readable or not valid JSON — fall through to fallback
    }

    return opencodeFallbackModels;
}
