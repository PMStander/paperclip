import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BranchExperiment, ExperimentCampaign, ExperimentVariant } from "@paperclipai/shared";
import { experimentsApi, type PolicyPackDetail } from "@/api/experiments";
import { solosApi } from "@/api/solos";
import { schedulesApi } from "@/api/schedules";
import { projectsApi } from "@/api/projects";
import { issuesApi } from "@/api/issues";
import { useCompany } from "@/context/CompanyContext";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useToast } from "@/context/ToastContext";
import { queryKeys } from "@/lib/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/EmptyState";
import { Beaker, Bot, GitBranch, Play, Plus, ShieldCheck, Sparkles } from "lucide-react";

type DashboardTab = "campaigns" | "policies" | "branches";

const CAMPAIGN_PHASES = [
  { value: "shadow_replay", label: "Shadow replay" },
  { value: "population", label: "Population" },
  { value: "policy", label: "Policy" },
  { value: "branch", label: "Branch" },
] as const;

const SUBJECT_TYPES = [
  { value: "company", label: "Company" },
  { value: "project", label: "Project" },
  { value: "agent", label: "Agent" },
  { value: "solo_instance", label: "Solo instance" },
  { value: "issue_schedule", label: "Issue schedule" },
  { value: "project_workspace", label: "Project workspace" },
] as const;

const POLICY_TARGET_TYPES = [
  { value: "company", label: "Company" },
  { value: "project", label: "Project" },
  { value: "solo_instance", label: "Solo instance" },
  { value: "issue_schedule", label: "Issue schedule" },
] as const;

function JsonEditor({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "{}"}
        className="min-h-28 font-mono text-xs"
      />
    </div>
  );
}

