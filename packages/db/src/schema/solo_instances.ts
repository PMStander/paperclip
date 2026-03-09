import {
    pgTable,
    uuid,
    text,
    timestamp,
    jsonb,
    integer,
    doublePrecision,
    index,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const soloInstances = pgTable(
    "solo_instances",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        companyId: uuid("company_id").notNull().references(() => companies.id),
        soloId: text("solo_id").notNull(),
        agentName: text("agent_name").notNull(),
        status: text("status").notNull().default("active"),
        runSchedule: text("run_schedule").notNull().default("manual"),
        config: jsonb("config").$type<Record<string, string>>().notNull().default({}),
        agentId: uuid("agent_id"),
        experimentCount: integer("experiment_count").notNull().default(0),
        bestExperimentId: uuid("best_experiment_id"),
        bestScore: doublePrecision("best_score"),
        bestScoreLabel: text("best_score_label"),
        bestSummary: text("best_summary"),
        lastRunAt: timestamp("last_run_at", { withTimezone: true }),
        nextRunAt: timestamp("next_run_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        companyStatusIdx: index("solo_instances_company_status_idx").on(table.companyId, table.status),
        companySoloIdx: index("solo_instances_company_solo_idx").on(table.companyId, table.soloId),
        bestExperimentIdx: index("solo_instances_best_experiment_idx").on(table.bestExperimentId),
    }),
);
