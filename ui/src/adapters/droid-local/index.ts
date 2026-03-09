import type { UIAdapterModule, TranscriptEntry, AdapterConfigFieldsProps } from "../types";
import { buildDroidLocalConfig } from "@paperclipai/adapter-droid-local/ui";
import React from "react";

/**
 * Parse stdout lines from `droid exec -o json`.
 *
 * Droid emits JSONL where each line is a structured event. Key event types:
 *   {"type":"init",  "session_id":"...", "model":"..."}
 *   {"type":"message", "role":"bot", "content":"..."}   ← role is "bot", NOT "assistant"
 *   {"type":"tool_use", "name":"...", "input":{...}}
 *   {"type":"tool_result", "content":"..."}
 *   {"type":"result", "status":"ok|error", "error":"..."}
 *
 * Plain (non-JSON) lines are shown as stdout entries.
 */
function parseDroidStdoutLine(line: string, ts: string): TranscriptEntry[] {
    const trimmed = line.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("{")) {
        try {
            const event = JSON.parse(trimmed) as Record<string, unknown>;
            const kind = event.type as string | undefined;

            // message event — droid uses role="bot" (not "assistant")
            if (kind === "message") {
                const role = (event.role as string | undefined) ?? "";
                if (role === "bot" || role === "assistant") {
                    const text = String((event.content ?? "")).trim();
                    if (text) return [{ kind: "assistant", ts, text }];
                }
                return [];
            }

            // text delta event (streaming incremental updates in some versions)
            if (kind === "text") {
                const text = String((event.text ?? event.content ?? "")).trim();
                if (text) return [{ kind: "assistant", ts, text }];
                return [];
            }

            // Tool call event
            if (kind === "tool_use") {
                const name = String(event.name ?? "tool");
                return [{ kind: "tool_call", ts, name, input: event.input ?? {} }];
            }

            // Tool result
            if (kind === "tool_result") {
                const content = String(event.content ?? "").trim();
                const isError = Boolean(event.is_error ?? event.isError);
                if (content) {
                    return [{ kind: "tool_result", ts, toolUseId: String(event.tool_use_id ?? ""), content, isError }];
                }
                return [];
            }

            // Error event — surface as stderr
            if (kind === "error") {
                const msg = String(event.message ?? event.error ?? "").trim();
                if (msg) return [{ kind: "stderr", ts, text: msg }];
                return [];
            }

            // init, result, and other control events are silently dropped from transcript
            return [];
        } catch {
            // Malformed JSON — fall through to plain text
        }
    }

    return [{ kind: "stdout", ts, text: trimmed }];
}

// No adapter-specific config fields needed — the shared AgentConfigForm fields
// (model picker, command, env vars, extra args, timeout) cover everything.
function DroidLocalConfigFields(_props: AdapterConfigFieldsProps) {
    return React.createElement(React.Fragment, null);
}

export const droidLocalUIAdapter: UIAdapterModule = {
    type: "droid_local",
    label: "Droid (Factory.ai)",
    parseStdoutLine: parseDroidStdoutLine,
    ConfigFields: DroidLocalConfigFields,
    buildAdapterConfig: buildDroidLocalConfig,
};
