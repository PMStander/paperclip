import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  Copy,
  ExternalLink,
  Loader2,
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

// ─── Component ──────────────────────────────────────────────────────────────

export function SoloSetupWizard({ solo, open, onClose, onActivated }: SoloSetupWizardProps) {
  const { selectedCompanyId } = useCompany();
  const hasRequirements = (solo.requires?.length ?? 0) > 0;
  const totalSteps = hasRequirements ? 3 : 2;

  const [step, setStep] = useState(1);
  const [agentName, setAgentName] = useState(solo.name);
  const [config, setConfig] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const s of solo.settings) {
      initial[s.key] = s.default;
    }
    return initial;
  });

  const activateMutation = useMutation({
    mutationFn: () =>
      solosApi.activate(selectedCompanyId!, solo.id, config, agentName),
    onSuccess: () => onActivated(),
  });

  // Determine which step views what content
  const stepContent = useMemo(() => {
    if (hasRequirements) {
      return { deps: 1, configure: 2, review: 3 };
    }
    return { deps: null, configure: 1, review: 2 };
  }, [hasRequirements]);

  const stepLabel =
    step === stepContent.deps
      ? "Dependencies"
      : step === stepContent.configure
        ? "Configure"
        : "Review & Launch";

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
          {Array.from({ length: totalSteps }).map((_, i) => {
            const n = i + 1;
            const isActive = n === step;
            const isDone = n < step;
            return (
              <div key={i} className="flex items-center gap-2">
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
                  {isDone ? <Check className="h-3 w-3" /> : n}
                </div>
                <span className={`text-xs ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {n === stepContent.deps
                    ? "Dependencies"
                    : n === stepContent.configure
                      ? "Configure"
                      : "Launch"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="py-2 min-h-[200px]">
          {step === stepContent.deps && solo.requires && (
            <DepsStep requirements={solo.requires} />
          )}

          {step === stepContent.configure && (
            <ConfigureStep
              settings={solo.settings}
              config={config}
              agentName={agentName}
              onConfigChange={(key, val) => setConfig((prev) => ({ ...prev, [key]: val }))}
              onAgentNameChange={setAgentName}
            />
          )}

          {step === stepContent.review && (
            <ReviewStep
              solo={solo}
              agentName={agentName}
              config={config}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (step <= 1 ? onClose() : setStep(step - 1))}
            disabled={activateMutation.isPending}
          >
            {step <= 1 ? (
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

          {step < totalSteps ? (
            <Button size="sm" onClick={() => setStep(step + 1)}>
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
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

// ─── Step 1: Dependencies ───────────────────────────────────────────────────

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
                <p className="text-xs text-muted-foreground pl-5.5">
                  {req.description}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                {req.requirement_type.replace("_", " ")}
              </Badge>
            </div>

            {installCmd && (
              <div className="mt-2 ml-5.5 flex items-center gap-1.5">
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
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground ml-5.5 mt-1"
              >
                <ExternalLink className="h-3 w-3" />
                Installation guide
              </a>
            )}

            {req.install?.steps && (
              <ol className="mt-2 ml-5.5 flex flex-col gap-0.5">
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

// ─── Step 2: Configure ──────────────────────────────────────────────────────

function ConfigureStep({
  settings,
  config,
  agentName,
  onConfigChange,
  onAgentNameChange,
}: {
  settings: SoloSetting[];
  config: Record<string, string>;
  agentName: string;
  onConfigChange: (key: string, value: string) => void;
  onAgentNameChange: (name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Agent name */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium">Agent Name</Label>
        <Input
          value={agentName}
          onChange={(e) => onAgentNameChange(e.target.value)}
          placeholder="Give your solo a name"
          className="h-8 text-sm"
        />
        <p className="text-[11px] text-muted-foreground">Display name for this solo instance</p>
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

// ─── Step 3: Review & Launch ────────────────────────────────────────────────

function ReviewStep({
  solo,
  agentName,
  config,
}: {
  solo: SoloDefinition;
  agentName: string;
  config: Record<string, string>;
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
