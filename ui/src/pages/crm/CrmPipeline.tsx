import { useState } from "react";
import { Kanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CrmDealStatus } from "@paperclipai/shared";

interface PipelineDeal {
  id: string;
  name: string;
  valueCents: number;
  company: string;
  contact: string;
}

interface PipelineColumn {
  status: CrmDealStatus;
  label: string;
  color: string;
  deals: PipelineDeal[];
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" }).format(cents / 100);
}

const INITIAL_COLUMNS: PipelineColumn[] = [
  {
    status: "lead", label: "Lead", color: "border-t-gray-500",
    deals: [
      { id: "5", name: "Support Contract", valueCents: 200000, company: "Wayne Enterprises", contact: "Bruce Wayne" },
    ],
  },
  {
    status: "qualified", label: "Qualified", color: "border-t-blue-500",
    deals: [
      { id: "2", name: "API Integration", valueCents: 1200000, company: "Globex Inc", contact: "James Rodriguez" },
    ],
  },
  {
    status: "proposal", label: "Proposal", color: "border-t-violet-500",
    deals: [
      { id: "1", name: "Enterprise License", valueCents: 5000000, company: "Acme Corp", contact: "Sarah Chen" },
    ],
  },
  {
    status: "negotiation", label: "Negotiation", color: "border-t-yellow-500",
    deals: [
      { id: "3", name: "Platform Migration", valueCents: 8500000, company: "Initech", contact: "Emily Park" },
    ],
  },
  {
    status: "won", label: "Won", color: "border-t-emerald-500",
    deals: [
      { id: "4", name: "Consulting Package", valueCents: 300000, company: "Acme Corp", contact: "Sarah Chen" },
    ],
  },
  {
    status: "lost", label: "Lost", color: "border-t-red-500",
    deals: [],
  },
];

export function CrmPipeline() {
  const [columns, setColumns] = useState<PipelineColumn[]>(INITIAL_COLUMNS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", valueCents: "", company: "", contact: "" });

  function handleAdd() {
    if (!form.name.trim()) return;
    setColumns((prev) =>
      prev.map((col) =>
        col.status === "lead"
          ? {
              ...col,
              deals: [
                ...col.deals,
                {
                  id: crypto.randomUUID(),
                  name: form.name,
                  valueCents: Math.round(parseFloat(form.valueCents || "0") * 100),
                  company: form.company,
                  contact: form.contact,
                },
              ],
            }
          : col,
      ),
    );
    setForm({ name: "", valueCents: "", company: "", contact: "" });
    setDialogOpen(false);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between px-6 h-12 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Pipeline</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Deal
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="flex gap-3 p-4 min-w-max h-full">
          {columns.map((col) => {
            const totalValue = col.deals.reduce((sum, d) => sum + d.valueCents, 0);
            return (
              <div
                key={col.status}
                className={cn(
                  "flex flex-col w-64 shrink-0 rounded-lg border border-border/60 bg-muted/20 border-t-2",
                  col.color,
                )}
              >
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{col.label}</span>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                      {col.deals.length}
                    </span>
                  </div>
                  {totalValue > 0 && (
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {formatCurrency(totalValue)}
                    </span>
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-1.5 px-2 pb-2 overflow-y-auto">
                  {col.deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="rounded-md border border-border/60 bg-background p-2.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <p className="text-sm font-medium text-foreground leading-tight">{deal.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{deal.company}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-muted-foreground">{deal.contact}</span>
                        <span className="text-xs font-semibold text-foreground">
                          {formatCurrency(deal.valueCents)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {col.deals.length === 0 && (
                    <div className="flex-1 flex items-center justify-center py-8">
                      <p className="text-xs text-muted-foreground/60">No deals</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Deal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Input placeholder="Deal name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Value ($)" type="number" value={form.valueCents} onChange={(e) => setForm({ ...form, valueCents: e.target.value })} />
            <Input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <Input placeholder="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name.trim()}>Add to Pipeline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
