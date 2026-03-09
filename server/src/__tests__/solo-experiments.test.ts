import { describe, expect, it } from "vitest";
import {
  isTerminalSoloExperimentStatus,
  shouldAutoPromoteSoloExperiment,
} from "../services/solo-experiments.ts";

describe("solo experiment status helpers", () => {
  it("treats succeeded and failed outcomes as terminal", () => {
    expect(isTerminalSoloExperimentStatus("succeeded")).toBe(true);
    expect(isTerminalSoloExperimentStatus("failed")).toBe(true);
    expect(isTerminalSoloExperimentStatus("timed_out")).toBe(true);
    expect(isTerminalSoloExperimentStatus("running")).toBe(false);
  });
});

describe("shouldAutoPromoteSoloExperiment", () => {
  it("auto-promotes the first successful baseline when no best exists", () => {
    expect(
      shouldAutoPromoteSoloExperiment({
        existingBestExperimentId: null,
        status: "succeeded",
        decision: "baseline",
      }),
    ).toBe(true);
  });

  it("does not auto-promote without an explicit request once a best variant exists", () => {
    expect(
      shouldAutoPromoteSoloExperiment({
        existingBestExperimentId: "exp-1",
        status: "succeeded",
        decision: "keep",
      }),
    ).toBe(false);
  });

  it("promotes an explicitly requested best variant only when the run succeeded", () => {
    expect(
      shouldAutoPromoteSoloExperiment({
        promoteToBest: true,
        existingBestExperimentId: "exp-1",
        status: "succeeded",
        decision: "keep",
      }),
    ).toBe(true);

    expect(
      shouldAutoPromoteSoloExperiment({
        promoteToBest: true,
        existingBestExperimentId: "exp-1",
        status: "failed",
        decision: "keep",
      }),
    ).toBe(false);
  });
});
