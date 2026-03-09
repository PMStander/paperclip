export interface IssueSchedule {
    id: string;
    companyId: string;
    templateIssueId: string;
    scheduleType: "once" | "recurring";
    frequency: "hourly" | "daily" | "weekly" | "monthly" | null;
    timezone: string;
    runAt: string | null;
    startAt: string | null;
    endAt: string | null;
    hourOfDay: number | null;
    minuteOfHour: number | null;
    dayOfWeek: number | null;
    dayOfMonth: number | null;
    status: "active" | "paused" | "completed" | "expired";
    nextRunAt: string | null;
    lastRunAt: string | null;
    runCount: number;
    maxRuns: number | null;
    createdByUserId: string | null;
    createdAt: string;
    updatedAt: string;
    // Joined fields
    templateIssue?: {
        id: string;
        title: string;
        description: string | null;
        assigneeAgentId: string | null;
        assigneeUserId: string | null;
        projectId: string | null;
        priority: string;
    };
}
