import { asString, asNumber, parseObject, parseJson } from "@paperclipai/adapter-utils/server-utils";

/**
 * Parse the JSONL output produced by `droid exec -o json`.
 *
 * Factory's droid outputs one JSON object per line. Currently documented
 * event types include:
 *   { "type": "message", "role": "bot", "content": "..." }          — assistant/bot text
 *   { "type": "tool_use", ... }                                    — tool calls (ignored for summary)
 *   { "type": "result", "status": "error", "error": "..." }       — terminal error
 *   { "session_id": "...", ... }                                   — session metadata
 *
 * Note: droid uses role="bot" (not "assistant") for its own messages.
 * We accept both for forward compatibility.

 */
export function parseDroidJsonl(stdout: string) {
    let sessionId: string | null = null;
    const messages: string[] = [];
    let errorMessage: string | null = null;
    let totalCostUsd = 0;
    const usage = {
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
    };

    for (const rawLine of stdout.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) continue;

        const event = parseJson(line);
        if (!event) continue;

        // Session ID appears at top level or nested
        const foundSession =
            asString(event.session_id, "").trim() ||
            asString(event.sessionId, "").trim() ||
            asString(parseObject(event.session).id, "").trim();
        if (foundSession) sessionId = foundSession;

        const type = asString(event.type, "");

        // Assistant message text — droid uses role="bot", not "assistant"
        if (type === "message") {
            const role = asString(event.role, "");
            if (role === "bot" || role === "assistant") {
                const content = asString(event.content, "").trim();
                if (content) messages.push(content);
            }
            continue;
        }

        // "text" type (some versions of the CLI use this)
        if (type === "text") {
            const text = asString(event.text, "").trim() || asString(event.content, "").trim();
            if (text) messages.push(text);
            continue;
        }

        // Result / completion
        if (type === "result") {
            const status = asString(event.status, "");
            if (status === "error") {
                const msg = (asString(event.error, "").trim() || asString(event.message, "").trim());
                if (msg) errorMessage = msg;
            }
            // Forward-compat: cost / usage may appear in result
            const cost = asNumber(event.cost, 0);
            if (cost > 0) totalCostUsd += cost;
            const inputTokens = asNumber(parseObject(event.usage).input_tokens, 0);
            const outputTokens = asNumber(parseObject(event.usage).output_tokens, 0);
            const cacheRead = asNumber(parseObject(parseObject(event.usage).cache_read_input_tokens), 0);
            usage.inputTokens += inputTokens;
            usage.outputTokens += outputTokens;
            usage.cachedInputTokens += cacheRead;
            continue;
        }

        // Error event
        if (type === "error") {
            const msg = asString(event.message, "").trim() || asString(event.error, "").trim();
            if (msg && !errorMessage) errorMessage = msg;
        }
    }

    return {
        sessionId,
        summary: messages.join("\n\n").trim(),
        usage,
        costUsd: totalCostUsd > 0 ? totalCostUsd : null,
        errorMessage,
    };
}

/**
 * Detect "unknown session" errors so the adapter can retry with a fresh session.
 */
export function isDroidUnknownSessionError(stdout: string, stderr: string): boolean {
    const haystack = `${stdout}\n${stderr}`
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");

    return /unknown.{0,20}session|session.{0,30}not.{0,10}found|session.{0,30}expired|session.{0,30}invalid|invalid.{0,20}session/i.test(haystack);
}
