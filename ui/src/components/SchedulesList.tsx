import { useMutation, useQueryClient } from "@tanstack/react-query";
import { schedulesApi } from "../api/schedules";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  Clock,
  Repeat,
  Pause,
  Play,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "../lib/utils";
import type { IssueSchedule } from "@paperclipai/shared";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function frequencyLabel(schedule: IssueSchedule): string {
  if (schedule.scheduleType === "once") {
    return schedule.runAt ? `Once at ${new Date(schedule.runAt).toLocaleString()}` : "Once";
  }
  const hour = pad(schedule.hourOfDay ?? 0);
  const minute = pad(schedule.minuteOfHour ?? 0);
  switch (schedule.frequency) {
    case "hourly":
      return `Hourly at :${minute}`;
    case "daily":
      return `Daily at ${hour}:${minute}`;
    case "weekly": {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return `Weekly on ${days[schedule.dayOfWeek ?? 0]} at ${hour}:${minute}`;
    }
    case "monthly":
      return `Monthly on day ${schedule.dayOfMonth ?? 1} at ${hour}:${minute}`;
    default:
      return "Recurring";
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-600 dark:text-green-400">
          <Play className="h-3 w-3" /> Active
        </span>
      );
    case "paused":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">
          <Pause className="h-3 w-3" /> Paused
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400">
          <CheckCircle2 className="h-3 w-3" /> Completed
        </span>
      );
    case "expired":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          <AlertCircle className="h-3 w-3" /> Expired
        </span>
      );
    default:
      return null;
  }
}

interface SchedulesListProps {
  schedules: IssueSchedule[];
  isLoading?: boolean;
}

export function SchedulesList({ schedules, isLoading }: SchedulesListProps) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const pauseMutation = useMutation({
    mutationFn: (id: string) => schedulesApi.pause(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issueSchedules.list(selectedCompanyId!) });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => schedulesApi.resume(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issueSchedules.list(selectedCompanyId!) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => schedulesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issueSchedules.list(selectedCompanyId!) });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Loading schedules...
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarClock className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground mb-1">No scheduled tasks yet</p>
        <p className="text-xs text-muted-foreground/60">
          Create a schedule to automatically create tasks at specific times
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {schedules.map((schedule) => (
        <div
          key={schedule.id}
          className={cn(
            "flex items-center gap-4 px-4 py-3 hover:bg-accent/30 transition-colors",
            schedule.status === "completed" || schedule.status === "expired"
              ? "opacity-60"
              : "",
          )}
        >
          {/* Icon */}
          <div className="shrink-0">
            {schedule.scheduleType === "once" ? (
              <Clock className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Repeat className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-medium truncate">
                {schedule.templateIssue?.title ?? "Untitled"}
              </span>
              {statusBadge(schedule.status)}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{frequencyLabel(schedule)}</span>
              {schedule.nextRunAt && schedule.status === "active" && (
                <span>Next: {new Date(schedule.nextRunAt).toLocaleString()}</span>
              )}
              {schedule.lastRunAt && (
                <span>Last: {new Date(schedule.lastRunAt).toLocaleString()}</span>
              )}
              {schedule.runCount > 0 && (
                <span>{schedule.runCount} run{schedule.runCount !== 1 ? "s" : ""}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {schedule.status === "active" && (
              <Button
                variant="ghost"
                size="icon-xs"
                title="Pause"
                onClick={() => pauseMutation.mutate(schedule.id)}
                disabled={pauseMutation.isPending}
              >
                <Pause className="h-3.5 w-3.5" />
              </Button>
            )}
            {schedule.status === "paused" && (
              <Button
                variant="ghost"
                size="icon-xs"
                title="Resume"
                onClick={() => resumeMutation.mutate(schedule.id)}
                disabled={resumeMutation.isPending}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              title="Delete"
              className="text-destructive/70 hover:text-destructive"
              onClick={() => {
                if (confirm("Delete this schedule? This cannot be undone.")) {
                  deleteMutation.mutate(schedule.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
