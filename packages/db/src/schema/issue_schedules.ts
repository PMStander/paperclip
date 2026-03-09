import {
    pgTable,
    uuid,
    text,
    timestamp,
    integer,
    index,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { issues } from "./issues.js";

export const issueSchedules = pgTable(
    "issue_schedules",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        companyId: uuid("company_id").notNull().references(() => companies.id),
        templateIssueId: uuid("template_issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
        scheduleType: text("schedule_type").notNull().default("once"), // "once" | "recurring"
        frequency: text("frequency"), // "hourly" | "daily" | "weekly" | "monthly" — only for recurring
        timezone: text("timezone").notNull().default("UTC"),
        runAt: timestamp("run_at", { withTimezone: true }), // one-off: exact date/time
        startAt: timestamp("start_at", { withTimezone: true }), // recurring: start date
        endAt: timestamp("end_at", { withTimezone: true }), // recurring: end date (null = forever)
        hourOfDay: integer("hour_of_day"), // 0–23
        minuteOfHour: integer("minute_of_hour"), // 0–59
        dayOfWeek: integer("day_of_week"), // 0–6 (0=Sunday)
        dayOfMonth: integer("day_of_month"), // 1–31
        status: text("status").notNull().default("active"), // "active" | "paused" | "completed" | "expired"
        nextRunAt: timestamp("next_run_at", { withTimezone: true }),
        lastRunAt: timestamp("last_run_at", { withTimezone: true }),
        runCount: integer("run_count").notNull().default(0),
        maxRuns: integer("max_runs"),
        createdByUserId: text("created_by_user_id"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        companyStatusIdx: index("issue_schedules_company_status_idx").on(table.companyId, table.status),
        statusNextRunIdx: index("issue_schedules_status_next_run_idx").on(table.status, table.nextRunAt),
    }),
);
