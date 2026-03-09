import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { heartbeatsApi } from "../api/heartbeats";
import { schedulesApi } from "../api/schedules";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useDialog } from "../context/DialogContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { IssuesList } from "../components/IssuesList";
import { SchedulesList } from "../components/SchedulesList";
import { NewScheduleDialog } from "../components/NewScheduleDialog";
import { CircleDot, CalendarClock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";

type Tab = "issues" | "schedules";

export function Issues() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { openNewSchedule } = useDialog();

  const [activeTab, setActiveTab] = useState<Tab>(
    searchParams.get("tab") === "schedules" ? "schedules" : "issues",
  );

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    if (tab === "schedules") {
      newParams.set("tab", "schedules");
    } else {
      newParams.delete("tab");
    }
    setSearchParams(newParams);
  };

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5000,
  });

  const liveIssueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const run of liveRuns ?? []) {
      if (run.issueId) ids.add(run.issueId);
    }
    return ids;
  }, [liveRuns]);

  useEffect(() => {
    setBreadcrumbs([{ label: "Issues" }]);
  }, [setBreadcrumbs]);

  const { data: issues, isLoading, error } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const {
    data: schedules,
    isLoading: schedulesLoading,
  } = useQuery({
    queryKey: queryKeys.issueSchedules.list(selectedCompanyId!),
    queryFn: () => schedulesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && activeTab === "schedules",
  });

  const updateIssue = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      issuesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId!) });
    },
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={CircleDot} message="Select a company to view issues." />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-border px-4 shrink-0">
        <div className="flex items-center gap-0">
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === "issues"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => handleTabChange("issues")}
          >
            <CircleDot className="h-4 w-4" />
            Issues
          </button>
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === "schedules"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => handleTabChange("schedules")}
          >
            <CalendarClock className="h-4 w-4" />
            Schedules
          </button>
        </div>
        {activeTab === "schedules" && (
          <Button
            size="sm"
            variant="default"
            className="gap-1.5"
            onClick={() => openNewSchedule()}
          >
            <Plus className="h-3.5 w-3.5" />
            New Schedule
          </Button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "issues" && (
          <IssuesList
            issues={issues ?? []}
            isLoading={isLoading}
            error={error as Error | null}
            agents={agents}
            liveIssueIds={liveIssueIds}
            viewStateKey="paperclip:issues-view"
            initialAssignees={
              searchParams.get("assignee") ? [searchParams.get("assignee")!] : undefined
            }
            onUpdateIssue={(id, data) => updateIssue.mutate({ id, data })}
          />
        )}
        {activeTab === "schedules" && (
          <SchedulesList
            schedules={schedules ?? []}
            isLoading={schedulesLoading}
          />
        )}
      </div>

      {/* Dialog */}
      <NewScheduleDialog />
    </div>
  );
}
