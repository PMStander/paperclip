import { describe, expect, it } from "vitest";
import {
    isGeminiQuotaError,
    parseQuotaResetMs,
} from "@paperclipai/adapter-gemini-local/server";

describe("isGeminiQuotaError", () => {
    it("detects TerminalQuotaError in stderr", () => {
        const stderr =
            'Error when talking to Gemini API TerminalQuotaError: You have exhausted your capacity on this model. Your quota will reset after 43m36s.\n    at classifyGoogleError (file:///foo/googleQuotaErrors.js:234:28)';
        expect(isGeminiQuotaError("", stderr)).toBe(true);
    });

    it("detects QUOTA_EXHAUSTED reason in stderr", () => {
        const stderr = "  reason: 'QUOTA_EXHAUSTED'\n";
        expect(isGeminiQuotaError("", stderr)).toBe(true);
    });

    it("detects quota error from stdout", () => {
        const stdout =
            '{"type":"result","status":"error","error":{"message":"TerminalQuotaError: quota exhausted"}}';
        expect(isGeminiQuotaError(stdout, "")).toBe(true);
    });

    it("returns false for generic errors", () => {
        const stderr = "Error: something went wrong\n    at foo (bar.js:1:1)";
        expect(isGeminiQuotaError("", stderr)).toBe(false);
    });

    it("returns false for empty output", () => {
        expect(isGeminiQuotaError("", "")).toBe(false);
    });
});

describe("parseQuotaResetMs", () => {
    it("parses minutes and seconds reset time", () => {
        const stderr =
            "TerminalQuotaError: You have exhausted your capacity on this model. Your quota will reset after 43m36s.";
        expect(parseQuotaResetMs(stderr)).toBe((43 * 60 + 36) * 1000);
    });

    it("parses hours, minutes, and seconds reset time", () => {
        const stderr =
            "You have exhausted your capacity on this model. Your quota will reset after 13h59m18s.";
        expect(parseQuotaResetMs(stderr)).toBe(
            (13 * 3600 + 59 * 60 + 18) * 1000,
        );
    });

    it("parses retryDelayMs from error object", () => {
        const stderr = "  retryDelayMs: 2616577.77177,\n  reason: 'QUOTA_EXHAUSTED'";
        expect(parseQuotaResetMs(stderr)).toBe(2616578);
    });

    it("returns null for non-quota error", () => {
        const stderr = "Error: something else";
        expect(parseQuotaResetMs(stderr)).toBeNull();
    });

    it("returns null for empty string", () => {
        expect(parseQuotaResetMs("")).toBeNull();
    });
});
