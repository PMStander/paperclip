import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { issuesApi } from "../api/issues";
import { schedulesApi } from "../api/schedules";
import { agentsApi } from "../api/agents";
import { projectsApi } from "../api/projects";
import { queryKeys } from "../lib/queryKeys";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CalendarClock,
  Repeat,
  ChevronDown,
} from "lucide-react";
import { cn } from "../lib/utils";
import { InlineEntitySelector, type InlineEntityOption } from "./InlineEntitySelector";
import { AgentIcon } from "./AgentIconPicker";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const FREQUENCIES = [
  { value: "hourly", label: "Hourly", description: "Runs every hour" },
  { value: "daily", label: "Daily", description: "Runs once per day" },
  { value: "weekly", label: "Weekly", description: "Runs once per week" },
  { value: "monthly", label: "Monthly", description: "Runs once per month" },
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toLocalDatetimeString(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewScheduleDialog() {
  const { newScheduleOpen, newScheduleDefaults, closeNewSchedule } = useDialog();
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  // Issue fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [projectId, setProjectId] = useState("");

  // Schedule fields
  const [scheduleType, setScheduleType] = useState<"once" | "recurring">("once");
  const [frequency, setFrequency] = useState("daily");
  const [runAt, setRunAt] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [hourOfDay, setHourOfDay] = useState(9);
  const [minuteOfHour, setMinuteOfHour] = useState(0);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && newScheduleOpen,
  });

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && newScheduleOpen,
  });

  // Create template issue + schedule in one flow
  const createSchedule = useMutation({
    mutationFn: async () => {
      if (!selectedCompanyId) throw new Error("No company selected");
      // 1. Create template issue (in backlog, won't be picked up)
      const templateIssue = await issuesApi.create(selectedCompanyId, {
        title: title.trim(),
        description: description.trim() || undefined,
        status: "backlog",
        priority,
        ...(assigneeId ? { assigneeAgentId: assigneeId } : {}),
        ...(projectId ? { projectId } : {}),
      });
      // 2. Create schedule pointing to template issue
      const scheduleData: Record<string, unknown> = {
        templateIssueId: templateIssue.id,
        scheduleType,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      if (scheduleType === "once") {
        scheduleData.runAt = new Date(runAt).toISOString();
      } else {
        scheduleData.frequency = frequency;
        scheduleData.hourOfDay = hourOfDay;
        scheduleData.minuteOfHour = minuteOfHour;
        if (frequency === "weekly") scheduleData.dayOfWeek = dayOfWeek;
        if (frequency === "monthly") scheduleData.dayOfMonth = dayOfMonth;
        if (startAt) scheduleData.startAt = new Date(startAt).toISOString();
        if (endAt) scheduleData.endAt = new Date(endAt).toISOString();
      }
      return schedulesApi.create(selectedCompanyId, scheduleData);
    },
    onSuccess: (schedule) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issueSchedules.list(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId!) });
      reset();
      closeNewSchedule();
    },
  });

  useEffect(() => {
    if (!newScheduleOpen) return;
    setAssigneeId(newScheduleDefaults.assigneeAgentId ?? "");
    setProjectId(newScheduleDefaults.projectId ?? "");
    // Default runAt to +1 hour from now
    const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
    setRunAt(toLocalDatetimeString(oneHourLater));
  }, [newScheduleOpen, newScheduleDefaults]);

  function reset() {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssigneeId("");
    setProjectId("");
    setScheduleType("once");
    setFrequency("daily");
    setRunAt("");
    setStartAt("");
    setEndAt("");
    setHourOfDay(9);
    setMinuteOfHour(0);
    setDayOfWeek(1);
    setDayOfMonth(1);
  }

  const currentAssignee = (agents ?? []).find((a) => a.id === assigneeId);
  const assigneeOptions = useMemo<InlineEntityOption[]>(
    () =>
      (agents ?? [])
        .filter((agent) => agent.status !== "terminated")
        .map((agent) => ({
          id: agent.id,
          label: agent.name,
          searchText: `${agent.name} ${agent.role} ${agent.title ?? ""}`,
        })),
    [agents],
  );
  const projectOptions = useMemo<InlineEntityOption[]>(
    () =>
      (projects ?? []).map((project) => ({
        id: project.id,
        label: project.name,
        searchText: project.description ?? "",
      })),
    [projects],
  );

  const canSubmit = title.trim().length > 0 && (scheduleType !== "once" || runAt);

  return (
    <Dialog open={newScheduleOpen} onOpenChange={(open) => { if (!open) closeNewSchedule(); }}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="p-0 gap-0 flex flex-col max-h-[calc(100dvh-2rem)] sm:max-w-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            <span>New scheduled task</span>
          </div>
          <Button variant="ghost" size="icon-xs" className="text-muted-foreground" onClick={closeNewSchedule}>
            <span className="text-lg leading-none">&times;</span>
          </Button>
        </div>

        {/* Title */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <textarea
            className="w-full text-lg font-semibold bg-transparent outline-none resize-none overflow-hidden placeholder:text-muted-foreground/50"
            placeholder="Task title"
            rows={1}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            autoFocus
          />
        </div>

        {/* Assignee + Project */}
        <div className="px-4 pb-2 shrink-0">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span>For</span>
            <InlineEntitySelector
              value={assigneeId}
              options={assigneeOptions}
              placeholder="Assignee"
              noneLabel="No assignee"
              searchPlaceholder="Search agents..."
              emptyMessage="No agents found."
              onChange={setAssigneeId}
              renderTriggerValue={(option) =>
                option && currentAssignee ? (
                  <>
                    <AgentIcon icon={currentAssignee.icon} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{option.label}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Assignee</span>
                )
              }
              renderOption={(option) => {
                if (!option.id) return <span className="truncate">{option.label}</span>;
                const agent = (agents ?? []).find((a) => a.id === option.id);
                return (
                  <>
                    <AgentIcon icon={agent?.icon} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{option.label}</span>
                  </>
                );
              }}
            />
            <span>in</span>
            <InlineEntitySelector
              value={projectId}
              options={projectOptions}
              placeholder="Project"
              noneLabel="No project"
              searchPlaceholder="Search projects..."
              emptyMessage="No projects found."
              onChange={setProjectId}
            />
          </div>
        </div>

        {/* Description */}
        <div className="px-4 pb-3 shrink-0">
          <textarea
            className="w-full text-sm bg-transparent outline-none resize-none overflow-hidden placeholder:text-muted-foreground/40 min-h-12"
            placeholder="Description (optional)"
            rows={2}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
          />
        </div>

        {/* Schedule type toggle */}
        <div className="px-4 pb-3 border-t border-border/60 pt-3 shrink-0">
          <div className="text-xs font-medium text-muted-foreground mb-2">Schedule</div>
          <div className="flex gap-2 mb-3">
            <button
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors",
                scheduleType === "once"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent/50",
              )}
              onClick={() => setScheduleType("once")}
            >
              <Clock className="h-4 w-4" />
              Once
            </button>
            <button
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors",
                scheduleType === "recurring"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent/50",
              )}
              onClick={() => setScheduleType("recurring")}
            >
              <Repeat className="h-4 w-4" />
              Recurring
            </button>
          </div>

          {/* One-off schedule */}
          {scheduleType === "once" && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Date &amp; Time</label>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                value={runAt}
                onChange={(e) => setRunAt(e.target.value)}
              />
            </div>
          )}

          {/* Recurring schedule */}
          {scheduleType === "recurring" && (
            <div className="space-y-3">
              {/* Frequency */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Frequency</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {FREQUENCIES.map((f) => (
                    <button
                      key={f.value}
                      className={cn(
                        "px-2 py-1.5 rounded-md text-xs font-medium border transition-colors",
                        frequency === f.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent/50",
                      )}
                      onClick={() => setFrequency(f.value)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time picker (for daily/weekly/monthly) */}
              {frequency !== "hourly" && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">At time</label>
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none"
                      value={hourOfDay}
                      onChange={(e) => setHourOfDay(Number(e.target.value))}
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {pad(i)}
                        </option>
                      ))}
                    </select>
                    <span className="text-muted-foreground">:</span>
                    <select
                      className="rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none"
                      value={minuteOfHour}
                      onChange={(e) => setMinuteOfHour(Number(e.target.value))}
                    >
                      {[0, 15, 30, 45].map((m) => (
                        <option key={m} value={m}>
                          {pad(m)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Minute (for hourly) */}
              {frequency === "hourly" && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">At minute</label>
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none"
                    value={minuteOfHour}
                    onChange={(e) => setMinuteOfHour(Number(e.target.value))}
                  >
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                      <option key={m} value={m}>
                        :{pad(m)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Day of week (for weekly) */}
              {frequency === "weekly" && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Day</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map((d) => (
                      <button
                        key={d.value}
                        className={cn(
                          "px-2 py-1 rounded-md text-xs border transition-colors",
                          dayOfWeek === d.value
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border text-muted-foreground hover:bg-accent/50",
                        )}
                        onClick={() => setDayOfWeek(d.value)}
                      >
                        {d.label.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Day of month (for monthly) */}
              {frequency === "monthly" && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Day of month</label>
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Start/End dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Start date (optional)</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">End date (optional)</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0">
          <div className="text-xs text-muted-foreground">
            {scheduleType === "once" && runAt && (
              <span>Will run at {new Date(runAt).toLocaleString()}</span>
            )}
            {scheduleType === "recurring" && (
              <span>
                {frequency === "hourly" && `Every hour at :${pad(minuteOfHour)}`}
                {frequency === "daily" && `Daily at ${pad(hourOfDay)}:${pad(minuteOfHour)}`}
                {frequency === "weekly" && `Every ${DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label} at ${pad(hourOfDay)}:${pad(minuteOfHour)}`}
                {frequency === "monthly" && `Monthly on day ${dayOfMonth} at ${pad(hourOfDay)}:${pad(minuteOfHour)}`}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={closeNewSchedule}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => createSchedule.mutate()}
              disabled={!canSubmit || createSchedule.isPending}
            >
              {createSchedule.isPending ? "Creating..." : "Create Schedule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
