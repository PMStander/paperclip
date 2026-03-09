import type {
  SoloExperimentDecision,
  SoloExperimentStatus,
  SoloExperimentTrigger,
} from "../constants.js";

export interface SoloExperiment {
  id: string;
  companyId: string;
  soloInstanceId: string;
  basedOnExperimentId: string | null;
  issueId: string | null;
  heartbeatRunId: string | null;
  sequence: number;
  trigger: SoloExperimentTrigger;
  status: SoloExperimentStatus;
  decision: SoloExperimentDecision;
  variantLabel: string | null;
  hypothesis: string | null;
  summary: string | null;
  decisionReason: string | null;
  score: number | null;
  scoreLabel: string | null;
  metrics: Record<string, unknown>;
  inputSnapshot: Record<string, unknown>;
  isBest: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
