import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  Copy,
  ExternalLink,
  Loader2,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompany } from "@/context/CompanyContext";
import { solosApi, type SoloDefinition, type SoloSetting } from "@/api/solos";
import { agentsApi } from "@/api/agents";
import type { Agent } from "@paperclipai/shared";
import { AgentIcon } from "@/components/AgentIconPicker";
import { queryKeys } from "@/lib/queryKeys";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getOS(): "macos" | "windows" | "linux" {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "macos";
  if (ua.includes("win")) return "windows";
  return "linux";
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface SoloSetupWizardProps {
  solo: SoloDefinition;
  open: boolean;
  onClose: () => void;
  onActivated: () => void;
}

// ─── Step Definitions ───────────────────────────────────────────────────────

type StepId = "deps" | "agent" | "configure" | "review";

function getSteps(hasRequirements: boolean): StepId[] {
  if (hasRequirements) return ["deps", "agent", "configure", "review"];
  return ["agent", "configure", "review"];
}

const STEP_LABELS: Record<StepId, string> = {
  deps: "Dependencies",
  agent: "Agent",
  configure: "Configure",
  review: "Launch",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function SoloSetupWizard({ solo, open, onClose, onActivated }: SoloSetupWizardProps) {
  const { selectedCompanyId } = useCompany();
  const hasRequirements = (solo.requires?.length ?? 0) > 0;
  const steps = getSteps(hasRequirements);

  const [stepIdx, setStepIdx] = useState(0);
  const currentStep = steps[stepIdx]!;
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState(solo.name);
  const [runSchedule, setRunSchedule] = useState<"once" | "hourly" | "daily" | "weekly" | "manual">("manual");
  const [config, setConfig] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const s of solo.settings) {
      initial[s.key] = s.default;
    }
    return initial;
  });

  // Fetch agents for the company
  const { data: agents = [], isLoading: loadingAgents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );

  const activateMutation = useMutation({
    mutationFn: () =>
      solosApi.activate(selectedCompanyId!, solo.id, config, agentName, selectedAgentId ?? undefined, runSchedule),
    onSuccess: () => onActivated(),
  });

  const canProceed = currentStep !== "agent" || !!selectedAgentId;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none select-none">{solo.icon}</span>
            <div>
              <DialogTitle className="text-base">{solo.name}</DialogTitle>
              <DialogDescription className="text-xs">{solo.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-2">
          {steps.map((id, i) => {
            const isActive = i === stepIdx;
            const isDone = i < stepIdx;
            return (
              <div key={id} className="flex items-center gap-2">
                {i > 0 && <div className={`h-px w-6 ${isDone ? "bg-foreground/40" : "bg-border"}`} />}
                <div
                  className={`flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-semibold transition-colors ${
                    isActive
                      ? "bg-foreground text-background"
                      : isDone
                        ? "bg-foreground/20 text-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className={`text-xs ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {STEP_LABELS[id]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="py-2 min-h-[200px]">
          {currentStep === "deps" && solo.requires && (
            <DepsStep requirements={solo.requires} />
          )}

          {currentStep === "agent" && (
            <AgentStep
              agents={agents}
              loading={loadingAgents}
              selectedAgentId={selectedAgentId}
              onSelect={setSelectedAgentId}
            />
          )}

          {currentStep === "configure" && (
            <ConfigureStep
              settings={solo.settings}
              config={config}
              agentName={agentName}
              runSchedule={runSchedule}
              onConfigChange={(key, val) => setConfig((prev) => ({ ...prev, [key]: val }))}
              onAgentNameChange={setAgentName}
              onRunScheduleChange={setRunSchedule}
            />
          )}

          {currentStep === "review" && (
            <ReviewStep
              solo={solo}
              agentName={agentName}
              config={config}
              runSchedule={runSchedule}
              selectedAgent={selectedAgent}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (stepIdx <= 0 ? onClose() : setStepIdx(stepIdx - 1))}
            disabled={activateMutation.isPending}
          >
            {stepIdx <= 0 ? (
              <>
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </>
            ) : (
              <>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Back
              </>
            )}
          </Button>

          {stepIdx < steps.length - 1 ? (
            <Button size="sm" onClick={() => setStepIdx(stepIdx + 1)} disabled={!canProceed}>
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending || !selectedAgentId}
            >
              {activateMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1" />
              )}
              Activate Solo
            </Button>
          )}
        </div>

        {activateMutation.isError && (
          <p className="text-xs text-destructive-foreground mt-1">
            {(activateMutation.error as Error).message}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Step: Agent Selection ──────────────────────────────────────────────────

function AgentStep({
  agents,
  loading,
  selectedAgentId,
  onSelect,
}: {
  agents: Agent[];
  loading: boolean;
  selectedAgentId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg border border-border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Bot className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No agents found</p>
        <p className="text-xs mt-1">Create an agent first, then assign a solo to it.</p>
      </div>
    );
  }

  function formatTimeAgo(date: Date | string | null | undefined): string {
    if (!date) return "Never";
    const d = typeof date === "string" ? new Date(date) : date;
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  const STATUS_DOT: Record<string, string> = {
    idle: "bg-muted-foreground",
    active: "bg-emerald-400",
    error: "bg-red-400",
    disabled: "bg-muted-foreground/30",
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground mb-1">
        Select an agent to run this solo. The solo's tasks will be executed by this agent.
      </p>
      {agents.map((agent) => {
        const isSelected = agent.id === selectedAgentId;
        const budgetPct = agent.budgetMonthlyCents > 0
          ? Math.min(100, Math.round((agent.spentMonthlyCents / agent.budgetMonthlyCents) * 100))
          : 0;
        return (
          <button
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${
              isSelected
                ? "border-foreground/40 bg-accent ring-1 ring-foreground/20"
                : "border-border bg-card hover:border-muted-foreground/30 hover:bg-accent/30"
            }`}
          >
            {/* Icon */}
            <div className={`flex items-center justify-center h-10 w-10 rounded-lg shrink-0 transition-colors ${
              isSelected ? "bg-foreground/10" : "bg-muted"
            }`}>
              <AgentIcon icon={agent.icon} className="h-5 w-5 text-foreground/80" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">{agent.name}</span>
                <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[agent.status] ?? STATUS_DOT.idle}`} />
                <span className="text-[10px] text-muted-foreground capitalize">{agent.status}</span>
              </div>
              {agent.title && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{agent.title}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {agent.adapterType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
                <span className="text-[10px] text-muted-foreground/40">·</span>
                <span className="text-[10px] text-muted-foreground">
                  Last active: {formatTimeAgo(agent.lastHeartbeatAt)}
                </span>
                {agent.budgetMonthlyCents > 0 && (
                  <>
                    <span className="text-[10px] text-muted-foreground/40">·</span>
                    <span className="text-[10px] text-muted-foreground">
                      Budget: {budgetPct}%
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Selection indicator */}
            {isSelected && (
              <div className="flex items-center justify-center h-5 w-5 rounded-full bg-foreground shrink-0 mt-0.5">
                <Check className="h-3 w-3 text-background" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Step: Dependencies ─────────────────────────────────────────────────────

function DepsStep({ requirements }: { requirements: SoloDefinition["requires"] }) {
  const os = getOS();

  if (!requirements || requirements.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Check className="h-4 w-4 text-emerald-400" />
        No dependencies required
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        This solo requires the following dependencies. Install them before activating.
      </p>

      {requirements.map((req) => {
        const installCmd =
          os === "macos" ? req.install?.macos
          : os === "windows" ? req.install?.windows
          : req.install?.linux_apt || req.install?.pip;

        return (
          <div key={req.key} className="rounded-md border border-border p-3 bg-muted/30">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="text-sm font-medium text-foreground">{req.label}</span>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  {req.description}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                {req.requirement_type.replace("_", " ")}
              </Badge>
            </div>

            {installCmd && (
              <div className="mt-2 ml-6 flex items-center gap-1.5">
                <code className="flex-1 text-[11px] bg-background rounded px-2 py-1 font-mono text-foreground border border-border truncate">
                  {installCmd}
                </code>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => copyToClipboard(installCmd)}
                  title="Copy command"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}

            {req.install?.manual_url && (
              <a
                href={req.install.manual_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground ml-6 mt-1"
              >
                <ExternalLink className="h-3 w-3" />
                Installation guide
              </a>
            )}

            {req.install?.steps && (
              <ol className="mt-2 ml-6 flex flex-col gap-0.5">
                {req.install.steps.map((s, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground">
                    {i + 1}. {s}
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step: Configure ────────────────────────────────────────────────────────

function ConfigureStep({
  settings,
  config,
  agentName,
  runSchedule,
  onConfigChange,
  onAgentNameChange,
  onRunScheduleChange,
}: {
  settings: SoloSetting[];
  config: Record<string, string>;
  agentName: string;
  runSchedule: string;
  onConfigChange: (key: string, value: string) => void;
  onAgentNameChange: (name: string) => void;
  onRunScheduleChange: (schedule: "once" | "hourly" | "daily" | "weekly" | "manual") => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Agent name */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium">Solo Name</Label>
        <Input
          value={agentName}
          onChange={(e) => onAgentNameChange(e.target.value)}
          placeholder="Give your solo a name"
          className="h-8 text-sm"
        />
        <p className="text-[11px] text-muted-foreground">Display name for this solo instance</p>
      </div>

      {/* Run schedule */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium">Run Schedule</Label>
        <Select value={runSchedule} onValueChange={(v) => onRunScheduleChange(v as typeof runSchedule extends string ? "once" | "hourly" | "daily" | "weekly" | "manual" : never)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="once">Run once (starts immediately)</SelectItem>
            <SelectItem value="hourly">Hourly</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="manual">Manual (run on demand)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">How often should this solo run? Manual lets you trigger it with a Run Now button.</p>
      </div>

      {/* Settings */}
      {settings.map((setting) => (
        <div key={setting.key} className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">{setting.label}</Label>

          {setting.setting_type === "select" && setting.options ? (
            <Select
              value={config[setting.key] ?? setting.default}
              onValueChange={(v) => onConfigChange(setting.key, v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {setting.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : setting.setting_type === "toggle" ? (
            <button
              onClick={() =>
                onConfigChange(setting.key, config[setting.key] === "true" ? "false" : "true")
              }
              className={`flex items-center h-8 w-14 rounded-full px-0.5 transition-colors ${
                config[setting.key] === "true" ? "bg-foreground" : "bg-muted"
              }`}
            >
              <div
                className={`h-6 w-6 rounded-full transition-all ${
                  config[setting.key] === "true"
                    ? "translate-x-6 bg-background"
                    : "translate-x-0 bg-muted-foreground/50"
                }`}
              />
            </button>
          ) : (
            <Input
              value={config[setting.key] ?? ""}
              onChange={(e) => onConfigChange(setting.key, e.target.value)}
              placeholder={setting.env_var ? `e.g. ${setting.env_var}=...` : ""}
              className="h-8 text-sm"
            />
          )}

          <p className="text-[11px] text-muted-foreground">{setting.description}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Step: Review & Launch ──────────────────────────────────────────────────

function ReviewStep({
  solo,
  agentName,
  config,
  runSchedule,
  selectedAgent,
}: {
  solo: SoloDefinition;
  agentName: string;
  config: Record<string, string>;
  runSchedule: string;
  selectedAgent: { id: string; name: string; icon: string | null } | null;
}) {
  const nonDefaultSettings = solo.settings.filter((s) => config[s.key] !== s.default);
  const settingsMap = new Map(solo.settings.map((s) => [s.key, s]));

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="rounded-md border border-border p-4 bg-muted/30">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl leading-none select-none">{solo.icon}</span>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{agentName}</h4>
            <p className="text-xs text-muted-foreground">{solo.name}</p>
          </div>
        </div>

        {/* Assigned agent */}
        {selectedAgent && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-background border border-border mb-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-md bg-muted shrink-0">
              <AgentIcon icon={selectedAgent.icon} className="h-4 w-4 text-foreground/80" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-muted-foreground">Assigned to</span>
              <span className="text-sm font-medium text-foreground ml-1.5">{selectedAgent.name}</span>
            </div>
          </div>
        )}

        {/* Agent config summary */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-muted-foreground">Model:</span>{" "}
            <span className="text-foreground">{solo.agent.model}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Temperature:</span>{" "}
            <span className="text-foreground">{solo.agent.temperature}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Max tokens:</span>{" "}
            <span className="text-foreground">{solo.agent.max_tokens.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Tools:</span>{" "}
            <span className="text-foreground">{solo.tools.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Schedule:</span>{" "}
            <span className="text-foreground capitalize">{runSchedule === "once" ? "Run once" : runSchedule}</span>
          </div>
        </div>
      </div>

      {/* Non-default settings */}
      {nonDefaultSettings.length > 0 && (
        <div className="flex flex-col gap-1">
          <h5 className="text-xs font-medium text-foreground mb-1">Custom Settings</h5>
          {nonDefaultSettings.map((s) => {
            const def = settingsMap.get(s.key);
            const displayValue =
              s.setting_type === "select"
                ? s.options?.find((o) => o.value === config[s.key])?.label ?? config[s.key]
                : s.setting_type === "toggle"
                  ? config[s.key] === "true" ? "On" : "Off"
                  : config[s.key];
            return (
              <div key={s.key} className="flex items-center justify-between text-[11px] px-1">
                <span className="text-muted-foreground">{def?.label ?? s.key}</span>
                <span className="text-foreground font-medium">{displayValue}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Dashboard metrics preview */}
      {solo.dashboard.metrics.length > 0 && (
        <div className="flex flex-col gap-1">
          <h5 className="text-xs font-medium text-foreground mb-1">Dashboard Metrics</h5>
          <div className="flex flex-wrap gap-1.5">
            {solo.dashboard.metrics.map((m) => (
              <Badge key={m.memory_key} variant="outline" className="text-[10px]">
                {m.label}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
