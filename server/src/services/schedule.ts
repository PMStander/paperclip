import { and, eq, lte, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { issueSchedules, issues, companies } from "@paperclipai/db";
import type { IssueSchedule } from "@paperclipai/shared";
import { logger } from "../middleware/logger.js";

type ScheduleRow = typeof issueSchedules.$inferSelect;

function rowToSchedule(row: ScheduleRow): IssueSchedule {
    return {
        id: row.id,
        companyId: row.companyId,
        templateIssueId: row.templateIssueId,
        scheduleType: row.scheduleType as IssueSchedule["scheduleType"],
        frequency: (row.frequency as IssueSchedule["frequency"]) ?? null,
        timezone: row.timezone,
        runAt: row.runAt?.toISOString() ?? null,
        startAt: row.startAt?.toISOString() ?? null,
        endAt: row.endAt?.toISOString() ?? null,
        hourOfDay: row.hourOfDay ?? null,
        minuteOfHour: row.minuteOfHour ?? null,
        dayOfWeek: row.dayOfWeek ?? null,
        dayOfMonth: row.dayOfMonth ?? null,
        status: row.status as IssueSchedule["status"],
        nextRunAt: row.nextRunAt?.toISOString() ?? null,
        lastRunAt: row.lastRunAt?.toISOString() ?? null,
        runCount: row.runCount,
        maxRuns: row.maxRuns ?? null,
        createdByUserId: row.createdByUserId ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

/**
 * Compute the next run time for a schedule based on its configuration.
 * For recurring schedules, this calculates the next occurrence after `from`.
 */
export function computeNextRunAt(
    scheduleType: string,
    frequency: string | null,
    from: Date,
    opts: {
        runAt?: Date | null;
        hourOfDay?: number | null;
        minuteOfHour?: number | null;
        dayOfWeek?: number | null;
        dayOfMonth?: number | null;
        endAt?: Date | null;
    },
): Date | null {
    if (scheduleType === "once") {
        return opts.runAt ?? null;
    }

    if (!frequency) return null;
    const minute = opts.minuteOfHour ?? 0;
    const hour = opts.hourOfDay ?? 0;

    let next: Date;

    switch (frequency) {
        case "hourly": {
            next = new Date(from);
            next.setMinutes(minute, 0, 0);
            if (next <= from) {
                next.setHours(next.getHours() + 1);
            }
            break;
        }
        case "daily": {
            next = new Date(from);
            next.setHours(hour, minute, 0, 0);
            if (next <= from) {
                next.setDate(next.getDate() + 1);
            }
            break;
        }
        case "weekly": {
            const targetDay = opts.dayOfWeek ?? 0;
            next = new Date(from);
            next.setHours(hour, minute, 0, 0);
            const currentDay = next.getDay();
            let daysUntil = targetDay - currentDay;
            if (daysUntil < 0) daysUntil += 7;
            if (daysUntil === 0 && next <= from) daysUntil = 7;
            next.setDate(next.getDate() + daysUntil);
            break;
        }
        case "monthly": {
            const targetDom = opts.dayOfMonth ?? 1;
            next = new Date(from);
            next.setDate(targetDom);
            next.setHours(hour, minute, 0, 0);
            if (next <= from) {
                next.setMonth(next.getMonth() + 1);
                next.setDate(targetDom);
            }
            break;
        }
        default:
            return null;
    }

    if (opts.endAt && next > opts.endAt) return null;
    return next;
}

export function issueScheduleService(db: Db) {
    return {
        async list(companyId: string): Promise<IssueSchedule[]> {
            const rows = await db
                .select()
                .from(issueSchedules)
                .where(eq(issueSchedules.companyId, companyId))
                .orderBy(issueSchedules.createdAt);
            return rows.map(rowToSchedule);
        },

        async getById(id: string): Promise<IssueSchedule | null> {
            const [row] = await db
                .select()
                .from(issueSchedules)
                .where(eq(issueSchedules.id, id));
            return row ? rowToSchedule(row) : null;
        },

        async create(
            companyId: string,
            data: {
                templateIssueId: string;
                scheduleType: string;
                frequency?: string | null;
                timezone?: string;
                runAt?: string | null;
                startAt?: string | null;
                endAt?: string | null;
                hourOfDay?: number | null;
                minuteOfHour?: number | null;
                dayOfWeek?: number | null;
                dayOfMonth?: number | null;
                maxRuns?: number | null;
                createdByUserId?: string | null;
            },
        ): Promise<IssueSchedule> {
            const now = new Date();
            const nextRunAt = computeNextRunAt(data.scheduleType, data.frequency ?? null, now, {
                runAt: data.runAt ? new Date(data.runAt) : null,
                hourOfDay: data.hourOfDay,
                minuteOfHour: data.minuteOfHour,
                dayOfWeek: data.dayOfWeek,
                dayOfMonth: data.dayOfMonth,
                endAt: data.endAt ? new Date(data.endAt) : null,
            });

            const [row] = await db
                .insert(issueSchedules)
                .values({
                    companyId,
                    templateIssueId: data.templateIssueId,
                    scheduleType: data.scheduleType,
                    frequency: data.frequency ?? null,
                    timezone: data.timezone ?? "UTC",
                    runAt: data.runAt ? new Date(data.runAt) : null,
                    startAt: data.startAt ? new Date(data.startAt) : null,
                    endAt: data.endAt ? new Date(data.endAt) : null,
                    hourOfDay: data.hourOfDay ?? null,
                    minuteOfHour: data.minuteOfHour ?? null,
                    dayOfWeek: data.dayOfWeek ?? null,
                    dayOfMonth: data.dayOfMonth ?? null,
                    maxRuns: data.maxRuns ?? null,
                    createdByUserId: data.createdByUserId ?? null,
                    nextRunAt,
                    status: "active",
                    createdAt: now,
                    updatedAt: now,
                })
                .returning();

            return rowToSchedule(row);
        },

        async update(
            id: string,
            data: {
                frequency?: string | null;
                timezone?: string;
                runAt?: string | null;
                startAt?: string | null;
                endAt?: string | null;
                hourOfDay?: number | null;
                minuteOfHour?: number | null;
                dayOfWeek?: number | null;
                dayOfMonth?: number | null;
                maxRuns?: number | null;
            },
        ): Promise<IssueSchedule | null> {
            const existing = await this.getById(id);
            if (!existing) return null;

            const now = new Date();
            const merged = { ...existing, ...data };
            const nextRunAt = computeNextRunAt(
                existing.scheduleType,
                merged.frequency ?? null,
                now,
                {
                    runAt: merged.runAt ? new Date(merged.runAt) : null,
                    hourOfDay: merged.hourOfDay,
                    minuteOfHour: merged.minuteOfHour,
                    dayOfWeek: merged.dayOfWeek,
                    dayOfMonth: merged.dayOfMonth,
                    endAt: merged.endAt ? new Date(merged.endAt) : null,
                },
            );

            const updateValues: Record<string, unknown> = {
                updatedAt: now,
                nextRunAt,
            };
            if (data.frequency !== undefined) updateValues.frequency = data.frequency;
            if (data.timezone !== undefined) updateValues.timezone = data.timezone;
            if (data.runAt !== undefined) updateValues.runAt = data.runAt ? new Date(data.runAt) : null;
            if (data.startAt !== undefined) updateValues.startAt = data.startAt ? new Date(data.startAt) : null;
            if (data.endAt !== undefined) updateValues.endAt = data.endAt ? new Date(data.endAt) : null;
            if (data.hourOfDay !== undefined) updateValues.hourOfDay = data.hourOfDay;
            if (data.minuteOfHour !== undefined) updateValues.minuteOfHour = data.minuteOfHour;
            if (data.dayOfWeek !== undefined) updateValues.dayOfWeek = data.dayOfWeek;
            if (data.dayOfMonth !== undefined) updateValues.dayOfMonth = data.dayOfMonth;
            if (data.maxRuns !== undefined) updateValues.maxRuns = data.maxRuns;

            const [row] = await db
                .update(issueSchedules)
                .set(updateValues)
                .where(eq(issueSchedules.id, id))
                .returning();

            return row ? rowToSchedule(row) : null;
        },

        async pause(id: string): Promise<IssueSchedule | null> {
            const [row] = await db
                .update(issueSchedules)
                .set({ status: "paused", updatedAt: new Date() })
                .where(eq(issueSchedules.id, id))
                .returning();
            return row ? rowToSchedule(row) : null;
        },

        async resume(id: string): Promise<IssueSchedule | null> {
            const existing = await this.getById(id);
            if (!existing) return null;
            const now = new Date();
            const nextRunAt = computeNextRunAt(existing.scheduleType, existing.frequency, now, {
                runAt: existing.runAt ? new Date(existing.runAt) : null,
                hourOfDay: existing.hourOfDay,
                minuteOfHour: existing.minuteOfHour,
                dayOfWeek: existing.dayOfWeek,
                dayOfMonth: existing.dayOfMonth,
                endAt: existing.endAt ? new Date(existing.endAt) : null,
            });
            const [row] = await db
                .update(issueSchedules)
                .set({ status: "active", nextRunAt, updatedAt: now })
                .where(eq(issueSchedules.id, id))
                .returning();
            return row ? rowToSchedule(row) : null;
        },

        async remove(id: string): Promise<IssueSchedule | null> {
            const [row] = await db
                .delete(issueSchedules)
                .where(eq(issueSchedules.id, id))
                .returning();
            return row ? rowToSchedule(row) : null;
        },

        /**
         * Tick all due schedules: find active schedules where next_run_at <= now,
         * create child issues from the template, and advance the schedule.
         */
        async tickSchedules(
            now: Date,
            createChildIssue: (
                companyId: string,
                templateIssue: typeof issues.$inferSelect,
                scheduleId: string,
            ) => Promise<string | null>,
        ): Promise<{ fired: number }> {
            const dueSchedules = await db
                .select()
                .from(issueSchedules)
                .where(
                    and(
                        eq(issueSchedules.status, "active"),
                        lte(issueSchedules.nextRunAt, now),
                    ),
                );

            let fired = 0;
            for (const schedule of dueSchedules) {
                try {
                    // Load template issue
                    const [template] = await db
                        .select()
                        .from(issues)
                        .where(eq(issues.id, schedule.templateIssueId));

                    if (!template) {
                        logger.warn(
                            { scheduleId: schedule.id, templateIssueId: schedule.templateIssueId },
                            "Schedule template issue not found; marking as expired",
                        );
                        await db
                            .update(issueSchedules)
                            .set({ status: "expired", updatedAt: now })
                            .where(eq(issueSchedules.id, schedule.id));
                        continue;
                    }

                    // Create child issue and wake agent
                    const childIssueId = await createChildIssue(schedule.companyId, template, schedule.id);

                    if (childIssueId) {
                        fired++;
                    }

                    // Update schedule
                    const newCount = schedule.runCount + 1;
                    const isOneOff = schedule.scheduleType === "once";
                    const maxReached = schedule.maxRuns && newCount >= schedule.maxRuns;

                    let newStatus = schedule.status;
                    let newNextRunAt: Date | null = null;

                    if (isOneOff || maxReached) {
                        newStatus = "completed";
                    } else {
                        newNextRunAt = computeNextRunAt(
                            schedule.scheduleType,
                            schedule.frequency,
                            now,
                            {
                                runAt: schedule.runAt,
                                hourOfDay: schedule.hourOfDay,
                                minuteOfHour: schedule.minuteOfHour,
                                dayOfWeek: schedule.dayOfWeek,
                                dayOfMonth: schedule.dayOfMonth,
                                endAt: schedule.endAt,
                            },
                        );
                        if (!newNextRunAt) {
                            newStatus = "expired";
                        }
                    }

                    await db
                        .update(issueSchedules)
                        .set({
                            lastRunAt: now,
                            runCount: newCount,
                            nextRunAt: newNextRunAt,
                            status: newStatus,
                            updatedAt: now,
                        })
                        .where(eq(issueSchedules.id, schedule.id));

                    logger.info(
                        {
                            scheduleId: schedule.id,
                            childIssueId,
                            runCount: newCount,
                            nextRunAt: newNextRunAt?.toISOString() ?? null,
                            newStatus,
                        },
                        "Schedule fired",
                    );
                } catch (err) {
                    logger.error(
                        { err, scheduleId: schedule.id },
                        "Failed to process due schedule",
                    );
                }
            }

            return { fired };
        },
    };
}
