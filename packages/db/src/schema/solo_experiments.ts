import {
    type AnyPgColumn,
    pgTable,
    uuid,
    text,
    timestamp,
    jsonb,
    integer,
    boolean,
    doublePrecision,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { soloInstances } from "./solo_instances.js";
import { issues } from "./issues.js";
import { heartbeatRuns } from "./heartbeat_runs.js";

export const soloExperiments = pgTable(
    "solo_experiments",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        companyId: uuid("company_id").notNull().references(() => companies.id),
        soloInstanceId: uuid("solo_instance_id").notNull().references(() => soloInstances.id),
        basedOnExperimentId: uuid("based_on_experiment_id").references((): AnyPgColumn => soloExperiments.id, { onDelete: "set null" }),
        issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
        heartbeatRunId: uuid("heartbeat_run_id").references(() => heartbeatRuns.id, { onDelete: "set null" }),
        sequence: integer("sequence").notNull(),
        trigger: text("trigger").notNull().default("manual"),
        status: text("status").notNull().default("queued"),
        decision: text("decision").notNull().default("pending"),
        variantLabel: text("variant_label"),
        hypothesis: text("hypothesis"),
        summary: text("summary"),
        decisionReason: text("decision_reason"),
        score: doublePrecision("score"),
        scoreLabel: text("score_label"),
        metrics: jsonb("metrics").$type<Record<string, unknown>>().notNull().default({}),
        inputSnapshot: jsonb("input_snapshot").$type<Record<string, unknown>>().notNull().default({}),
        isBest: boolean("is_best").notNull().default(false),
        startedAt: timestamp("started_at", { withTimezone: true }),
        completedAt: timestamp("completed_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        companyInstanceCreatedIdx: index("solo_experiments_company_instance_created_idx").on(table.companyId, table.soloInstanceId, table.createdAt),
        instanceBestIdx: index("solo_experiments_instance_best_idx").on(table.soloInstanceId, table.isBest),
        heartbeatRunIdx: index("solo_experiments_heartbeat_run_idx").on(table.heartbeatRunId),
        issueIdx: index("solo_experiments_issue_idx").on(table.issueId),
        instanceSequenceIdx: uniqueIndex("solo_experiments_instance_sequence_idx").on(table.soloInstanceId, table.sequence),
    }),
);