function parseJsonInput(raw: string, pushToast: ReturnType<typeof useToast>["pushToast"], label: string) {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON object`);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    pushToast({
      title: `Invalid ${label}`,
      body: error instanceof Error ? error.message : `Could not parse ${label}`,
      tone: "error",
    });
    return null;
  }
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  const isNeutral = value === "draft" || value === "paused";
  const isSuccess = value === "active" || value === "promoted";
  
  return (
    <Badge 
      variant={isSuccess ? "default" : isNeutral ? "secondary" : "outline"} 
      className={`text-[10px] uppercase tracking-wider font-semibold ${
        value === "pending_approval" || value === "shadow_replay" || value === "population"
          ? "border-amber-500/50 text-amber-600 dark:text-amber-400"
          : ""
      }`}
    >
      {value.replaceAll("_", " ")}
    </Badge>
  );
}

function SubjectIdSelect({
  subjectType,
  subjectId,
  onChange,
  projectOptions,
  soloOptions,
  scheduleOptions,
}: {
  subjectType: string;
  subjectId: string;
  onChange: (value: string) => void;
  projectOptions: Array<{ id: string; label: string }>;
  soloOptions: Array<{ id: string; label: string }>;
  scheduleOptions: Array<{ id: string; label: string }>;
}) {
  const options = subjectType === "project"
    ? projectOptions
    : subjectType === "solo_instance"
      ? soloOptions
      : subjectType === "issue_schedule"
        ? scheduleOptions
        : [];

  if (options.length === 0 && subjectType !== "company") {
    return (
      <div className="grid gap-2">
        <Label>Subject ID</Label>
        <Input value={subjectId} onChange={(e) => onChange(e.target.value)} placeholder="UUID" />
      </div>
    );
  }

  if (subjectType === "company") return null;

  return (
    <div className="grid gap-2">
      <Label>Subject</Label>
      <Select value={subjectId} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select subject" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function Experiments() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<DashboardTab>("campaigns");

  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [variantDialogCampaignId, setVariantDialogCampaignId] = useState<string | null>(null);
  const [suiteDialogCampaignId, setSuiteDialogCampaignId] = useState<string | null>(null);
  const [policyPackDialogOpen, setPolicyPackDialogOpen] = useState(false);
  const [policyVersionDialogPackId, setPolicyVersionDialogPackId] = useState<string | null>(null);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);

  useEffect(() => {
    setBreadcrumbs([{ label: "Experiments" }]);
  }, [setBreadcrumbs]);

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: queryKeys.experiments.campaigns(selectedCompanyId ?? ""),
    queryFn: () => experimentsApi.listCampaigns(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: policyPacks = [], isLoading: policiesLoading } = useQuery({
    queryKey: queryKeys.experiments.policyPacks(selectedCompanyId ?? ""),
    queryFn: () => experimentsApi.listPolicyPacks(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: branchExperiments = [], isLoading: branchesLoading } = useQuery({
    queryKey: queryKeys.experiments.branchExperiments(selectedCompanyId ?? ""),
    queryFn: () => experimentsApi.listBranchExperiments(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: soloInstances = [] } = useQuery({
    queryKey: queryKeys.solos.instances(selectedCompanyId ?? ""),
    queryFn: () => solosApi.listInstances(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: queryKeys.issueSchedules.list(selectedCompanyId ?? ""),
    queryFn: () => schedulesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId ?? ""),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: issues = [] } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId ?? ""),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const campaignExtras = useQueries({
    queries: campaigns.map((campaign) => ({
      queryKey: [queryKeys.experiments.variants(campaign.id), queryKeys.experiments.suites(campaign.id), queryKeys.experiments.assignments(campaign.id)],
      queryFn: async () => {
        const [variants, suites, assignments] = await Promise.all([
          experimentsApi.listVariants(campaign.id),
          experimentsApi.listEvaluationSuites(campaign.id),
          experimentsApi.listAssignments(campaign.id),
        ]);
        return { variants, suites, assignments };
      },
      enabled: !!selectedCompanyId,
    })),
  });

  const suiteRunsQueries = useQueries({
    queries: campaignExtras.flatMap((extra) => (extra.data?.suites ?? []).map((suite) => ({
      queryKey: queryKeys.experiments.runs(suite.id),
      queryFn: () => experimentsApi.listEvaluationRuns(suite.id),
      enabled: !!selectedCompanyId,
    }))),
  });

  const policyPackDetails = useQueries({
    queries: policyPacks.map((policyPack) => ({
      queryKey: queryKeys.experiments.policyPack(policyPack.id),
      queryFn: () => experimentsApi.getPolicyPack(policyPack.id),
      enabled: !!selectedCompanyId,
    })),
  });

  const suiteRunsById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof experimentsApi.listEvaluationRuns> extends Promise<infer T> ? T : never>();
    for (const result of suiteRunsQueries) {
      const runs = result.data;
      if (!runs || runs.length === 0) continue;
      const suiteId = runs[0]?.suiteId;
      if (suiteId) map.set(suiteId, runs);
    }
    return map;
  }, [suiteRunsQueries]);

  const projectOptions = useMemo(() => projects.map((project) => ({ id: project.id, label: project.name })), [projects]);
  const soloOptions = useMemo(() => soloInstances.map((solo) => ({ id: solo.id, label: `${solo.agentName} · ${solo.soloId}` })), [soloInstances]);
  const scheduleOptions = useMemo(() => schedules.map((schedule) => ({ id: schedule.id, label: `${schedule.scheduleType} · ${schedule.templateIssueId}` })), [schedules]);
  const workspaceOptions = useMemo(
    () => projects.flatMap((project) => project.workspaces.map((workspace) => ({ id: workspace.id, label: `${project.name} · ${workspace.name}` }))),
    [projects],
  );

  const refreshExperiments = () => {
    if (!selectedCompanyId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.experiments.campaigns(selectedCompanyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.experiments.policyPacks(selectedCompanyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.experiments.branchExperiments(selectedCompanyId) });
  };

  const updateCampaignMutation = useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: string; data: Record<string, unknown> }) => experimentsApi.updateCampaign(campaignId, data),
    onSuccess: refreshExperiments,
  });
  const updateVariantMutation = useMutation({
    mutationFn: ({ variantId, data }: { variantId: string; data: Record<string, unknown> }) => experimentsApi.updateVariant(variantId, data),
    onSuccess: refreshExperiments,
  });
  const runSuiteMutation = useMutation({
    mutationFn: (suiteId: string) => experimentsApi.runEvaluationSuite(suiteId, {}),
    onSuccess: (_, suiteId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.experiments.runs(suiteId) });
      pushToast({ title: "Replay queued", body: "Evaluation runs were created for this suite.", tone: "success" });
    },
  });
  const requestVariantPromotionMutation = useMutation({
    mutationFn: (variantId: string) => experimentsApi.requestVariantPromotion(variantId),
    onSuccess: (result) => {
      refreshExperiments();
      pushToast({ title: "Approval requested", body: result.approvalId ? `Approval ${result.approvalId} is pending board review.` : "Promotion request created.", tone: "success" });
    },
  });
  const promoteVariantMutation = useMutation({
    mutationFn: (variantId: string) => experimentsApi.promoteVariant(variantId),
    onSuccess: () => {
      refreshExperiments();
      pushToast({ title: "Variant promoted", body: "This variant is now the campaign winner.", tone: "success" });
    },
  });
  const requestRolloutMutation = useMutation({
    mutationFn: ({ policyVersionId, requestApproval }: { policyVersionId: string; requestApproval: boolean }) => experimentsApi.requestPolicyRollout(policyVersionId, { requestApproval }),
    onSuccess: (result, vars) => {
      if (selectedCompanyId) queryClient.invalidateQueries({ queryKey: queryKeys.experiments.policyPacks(selectedCompanyId) });
      if (vars.policyVersionId) refreshExperiments();
      pushToast({ title: "Rollout requested", body: result.approvalId ? `Approval ${result.approvalId} created.` : "Rollout is approved and ready.", tone: "success" });
    },
  });
  const activateRolloutMutation = useMutation({
    mutationFn: (rolloutId: string) => experimentsApi.activatePolicyRollout(rolloutId),
    onSuccess: () => {
      refreshExperiments();
      pushToast({ title: "Rollout activated", body: "The policy rollout is now active.", tone: "success" });
    },
  });
  const requestBranchPromotionMutation = useMutation({
    mutationFn: (branchExperimentId: string) => experimentsApi.requestBranchPromotion(branchExperimentId),
    onSuccess: () => {
      refreshExperiments();
      pushToast({ title: "Branch promotion requested", body: "Board approval was requested for this branch experiment.", tone: "success" });
    },
  });
  const promoteBranchMutation = useMutation({
    mutationFn: (branchExperimentId: string) => experimentsApi.promoteBranchExperiment(branchExperimentId),
    onSuccess: () => {
      refreshExperiments();
      pushToast({ title: "Branch experiment promoted", body: "The branch experiment was marked promoted.", tone: "success" });
    },
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={Beaker} message="Select a company to view experiments." />;
  }

  const summaryCounts = {
    campaigns: campaigns.length,
    activePopulation: campaigns.filter((campaign) => campaign.phase === "population" && campaign.status === "active").length,
    pendingPolicyApprovals: policyPackDetails.flatMap((result) => result.data?.rollouts ?? []).filter((rollout) => rollout.status === "pending_approval").length,
    branchExperiments: branchExperiments.length,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0 gap-3">
        <div>
          <h1 className="text-base font-semibold text-foreground">Experiments</h1>
          <p className="text-xs text-muted-foreground">Replay, route, govern, and promote Paperclip improvements.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setCampaignDialogOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Campaign</Button>
          <Button size="sm" variant="outline" onClick={() => setPolicyPackDialogOpen(true)}><ShieldCheck className="mr-1.5 h-3.5 w-3.5" />Policy pack</Button>
          <Button size="sm" variant="outline" onClick={() => setBranchDialogOpen(true)}><GitBranch className="mr-1.5 h-3.5 w-3.5" />Branch lab</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryCard icon={Sparkles} label="Campaigns" value={summaryCounts.campaigns} sublabel="Total experiment programs" />
          <SummaryCard icon={Play} label="Active population" value={summaryCounts.activePopulation} sublabel="Auto-routing now live" />
          <SummaryCard icon={ShieldCheck} label="Pending policy approvals" value={summaryCounts.pendingPolicyApprovals} sublabel="Waiting for board approval" />
          <SummaryCard icon={GitBranch} label="Branch lab plans" value={summaryCounts.branchExperiments} sublabel="Isolated code experiments" />
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as DashboardTab)}>
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="branches">Branch lab</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "campaigns" && (
          <div className="grid gap-4 xl:grid-cols-2">
            {campaignsLoading && <Card><CardContent className="pt-6 text-sm text-muted-foreground">Loading campaigns…</CardContent></Card>}
            {!campaignsLoading && campaigns.length === 0 && <Card><CardContent className="pt-6 text-sm text-muted-foreground">No campaigns yet. Create one to start replay or live routing.</CardContent></Card>}
            {campaigns.map((campaign, index) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                details={campaignExtras[index]?.data ?? { variants: [], suites: [], assignments: [] }}
                suiteRunsById={suiteRunsById}
                onActivate={() => updateCampaignMutation.mutate({ campaignId: campaign.id, data: { status: "active" } })}
                onPause={() => updateCampaignMutation.mutate({ campaignId: campaign.id, data: { status: "paused" } })}
                onCreateVariant={() => setVariantDialogCampaignId(campaign.id)}
                onCreateSuite={() => setSuiteDialogCampaignId(campaign.id)}
                onRunSuite={(suiteId) => runSuiteMutation.mutate(suiteId)}
                onRequestVariantPromotion={(variantId) => requestVariantPromotionMutation.mutate(variantId)}
                onPromoteVariant={(variantId) => promoteVariantMutation.mutate(variantId)}
                onVariantStatusChange={(variantId, status) => updateVariantMutation.mutate({ variantId, data: { status } })}
              />
            ))}
          </div>
        )}

        {tab === "policies" && (
          <div className="grid gap-4 xl:grid-cols-2">
            {policiesLoading && <Card><CardContent className="pt-6 text-sm text-muted-foreground">Loading policy packs…</CardContent></Card>}
            {!policiesLoading && policyPacks.length === 0 && <Card><CardContent className="pt-6 text-sm text-muted-foreground">No policy packs yet. Create one to stage or roll out operating rules.</CardContent></Card>}
            {policyPacks.map((policyPack, index) => (
              <PolicyPackCard
                key={policyPack.id}
                detail={policyPackDetails[index]?.data ?? { ...policyPack, versions: [], rollouts: [] }}
                onCreateVersion={() => setPolicyVersionDialogPackId(policyPack.id)}
                onRequestRollout={(policyVersionId) => requestRolloutMutation.mutate({ policyVersionId, requestApproval: true })}
                onActivateRollout={(rolloutId) => activateRolloutMutation.mutate(rolloutId)}
              />
            ))}
          </div>
        )}

        {tab === "branches" && (
          <div className="grid gap-4 xl:grid-cols-2">
            {branchesLoading && <Card><CardContent className="pt-6 text-sm text-muted-foreground">Loading branch experiments…</CardContent></Card>}
            {!branchesLoading && branchExperiments.length === 0 && <Card><CardContent className="pt-6 text-sm text-muted-foreground">No branch experiments yet. Create one to plan a branch/worktree verification flow.</CardContent></Card>}
            {branchExperiments.map((branchExperiment) => (
              <BranchExperimentCard
                key={branchExperiment.id}
                branchExperiment={branchExperiment}
                onRequestPromotion={() => requestBranchPromotionMutation.mutate(branchExperiment.id)}
                onPromote={() => promoteBranchMutation.mutate(branchExperiment.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateCampaignDialog
        open={campaignDialogOpen}
        onOpenChange={setCampaignDialogOpen}
        companyId={selectedCompanyId}
        projectOptions={projectOptions}
        soloOptions={soloOptions}
        scheduleOptions={scheduleOptions}
        pushToast={pushToast}
        onCreated={() => {
          refreshExperiments();
          setCampaignDialogOpen(false);
        }}
      />
      <CreateVariantDialog
        open={!!variantDialogCampaignId}
        onOpenChange={(open) => !open && setVariantDialogCampaignId(null)}
        campaignId={variantDialogCampaignId}
        pushToast={pushToast}
        onCreated={() => {
          refreshExperiments();
          setVariantDialogCampaignId(null);
        }}
      />
      <CreateSuiteDialog
        open={!!suiteDialogCampaignId}
        onOpenChange={(open) => !open && setSuiteDialogCampaignId(null)}
        campaignId={suiteDialogCampaignId}
        pushToast={pushToast}
        onCreated={() => {
          refreshExperiments();
          setSuiteDialogCampaignId(null);
        }}
      />
      <CreatePolicyPackDialog
        open={policyPackDialogOpen}
        onOpenChange={setPolicyPackDialogOpen}
        companyId={selectedCompanyId}
        projectOptions={projectOptions}
        soloOptions={soloOptions}
        scheduleOptions={scheduleOptions}
        pushToast={pushToast}
        onCreated={() => {
          refreshExperiments();
          setPolicyPackDialogOpen(false);
        }}
      />
      <CreatePolicyVersionDialog
        open={!!policyVersionDialogPackId}
        onOpenChange={(open) => !open && setPolicyVersionDialogPackId(null)}
        policyPackId={policyVersionDialogPackId}
        pushToast={pushToast}
        onCreated={() => {
          refreshExperiments();
          setPolicyVersionDialogPackId(null);
        }}
      />
      <CreateBranchExperimentDialog
        open={branchDialogOpen}
        onOpenChange={setBranchDialogOpen}
        companyId={selectedCompanyId}
        projectOptions={projectOptions}
        workspaceOptions={workspaceOptions}
        issueOptions={issues.map((issue) => ({ id: issue.id, label: `${issue.identifier ?? issue.id} · ${issue.title}` }))}
        pushToast={pushToast}
        onCreated={() => {
          refreshExperiments();
          setBranchDialogOpen(false);
        }}
      />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sublabel }: { icon: typeof Sparkles; label: string; value: number; sublabel: string }) {
  return (
    <Card className="transition-all hover:bg-muted/30">
      <CardContent className="flex items-start justify-between p-6">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{sublabel}</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function CampaignCard({
  campaign,
  details,
  suiteRunsById,
  onActivate,
  onPause,
  onCreateVariant,
  onCreateSuite,
  onRunSuite,
  onRequestVariantPromotion,
  onPromoteVariant,
  onVariantStatusChange,
}: {
  campaign: ExperimentCampaign;
  details: { variants: ExperimentVariant[]; suites: Array<{ id: string; name: string; mode: string; sourceType: string; status: string }>; assignments: Array<{ id: string }> };
  suiteRunsById: Map<string, Array<{ id: string; status: string }>>;
  onActivate: () => void;
  onPause: () => void;
  onCreateVariant: () => void;
  onCreateSuite: () => void;
  onRunSuite: (suiteId: string) => void;
  onRequestVariantPromotion: (variantId: string) => void;
  onPromoteVariant: (variantId: string) => void;
  onVariantStatusChange: (variantId: string, status: string) => void;
}) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 line-clamp-2">
            <CardTitle className="text-lg font-semibold">{campaign.name}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">{campaign.objective ?? "No objective set."}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex flex-wrap gap-1.5 justify-end">
              <StatusBadge value={campaign.phase} />
              <StatusBadge value={campaign.status} />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col space-y-6 pt-6">
        <div className="flex flex-wrap gap-2">
          {campaign.status === "active" ? (
            <Button size="sm" variant="secondary" onClick={onPause}>Pause campaign</Button>
          ) : (
            <Button size="sm" variant="default" onClick={onActivate}>Activate campaign</Button>
          )}
          <Button size="sm" variant="outline" onClick={onCreateVariant}>Add variant</Button>
          <Button size="sm" variant="outline" onClick={onCreateSuite}>Add suite</Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 flex-1">
          <div className="flex flex-col space-y-3">
            <h4 className="text-sm font-semibold text-foreground tracking-tight">Variants</h4>
            <div className="flex-1 space-y-2">
              {details.variants.length === 0 && <p className="text-sm text-muted-foreground py-2 italic">No variants yet.</p>}
              {details.variants.map((variant) => (
                <div key={variant.id} className="group rounded-lg border border-border bg-card p-3 text-sm transition-all hover:border-primary/20 hover:bg-muted/30 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{variant.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{variant.role} · {variant.trafficPercent}% traffic</p>
                    </div>
                    <StatusBadge value={variant.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border/50">
                    {variant.status !== "active" && variant.status !== "promoted" && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onVariantStatusChange(variant.id, "active")}>Enable</Button>
                    )}
                    {variant.status === "active" && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onVariantStatusChange(variant.id, "paused")}>Pause</Button>
                    )}
                    {variant.role === "challenger" && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onRequestVariantPromotion(variant.id)}>Request promotion</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onPromoteVariant(variant.id)}>Promote</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col space-y-3">
            <h4 className="text-sm font-semibold text-foreground tracking-tight">Evaluation suites</h4>
            <div className="flex-1 space-y-2">
              {details.suites.length === 0 && <p className="text-sm text-muted-foreground py-2 italic">No evaluation suites yet.</p>}
              {details.suites.map((suite) => (
                <div key={suite.id} className="group rounded-lg border border-border bg-card p-3 text-sm transition-all hover:border-primary/20 hover:bg-muted/30 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{suite.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{suite.mode} · {suite.sourceType}</p>
                    </div>
                    <StatusBadge value={suite.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {suiteRunsById.get(suite.id)?.length ?? 0} runs
                    </span>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onRunSuite(suite.id)}>
                      <Play className="mr-1.5 h-3 w-3" /> Run replay
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs font-medium text-muted-foreground bg-muted/50 py-2.5 px-3 rounded-md flex items-center justify-between gap-2">
          <span>Assignments recorded</span>
          <span className="text-foreground tracking-wider font-mono">{details.assignments.length}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function PolicyPackCard({
  detail,
  onCreateVersion,
  onRequestRollout,
  onActivateRollout,
}: {
  detail: PolicyPackDetail;
  onCreateVersion: () => void;
  onRequestRollout: (policyVersionId: string) => void;
  onActivateRollout: (rolloutId: string) => void;
}) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="text-lg font-semibold">{detail.name}</CardTitle>
            <CardDescription className="text-sm">Target: <span className="font-medium text-foreground">{detail.targetType}</span>{detail.targetId ? ` · ${detail.targetId}` : ""}</CardDescription>
          </div>
          <StatusBadge value={detail.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col space-y-6 pt-6">
        <div>
          <Button size="sm" variant="outline" onClick={onCreateVersion}>Add version</Button>
        </div>
        
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground tracking-tight">Versions</h4>
          <div className="space-y-2">
            {detail.versions.length === 0 && <p className="text-sm text-muted-foreground py-2 italic">No policy versions yet.</p>}
            {detail.versions.map((version) => (
              <div key={version.id} className="group rounded-lg border border-border bg-card p-3 text-sm transition-all hover:border-primary/20 hover:bg-muted/30 hover:shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-foreground">Version {version.sequence}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{version.summary ?? "No summary"}</p>
                  </div>
                  <StatusBadge value={version.status} />
                </div>
                <div className="pt-1 border-t border-border/50 flex justify-end">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onRequestRollout(version.id)}>Request rollout</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-3 flex-1">
          <h4 className="text-sm font-semibold text-foreground tracking-tight">Rollouts</h4>
          <div className="space-y-2">
            {detail.rollouts.length === 0 && <p className="text-sm text-muted-foreground py-2 italic">No rollouts requested yet.</p>}
            {detail.rollouts.map((rollout) => (
              <div key={rollout.id} className="group rounded-lg border border-border bg-card p-3 text-sm flex items-center justify-between gap-3 transition-all hover:bg-muted/30 hover:shadow-sm">
                <div>
                  <p className="font-semibold text-foreground font-mono text-xs">{rollout.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Version {detail.versions.find((version) => version.id === rollout.policyVersionId)?.sequence ?? "?"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={rollout.status} />
                  {rollout.status !== "active" && <Button size="sm" variant="secondary" className="h-7 px-3 text-xs" onClick={() => onActivateRollout(rollout.id)}>Activate</Button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BranchExperimentCard({
  branchExperiment,
  onRequestPromotion,
  onPromote,
}: {
  branchExperiment: BranchExperiment;
  onRequestPromotion: () => void;
  onPromote: () => void;
}) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 line-clamp-2">
            <CardTitle className="text-lg font-semibold font-mono tracking-tight">{branchExperiment.branchName}</CardTitle>
            <CardDescription className="text-sm">Project <span className="font-medium text-foreground">{branchExperiment.projectId}</span>{branchExperiment.workspaceId ? ` · workspace ${branchExperiment.workspaceId}` : ""}</CardDescription>
          </div>
          <StatusBadge value={branchExperiment.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-6 flex flex-1 flex-col">
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-4 border border-border/50">
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">Base ref</p>
            <p className="text-sm font-medium text-foreground truncate" title={branchExperiment.baseRef ?? "Not set"}>{branchExperiment.baseRef ?? "Not set"}</p>
          </div>
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">Worktree path</p>
            <p className="text-sm font-medium text-foreground break-all" title={branchExperiment.worktreePath ?? "Not planned"}>{branchExperiment.worktreePath ?? "Not planned"}</p>
          </div>
        </div>
        
        <div className="space-y-2 flex-1">
          <p className="text-sm font-semibold text-foreground tracking-tight">Validator commands</p>
          <div className="rounded-md bg-muted p-3 border border-border/50 shadow-inner overflow-x-auto">
            <pre className="text-xs font-mono text-foreground space-y-1.5">
              {branchExperiment.validatorCommands.map((command, idx) => (
                <div key={idx} className="flex gap-2.5">
                  <span className="text-muted-foreground/60 select-none">$</span>
                  <span className="break-all whitespace-pre-wrap">{command}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 pt-2">
          {branchExperiment.status !== "pending_approval" && branchExperiment.status !== "promoted" && (
            <Button size="sm" variant="default" onClick={onRequestPromotion}>Request promotion</Button>
          )}
          {branchExperiment.status !== "promoted" && (
            <Button size="sm" variant="outline" onClick={onPromote}>Mark promoted</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateCampaignDialog({
  open,
  onOpenChange,
  companyId,
  projectOptions,
  soloOptions,
  scheduleOptions,
  pushToast,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  projectOptions: Array<{ id: string; label: string }>;
  soloOptions: Array<{ id: string; label: string }>;
  scheduleOptions: Array<{ id: string; label: string }>;
  pushToast: ReturnType<typeof useToast>["pushToast"];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<string>("shadow_replay");
  const [subjectType, setSubjectType] = useState<string>("company");
  const [subjectId, setSubjectId] = useState("");
  const [objective, setObjective] = useState("");
  const [safetyPolicyText, setSafetyPolicyText] = useState('{"budgetUsdCap": 25, "requiresApproval": true}');

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => experimentsApi.createCampaign(companyId, data),
    onSuccess: () => {
      setName("");
      setObjective("");
      setSubjectId("");
      onCreated();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New experiment campaign</DialogTitle>
          <DialogDescription>Define a replay, live-routing, policy, or branch experiment.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Phase</Label><Select value={phase} onValueChange={setPhase}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CAMPAIGN_PHASES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2"><Label>Subject type</Label><Select value={subjectType} onValueChange={setSubjectType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SUBJECT_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
          <SubjectIdSelect subjectType={subjectType} subjectId={subjectId} onChange={setSubjectId} projectOptions={projectOptions} soloOptions={soloOptions} scheduleOptions={scheduleOptions} />
          <div className="grid gap-2"><Label>Objective</Label><Textarea value={objective} onChange={(e) => setObjective(e.target.value)} className="min-h-24" /></div>
          <JsonEditor label="Safety policy JSON" value={safetyPolicyText} onChange={setSafetyPolicyText} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              const safetyPolicy = parseJsonInput(safetyPolicyText, pushToast, "safety policy");
              if (!safetyPolicy) return;
              mutation.mutate({
                name,
                phase,
                subjectType,
                subjectId: subjectType === "company" ? null : subjectId || null,
                objective,
                safetyPolicy,
              });
            }}
            disabled={mutation.isPending || name.trim().length === 0}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateVariantDialog({
  open,
  onOpenChange,
  campaignId,
  pushToast,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string | null;
  pushToast: ReturnType<typeof useToast>["pushToast"];
  onCreated: () => void;
}) {
  const [label, setLabel] = useState("");
  const [role, setRole] = useState<string>("challenger");
  const [trafficPercent, setTrafficPercent] = useState("10");
  const [promptAppend, setPromptAppend] = useState("");
  const [issuePatchText, setIssuePatchText] = useState("{}");
  const [adapterConfigText, setAdapterConfigText] = useState("{}");

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => experimentsApi.createVariant(campaignId!, data),
    onSuccess: () => {
      setLabel("");
      setPromptAppend("");
      onCreated();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New variant</DialogTitle>
          <DialogDescription>Create a baseline or challenger configuration for this campaign.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2"><Label>Label</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Role</Label><Select value={role} onValueChange={setRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="baseline">Baseline</SelectItem><SelectItem value="challenger">Challenger</SelectItem></SelectContent></Select></div>
          <div className="grid gap-2"><Label>Traffic %</Label><Input type="number" min={0} max={100} value={trafficPercent} onChange={(e) => setTrafficPercent(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Prompt append</Label><Input value={promptAppend} onChange={(e) => setPromptAppend(e.target.value)} placeholder="Optional extra system instructions" /></div>
          <JsonEditor label="Issue patch JSON" value={issuePatchText} onChange={setIssuePatchText} placeholder='{"titlePrefix":"[Experiment] "}' />
          <JsonEditor label="Adapter config JSON" value={adapterConfigText} onChange={setAdapterConfigText} placeholder='{"temperature":0.2}' />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={mutation.isPending || !campaignId || label.trim().length === 0}
            onClick={() => {
              const issuePatch = parseJsonInput(issuePatchText, pushToast, "issue patch");
              const adapterConfig = parseJsonInput(adapterConfigText, pushToast, "adapter config");
              if (!issuePatch || !adapterConfig) return;
              mutation.mutate({
                label,
                role,
                status: "draft",
                trafficPercent: Number(trafficPercent || 0),
                config: {
                  promptTemplateAppend: promptAppend || undefined,
                  issuePatch,
                  adapterConfig,
                },
              });
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateSuiteDialog({
  open,
  onOpenChange,
  campaignId,
  pushToast,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string | null;
  pushToast: ReturnType<typeof useToast>["pushToast"];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<string>("shadow");
  const [sourceType, setSourceType] = useState<string>("heartbeat_run");
  const [selectorText, setSelectorText] = useState('{"limit": 10}');
  const [judgeConfigText, setJudgeConfigText] = useState('{"scoreLabel":"heuristic"}');

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => experimentsApi.createEvaluationSuite(campaignId!, data),
    onSuccess: () => {
      setName("");
      onCreated();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New evaluation suite</DialogTitle>
          <DialogDescription>Define how this campaign should be replayed or scored.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Mode</Label><Select value={mode} onValueChange={setMode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="shadow">Shadow</SelectItem><SelectItem value="live">Live</SelectItem><SelectItem value="policy">Policy</SelectItem><SelectItem value="branch">Branch</SelectItem></SelectContent></Select></div>
          <div className="grid gap-2"><Label>Source type</Label><Select value={sourceType} onValueChange={setSourceType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="heartbeat_run">Heartbeat run</SelectItem><SelectItem value="issue">Issue</SelectItem><SelectItem value="schedule">Schedule</SelectItem><SelectItem value="workspace">Workspace</SelectItem></SelectContent></Select></div>
          <div />
          <JsonEditor label="Selector JSON" value={selectorText} onChange={setSelectorText} />
          <JsonEditor label="Judge config JSON" value={judgeConfigText} onChange={setJudgeConfigText} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={mutation.isPending || !campaignId || name.trim().length === 0}
            onClick={() => {
              const selector = parseJsonInput(selectorText, pushToast, "selector");
              const judgeConfig = parseJsonInput(judgeConfigText, pushToast, "judge config");
              if (!selector || !judgeConfig) return;
              mutation.mutate({ name, mode, sourceType, selector, judgeConfig, status: "draft" });
            }}
          >Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreatePolicyPackDialog({
  open,
  onOpenChange,
  companyId,
  projectOptions,
  soloOptions,
  scheduleOptions,
  pushToast,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  projectOptions: Array<{ id: string; label: string }>;
  soloOptions: Array<{ id: string; label: string }>;
  scheduleOptions: Array<{ id: string; label: string }>;
  pushToast: ReturnType<typeof useToast>["pushToast"];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [targetType, setTargetType] = useState<string>("solo_instance");
  const [targetId, setTargetId] = useState("");
  const [metadataText, setMetadataText] = useState("{}");

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => experimentsApi.createPolicyPack(companyId, data),
    onSuccess: () => {
      setName("");
      onCreated();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New policy pack</DialogTitle>
          <DialogDescription>Package a rolloutable operating policy for a company object.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Target type</Label><Select value={targetType} onValueChange={setTargetType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{POLICY_TARGET_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
          <SubjectIdSelect subjectType={targetType} subjectId={targetId} onChange={setTargetId} projectOptions={projectOptions} soloOptions={soloOptions} scheduleOptions={scheduleOptions} />
          <JsonEditor label="Metadata JSON" value={metadataText} onChange={setMetadataText} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={mutation.isPending || name.trim().length === 0}
            onClick={() => {
              const metadata = parseJsonInput(metadataText, pushToast, "metadata");
              if (!metadata) return;
              mutation.mutate({ name, targetType, targetId: targetType === "company" ? null : targetId || null, metadata });
            }}
          >Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreatePolicyVersionDialog({
  open,
  onOpenChange,
  policyPackId,
  pushToast,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyPackId: string | null;
  pushToast: ReturnType<typeof useToast>["pushToast"];
  onCreated: () => void;
}) {
  const [summary, setSummary] = useState("");
  const [configText, setConfigText] = useState('{"runSchedule":"hourly"}');

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => experimentsApi.createPolicyVersion(policyPackId!, data),
    onSuccess: () => {
      setSummary("");
      onCreated();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New policy version</DialogTitle>
          <DialogDescription>Define the configuration that should be approval-gated and rollable.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2"><Label>Summary</Label><Input value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
          <JsonEditor label="Policy config JSON" value={configText} onChange={setConfigText} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={mutation.isPending || !policyPackId}
            onClick={() => {
              const config = parseJsonInput(configText, pushToast, "policy config");
              if (!config) return;
              mutation.mutate({ summary, config });
            }}
          >Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateBranchExperimentDialog({
  open,
  onOpenChange,
  companyId,
  projectOptions,
  workspaceOptions,
  issueOptions,
  pushToast,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  projectOptions: Array<{ id: string; label: string }>;
  workspaceOptions: Array<{ id: string; label: string }>;
  issueOptions: Array<{ id: string; label: string }>;
  pushToast: ReturnType<typeof useToast>["pushToast"];
  onCreated: () => void;
}) {
  const [projectId, setProjectId] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [sourceIssueId, setSourceIssueId] = useState("");
  const [branchName, setBranchName] = useState("");
  const [baseRef, setBaseRef] = useState("");
  const [validatorCommandsText, setValidatorCommandsText] = useState("pnpm -r typecheck\npnpm test:run");

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => experimentsApi.createBranchExperiment(companyId, data),
    onSuccess: () => {
      setProjectId("");
      setWorkspaceId("");
      setSourceIssueId("");
      setBranchName("");
      setBaseRef("");
      onCreated();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New branch experiment</DialogTitle>
          <DialogDescription>Plan an isolated branch/worktree experiment with validator commands.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2"><Label>Project</Label><Select value={projectId} onValueChange={setProjectId}><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger><SelectContent>{projectOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2"><Label>Workspace</Label><Select value={workspaceId} onValueChange={setWorkspaceId}><SelectTrigger><SelectValue placeholder="Optional workspace" /></SelectTrigger><SelectContent>{workspaceOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2"><Label>Source issue</Label><Select value={sourceIssueId} onValueChange={setSourceIssueId}><SelectTrigger><SelectValue placeholder="Optional issue" /></SelectTrigger><SelectContent>{issueOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2"><Label>Branch name</Label><Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="Optional override" /></div>
          <div className="grid gap-2 md:col-span-2"><Label>Base ref</Label><Input value={baseRef} onChange={(e) => setBaseRef(e.target.value)} placeholder="main" /></div>
          <div className="grid gap-2 md:col-span-2"><Label>Validator commands</Label><Textarea value={validatorCommandsText} onChange={(e) => setValidatorCommandsText(e.target.value)} className="min-h-24 font-mono text-xs" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={mutation.isPending || projectId.length === 0}
            onClick={() => {
              const validatorCommands = validatorCommandsText.split("\n").map((line) => line.trim()).filter(Boolean);
              if (validatorCommands.length === 0) {
                pushToast({ title: "Validators required", body: "Please add at least one validator command.", tone: "error" });
                return;
              }
              mutation.mutate({
                projectId,
                workspaceId: workspaceId || null,
                sourceIssueId: sourceIssueId || null,
                branchName: branchName || undefined,
                baseRef: baseRef || null,
                validatorCommands,
              });
            }}
          >Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
