import {
    pgTable,
    uuid,
    text,
    timestamp,
    jsonb,
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
        config: jsonb("config").$type<Record<string, string>>().notNull().default({}),
        agentId: uuid("agent_id"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        companyStatusIdx: index("solo_instances_company_status_idx").on(table.companyId, table.status),
        companySoloIdx: index("solo_instances_company_solo_idx").on(table.companyId, table.soloId),
    }),
);
