import { describe, expect, it } from "vitest";
import type { SoloDefinition } from "../solos/solo-types.js";
import {
  buildSoloPromptTemplate,
  buildSoloTaskKey,
} from "../services/solo-runner.ts";
import {
  computeSoloInitialNextRun,
  computeSoloNextRunAfterExecution,
} from "../services/solos.ts";

const definition = {
  id: "autoresearch",
  name: "AutoResearch Solo",
  description: "Autonomous experimentation loop",
  category: "productivity",
  icon: "🔬",
  tools: ["file_read"],
  settings: [],
  agent: {
    name: "autoresearch-solo",
    description: "Runs iterative experiments",
    module: "builtin:chat",
    provider: "default",
    model: "default",
    max_tokens: 4096,
    temperature: 0.2,
    max_iterations: 20,
    system_prompt: "You are an autonomous solo experiment runner.",
  },
  dashboard: { metrics: [] },
} satisfies SoloDefinition;

describe("solo scheduling helpers", () => {
  it("schedules one-off solos immediately on activation", () => {
    const now = new Date("2026-03-08T10:00:00.000Z");
    expect(computeSoloInitialNextRun("once", now)?.getTime()).toBe(now.getTime());
  });

  it("clears the next run after a one-off solo executes", () => {
    const now = new Date("2026-03-08T10:00:00.000Z");
    expect(computeSoloNextRunAfterExecution("once", now)).toBeNull();
  });

  it("advances recurring solos after each execution", () => {
    const now = new Date("2026-03-08T10:00:00.000Z");
    expect(computeSoloNextRunAfterExecution("hourly", now)?.toISOString()).toBe("2026-03-08T11:00:00.000Z");
    expect(computeSoloNextRunAfterExecution("daily", now)?.toISOString()).toBe("2026-03-09T10:00:00.000Z");
  });
});

describe("solo runner prompt helpers", () => {
  it("builds a stable task key per solo instance", () => {
    expect(buildSoloTaskKey("instance-123")).toBe("solo-instance:instance-123");
  });

  it("prepends the solo system prompt and preserves the existing prompt template", () => {
    const prompt = buildSoloPromptTemplate({
      definition,
      existingPromptTemplate: "Follow the Paperclip heartbeat.",
    });

    expect(prompt).toContain(definition.agent.system_prompt);
    expect(prompt).toContain("persistent solo thread");
    expect(prompt).toContain("PATCH /api/solo-experiments/:id");
    expect(prompt).toContain("Follow the Paperclip heartbeat.");
  });

  it("falls back to the default agent prompt when no existing prompt template is configured", () => {
    const prompt = buildSoloPromptTemplate({
      definition,
      existingPromptTemplate: null,
    });

    expect(prompt).toContain("Continue your Paperclip work");
  });
});
