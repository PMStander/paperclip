import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Zap,
  Play,
  Pause,
  Trash2,
  ChevronRight,
  Search,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompany } from "@/context/CompanyContext";
import { solosApi, type SoloDefinition, type SoloInstance } from "@/api/solos";
import { queryKeys } from "@/lib/queryKeys";
import { SoloSetupWizard } from "@/components/SoloSetupWizard";

// ─── Category colors ────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  productivity: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  content: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  data: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  communication: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  security: "bg-red-500/10 text-red-400 border-red-500/20",
  development: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function Solos() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const currentTab = location.pathname.includes("/active") ? "active" : "available";
  const [search, setSearch] = useState("");
  const [wizardSolo, setWizardSolo] = useState<SoloDefinition | null>(null);

  // ── Queries ─────────────────────────────────────────────────────────────

  const { data: definitions = [], isLoading: loadingDefs } = useQuery({
    queryKey: queryKeys.solos.definitions,
    queryFn: () => solosApi.listDefinitions(),
  });

  const { data: instances = [], isLoading: loadingInstances } = useQuery({
    queryKey: queryKeys.solos.instances(selectedCompanyId!),
    queryFn: () => solosApi.listInstances(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  // ── Mutations ───────────────────────────────────────────────────────────

  const pauseMutation = useMutation({
    mutationFn: (id: string) => solosApi.pause(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.solos.instances(selectedCompanyId!) }),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => solosApi.resume(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.solos.instances(selectedCompanyId!) }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => solosApi.deactivate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.solos.instances(selectedCompanyId!) }),
  });

  // ── Filtered definitions ────────────────────────────────────────────────

  const filteredDefs = useMemo(() => {
    if (!search.trim()) return definitions;
    const q = search.toLowerCase();
    return definitions.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q),
    );
  }, [definitions, search]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 h-14 shrink-0 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Zap className="h-5 w-5 text-foreground" />
          <h1 className="text-base font-semibold text-foreground">Solo</h1>
          <span className="text-xs text-muted-foreground">
            Autonomous agents that work for you
          </span>
        </div>
      </div>

      {/* Tabs + Search bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
        <Tabs
          value={currentTab}
          onValueChange={(v) => navigate(`/solos/${v}`)}
        >
          <TabsList>
            <TabsTrigger value="available">
              Available
              {definitions.length > 0 && (
                <span className="ml-1.5 text-[11px] text-muted-foreground">{definitions.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">
              Active
              {instances.length > 0 && (
                <span className="ml-1.5 text-[11px] font-medium text-emerald-400">{instances.length}</span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {currentTab === "available" && (
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search solos…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {currentTab === "available" ? (
          <AvailableTab
            definitions={filteredDefs}
            loading={loadingDefs}
            onActivate={setWizardSolo}
          />
        ) : (
          <ActiveTab
            instances={instances}
            definitions={definitions}
            loading={loadingInstances}
            onPause={(id) => pauseMutation.mutate(id)}
            onResume={(id) => resumeMutation.mutate(id)}
            onDeactivate={(id) => deactivateMutation.mutate(id)}
          />
        )}
      </div>

      {/* Setup wizard dialog */}
      {wizardSolo && (
        <SoloSetupWizard
          solo={wizardSolo}
          open={!!wizardSolo}
          onClose={() => setWizardSolo(null)}
          onActivated={() => {
            setWizardSolo(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.solos.instances(selectedCompanyId!) });
            navigate("/solos/active");
          }}
        />
      )}
    </div>
  );
}

// ─── Available tab ──────────────────────────────────────────────────────────

function AvailableTab({
  definitions,
  loading,
  onActivate,
}: {
  definitions: SoloDefinition[];
  loading: boolean;
  onActivate: (solo: SoloDefinition) => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 rounded-lg border border-border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (definitions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Zap className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">No solos found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {definitions.map((def) => (
        <SoloCard key={def.id} solo={def} onActivate={onActivate} />
      ))}
    </div>
  );
}

// ─── Solo card ──────────────────────────────────────────────────────────────

function SoloCard({
  solo,
  onActivate,
}: {
  solo: SoloDefinition;
  onActivate: (solo: SoloDefinition) => void;
}) {
  const colorClass = CATEGORY_COLORS[solo.category] ?? CATEGORY_COLORS.productivity;

  return (
    <button
      onClick={() => onActivate(solo)}
      className="group relative flex flex-col gap-3 p-5 rounded-lg border border-border bg-card text-left transition-all hover:border-muted-foreground/30 hover:shadow-sm"
    >
      {/* Icon + Category */}
      <div className="flex items-start justify-between">
        <span className="text-3xl leading-none select-none">{solo.icon}</span>
        <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${colorClass}`}>
          {solo.category}
        </Badge>
      </div>

      {/* Name + Description */}
      <div className="flex flex-col gap-1 flex-1">
        <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground">
          {solo.name}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {solo.description}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-muted-foreground">
          {solo.tools.length} tools · {solo.settings.length} settings
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </button>
  );
}

// ─── Active tab ─────────────────────────────────────────────────────────────

function ActiveTab({
  instances,
  definitions,
  loading,
  onPause,
  onResume,
  onDeactivate,
}: {
  instances: SoloInstance[];
  definitions: SoloDefinition[];
  loading: boolean;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDeactivate: (id: string) => void;
}) {
  const defMap = useMemo(() => {
    const m = new Map<string, SoloDefinition>();
    for (const d of definitions) m.set(d.id, d);
    return m;
  }, [definitions]);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg border border-border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Zap className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No active solos</p>
        <p className="text-xs mt-1">Activate a solo from the Available tab to see it here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {instances.map((inst) => {
        const def = defMap.get(inst.soloId);
        const statusColor = STATUS_COLORS[inst.status] ?? STATUS_COLORS.active;
        return (
          <div
            key={inst.id}
            className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card"
          >
            <span className="text-2xl leading-none select-none shrink-0">
              {def?.icon ?? "⚡"}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">{inst.agentName}</span>
                <Badge variant="outline" className={`text-[10px] ${statusColor}`}>
                  {inst.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {def?.description ?? inst.soloId}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {inst.status === "active" ? (
                <Button variant="ghost" size="icon-sm" onClick={() => onPause(inst.id)} title="Pause">
                  <Pause className="h-3.5 w-3.5" />
                </Button>
              ) : inst.status === "paused" ? (
                <Button variant="ghost" size="icon-sm" onClick={() => onResume(inst.id)} title="Resume">
                  <Play className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive-foreground hover:text-destructive-foreground"
                onClick={() => onDeactivate(inst.id)}
                title="Deactivate"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
