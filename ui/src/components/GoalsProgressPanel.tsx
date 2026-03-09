import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { goalsApi } from "../api/goals";
import { issuesApi } from "../api/issues";
import { queryKeys } from "../lib/queryKeys";
import { StatusIcon } from "./StatusIcon";
import { Target, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useState } from "react";
import type { Goal } from "@paperclipai/shared";

interface GoalsProgressPanelProps {
  companyId: string;
}

function ProgressRing({ percent, size = 28 }: { percent: number; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (percent / 100);
  const color =
    percent === 100
      ? "var(--color-success, #22c55e)"
      : percent > 0
        ? "var(--color-primary, #6366f1)"
        : "var(--muted-foreground, #888)";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        className="text-border"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
    </svg>
  );
}

function GoalRow({ goal, companyId }: { goal: Goal; companyId: string }) {
  const [open, setOpen] = useState(false);

  const { data: issues, isLoading } = useQuery({
    queryKey: [...queryKeys.issues.list(companyId), "goal", goal.id],
    queryFn: () => issuesApi.list(companyId, { goalId: goal.id } as Record<string, string>),
    enabled: open,
  });

  const doneCount = (issues ?? []).filter((i) => i.status === "done" || i.status === "cancelled").length;
  const totalCount = (issues ?? []).length;
  const percent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const statusColor =
    goal.status === "achieved"
      ? "text-emerald-500"
      : goal.status === "active"
        ? "text-primary"
        : "text-muted-foreground";

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-accent/30 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <ProgressRing percent={percent} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{goal.title}</p>
          <p className={cn("text-xs", statusColor)}>
            {totalCount === 0 && !open
              ? "No issues — click to expand"
              : `${doneCount}/${totalCount} done`}
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border">
          {isLoading ? (
            <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </div>
          ) : (issues ?? []).length === 0 ? (
            <p className="px-4 py-2 text-xs text-muted-foreground">No issues linked to this goal yet.</p>
          ) : (
            (issues ?? []).map((issue) => (
              <Link
                key={issue.id}
                to={`/issues/${issue.identifier ?? issue.id}`}
                className="flex items-center gap-2.5 px-4 py-2 text-xs hover:bg-accent/30 transition-colors no-underline text-inherit"
              >
                <StatusIcon status={issue.status} />
                <span className="truncate flex-1">{issue.title}</span>
                {issue.identifier && (
                  <span className="text-muted-foreground shrink-0 font-mono">{issue.identifier}</span>
                )}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function GoalsProgressPanel({ companyId }: GoalsProgressPanelProps) {
  const { data: goals, isLoading } = useQuery({
    queryKey: queryKeys.goals.list(companyId),
    queryFn: () => goalsApi.list(companyId),
    enabled: !!companyId,
    refetchInterval: 15_000,
  });

  const activeGoals = (goals ?? []).filter((g) => g.status !== "achieved" && g.status !== "cancelled");
  const doneGoals = (goals ?? []).filter((g) => g.status === "achieved" || g.status === "cancelled");

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading goals…
      </div>
    );
  }

  if (!goals || goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
        <Target className="h-6 w-6 mb-2 opacity-40" />
        <p className="text-sm">No goals yet.</p>
        <p className="text-xs">Goals drive your company's direction.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activeGoals.map((goal) => (
        <GoalRow key={goal.id} goal={goal} companyId={companyId} />
      ))}
      {doneGoals.length > 0 && activeGoals.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1 px-1">+ {doneGoals.length} completed goal{doneGoals.length !== 1 ? "s" : ""}</p>
      )}
      {doneGoals.length > 0 && activeGoals.length === 0 && (
        <>
          {doneGoals.map((goal) => (
            <GoalRow key={goal.id} goal={goal} companyId={companyId} />
          ))}
        </>
      )}
    </div>
  );
}
