import { asString, asNumber, parseObject, parseJson } from "@paperclipai/adapter-utils/server-utils";

export function parseGeminiJsonl(stdout: string) {
  let sessionId: string | null = null;
  const messages: string[] = [];
  let errorMessage: string | null = null;
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

    const type = asString(event.type, "");
    if (type === "thread.started") {
      sessionId = asString(event.thread_id, sessionId ?? "") || sessionId;
      continue;
    }

    if (type === "error") {
      const msg = asString(event.message, "").trim();
      if (msg) errorMessage = msg;
      continue;
    }

    if (type === "item.completed") {
      const item = parseObject(event.item);
      if (asString(item.type, "") === "agent_message") {
        const text = asString(item.text, "");
        if (text) messages.push(text);
      }
      continue;
    }

    if (type === "turn.completed") {
      const usageObj = parseObject(event.usage);
      usage.inputTokens = asNumber(usageObj.input_tokens, usage.inputTokens);
      usage.cachedInputTokens = asNumber(usageObj.cached_input_tokens, usage.cachedInputTokens);
      usage.outputTokens = asNumber(usageObj.output_tokens, usage.outputTokens);
      continue;
    }

    if (type === "turn.failed") {
      const err = parseObject(event.error);
      const msg = asString(err.message, "").trim();
      if (msg) errorMessage = msg;
    }
  }

  return {
    sessionId,
    summary: messages.join("\n\n").trim(),
    usage,
    errorMessage,
  };
}

export function isGeminiUnknownSessionError(stdout: string, stderr: string): boolean {
  const haystack = `${stdout}\n${stderr}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  return /unknown (session|thread)|session .* not found|thread .* not found|conversation .* not found|missing rollout path for thread|state db missing rollout path/i.test(
    haystack,
  );
}

export function isGeminiQuotaError(stdout: string, stderr: string): boolean {
  const haystack = `${stdout}\n${stderr}`;
  return /TerminalQuotaError|reason:\s*'?QUOTA_EXHAUSTED'?/i.test(haystack);
}

/**
 * Attempt to parse the quota reset delay from Gemini CLI error output.
 * Returns the delay in milliseconds, or null if not parseable.
 */
export function parseQuotaResetMs(stderr: string): number | null {
  // Match "Your quota will reset after Xh Ym Zs." or "retryDelayMs: 12345"
  const resetMatch = stderr.match(/quota will reset after\s+(?:(\d+)h)?(\d+)m(\d+)s/i);
  if (resetMatch) {
    const hours = parseInt(resetMatch[1] ?? "0", 10);
    const minutes = parseInt(resetMatch[2], 10);
    const seconds = parseInt(resetMatch[3], 10);
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }
  const retryMatch = stderr.match(/retryDelayMs:\s*([\d.]+)/);
  if (retryMatch) {
    const ms = parseFloat(retryMatch[1]);
    if (Number.isFinite(ms) && ms > 0) return Math.round(ms);
  }
  return null;
}
