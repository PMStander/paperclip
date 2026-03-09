import { describe, expect, it } from "vitest";
import { inferDefaultAssigneeAgentId } from "../services/issues.ts";

const candidates = [
  {
    id: "author",
    name: "Author",
    role: "general",
    title: "Author & Publisher",
    capabilities: "Writes engaging books for Amazon KDP.",
    status: "idle",
  },
  {
    id: "cmo",
    name: "CMO",
    role: "cmo",
    title: "Chief Marketing Officer",
    capabilities: "Oversees content strategy, Amazon KDP books, and YouTube videos.",
    status: "idle",
  },
  {
    id: "video",
    name: "Video Producer",
    role: "designer",
    title: "YouTube Video Creator",
    capabilities: "Creates informative videos for YouTube.",
    status: "idle",
  },
  {
    id: "mobile",
    name: "Mobile Developer",
    role: "engineer",
    title: "Senior Mobile Developer",
    capabilities: "Develops versatile apps for iOS and Android.",
    status: "idle",
  },
  {
    id: "web",
    name: "Web Developer",
    role: "engineer",
    title: "Senior Web Developer",
    capabilities: "Builds and maintains user-friendly websites and landing pages.",
    status: "idle",
  },
];

describe("inferDefaultAssigneeAgentId", () => {
  it("inherits the nearest lineage assignee before heuristics", () => {
    expect(
      inferDefaultAssigneeAgentId({
        title: "Execute Phase 2: Content Planning",
        lineageAssigneeAgentId: "cmo",
        candidates,
      }),
    ).toBe("cmo");
  });

  it("falls back to the project lead when there is no lineage assignee", () => {
    expect(
      inferDefaultAssigneeAgentId({
        title: "General project follow-up",
        projectLeadAgentId: "web",
        candidates,
      }),
    ).toBe("web");
  });

  it("routes KDP design work to the Author", () => {
    expect(
      inferDefaultAssigneeAgentId({
        title: "Design Cover for KDP Book",
        description: "Create the print-ready cover and interior formatting assets.",
        projectName: "Amazon KDP Books",
        candidates,
      }),
    ).toBe("author");
  });

  it("routes YouTube production work to the Video Producer", () => {
    expect(
      inferDefaultAssigneeAgentId({
        title: "Execute Phase 3: Production & Editing",
        description: "Record footage, voiceover, and edit the first batch of YouTube videos.",
        projectName: "YouTube Channel",
        candidates,
      }),
    ).toBe("video");
  });

  it("routes mobile app testing work to the Mobile Developer", () => {
    expect(
      inferDefaultAssigneeAgentId({
        title: "Phase 3: Testing & Polish",
        description: "Comprehensive QA for the mobile app beta and App Store readiness.",
        projectName: "Mobile Apps",
        candidates,
      }),
    ).toBe("mobile");
  });
});
