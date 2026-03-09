import { z } from "zod";

export const ISSUE_SCHEDULE_TYPES = ["once", "recurring"] as const;
export const ISSUE_SCHEDULE_FREQUENCIES = ["hourly", "daily", "weekly", "monthly"] as const;
export const ISSUE_SCHEDULE_STATUSES = ["active", "paused", "completed", "expired"] as const;

export const createIssueScheduleSchema = z
    .object({
        templateIssueId: z.string().uuid(),
        scheduleType: z.enum(ISSUE_SCHEDULE_TYPES),
        frequency: z.enum(ISSUE_SCHEDULE_FREQUENCIES).optional().nullable(),
        timezone: z.string().optional().default("UTC"),
        runAt: z.string().datetime().optional().nullable(),
        startAt: z.string().datetime().optional().nullable(),
        endAt: z.string().datetime().optional().nullable(),
        hourOfDay: z.number().int().min(0).max(23).optional().nullable(),
        minuteOfHour: z.number().int().min(0).max(59).optional().nullable(),
        dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
        dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
        maxRuns: z.number().int().positive().optional().nullable(),
    })
    .refine(
        (data) => {
            if (data.scheduleType === "once") return !!data.runAt;
            return true;
        },
        { message: "runAt is required for one-off schedules", path: ["runAt"] },
    )
    .refine(
        (data) => {
            if (data.scheduleType === "recurring") return !!data.frequency;
            return true;
        },
        { message: "frequency is required for recurring schedules", path: ["frequency"] },
    );

export type CreateIssueSchedule = z.infer<typeof createIssueScheduleSchema>;

export const updateIssueScheduleSchema = z.object({
    frequency: z.enum(ISSUE_SCHEDULE_FREQUENCIES).optional().nullable(),
    timezone: z.string().optional(),
    runAt: z.string().datetime().optional().nullable(),
    startAt: z.string().datetime().optional().nullable(),
    endAt: z.string().datetime().optional().nullable(),
    hourOfDay: z.number().int().min(0).max(23).optional().nullable(),
    minuteOfHour: z.number().int().min(0).max(59).optional().nullable(),
    dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
    dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
    maxRuns: z.number().int().positive().optional().nullable(),
});

export type UpdateIssueSchedule = z.infer<typeof updateIssueScheduleSchema>;
