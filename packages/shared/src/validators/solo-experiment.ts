import { z } from "zod";
import {
  SOLO_EXPERIMENT_DECISIONS,
  SOLO_EXPERIMENT_STATUSES,
  SOLO_EXPERIMENT_TRIGGERS,
} from "../constants.js";

export const updateSoloExperimentSchema = z.object({
  trigger: z.enum(SOLO_EXPERIMENT_TRIGGERS).optional(),
  status: z.enum(SOLO_EXPERIMENT_STATUSES).optional(),
  decision: z.enum(SOLO_EXPERIMENT_DECISIONS).optional(),
  variantLabel: z.string().trim().min(1).optional().nullable(),
  hypothesis: z.string().trim().min(1).optional().nullable(),
  summary: z.string().trim().min(1).optional().nullable(),
  decisionReason: z.string().trim().min(1).optional().nullable(),
  score: z.number().finite().optional().nullable(),
  scoreLabel: z.string().trim().min(1).optional().nullable(),
  metrics: z.record(z.unknown()).optional(),
  inputSnapshot: z.record(z.unknown()).optional(),
  promoteToBest: z.boolean().optional(),
});

export type UpdateSoloExperiment = z.infer<typeof updateSoloExperimentSchema>;
