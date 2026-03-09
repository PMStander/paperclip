import { describe, expect, it } from "vitest";
import { applyVariantToIssueDraft, deriveBranchName, scoreFromHistoricalHeartbeat } from "../services/experiments.ts";

describe("applyVariantToIssueDraft", () => {
  it("applies issue text and adapter overrides from a routed variant", () => {
    const draft = applyVariantToIssueDraft(
      {
        title: "Investigate churn",
        description: "Review last week's churn report.",
        priority: "medium",
        assigneeAgentId: "agent-a",
        assigneeAdapterOverrides: {
          adapterConfig: {
            promptTemplate: "Base prompt",
          },
        },
      },
      {
        id: "variant-1",
        companyId: "company-1",
        campaignId: "campaign-1",
        label: "challenger",
        role: "challenger",
        status: "active",
        trafficPercent: 20,
        config: {
          issuePatch: {
            titlePrefix: "[Experiment] ",
            descriptionSuffix: " Include a retention recommendation.",
            priority: "high",
            assigneeAgentId: "agent-b",
          },
          adapterConfig: {
            temperature: 0.1,
          },
        },
        score: null,
        scoreLabel: null,
        summary: null,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    );

    expect(draft.title).toBe("[Experiment] Investigate churn");
    expect(draft.description).toContain("Include a retention recommendation.");
    expect(draft.priority).toBe("high");
    expect(draft.assigneeAgentId).toBe("agent-b");
    expect(draft.assigneeAdapterOverrides?.adapterConfig).toMatchObject({
      promptTemplate: "Base prompt",
      temperature: 0.1,
    });
  });
});

describe("scoreFromHistoricalHeartbeat", () => {
  it("rewards successful runs and penalizes higher cost", () => {
    expect(scoreFromHistoricalHeartbeat({
      status: "succeeded",
      usageJson: { totalCostUsd: 0.2 },
      resultJson: { completedTaskCount: 2 },
    })).toBeGreaterThan(
      scoreFromHistoricalHeartbeat({
        status: "failed",
        usageJson: { totalCostUsd: 0.2 },
        resultJson: { completedTaskCount: 2 },
      }),
    );
  });
});

describe("deriveBranchName", () => {
  it("uses an explicit branch name when provided", () => {
    expect(deriveBranchName({ projectName: "Roadmap", providedBranchName: "feature/roadmap" })).toBe("feature/roadmap");
  });

  it("derives a paperclip branch name from the project name", () => {
    expect(deriveBranchName({ projectName: "Customer Success Workspace" })).toMatch(/^paperclip\/exp\/customer-success-workspace-/);
  });
});
