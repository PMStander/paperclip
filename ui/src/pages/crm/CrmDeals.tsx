import { useState } from "react";
import { Handshake, Plus } from "lucide-react";
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

interface Deal {
  id: string;
  name: string;
  valueCents: number;
  status: CrmDealStatus;
  contact: string;
  company: string;
  closeDateExpected: string;
}

const STATUS_COLORS: Record<CrmDealStatus, string> = {
  lead: "bg-gray-500/20 text-gray-400",
  qualified: "bg-blue-500/20 text-blue-400",
  proposal: "bg-violet-500/20 text-violet-400",
  negotiation: "bg-yellow-500/20 text-yellow-400",
  won: "bg-emerald-500/20 text-emerald-400",
  lost: "bg-red-500/20 text-red-400",
};

const SAMPLE_DEALS: Deal[] = [
  { id: "1", name: "Enterprise License", valueCents: 5000000, status: "proposal", contact: "Sarah Chen", company: "Acme Corp", closeDateExpected: "2026-04-15" },
  { id: "2", name: "API Integration", valueCents: 1200000, status: "qualified", contact: "James Rodriguez", company: "Globex Inc", closeDateExpected: "2026-05-01" },
  { id: "3", name: "Platform Migration", valueCents: 8500000, status: "negotiation", contact: "Emily Park", company: "Initech", closeDateExpected: "2026-03-30" },
  { id: "4", name: "Consulting Package", valueCents: 300000, status: "won", contact: "Sarah Chen", company: "Acme Corp", closeDateExpected: "2026-02-28" },
];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function CrmDeals() {
  const [deals, setDeals] = useState<Deal[]>(SAMPLE_DEALS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", valueCents: "", contact: "", company: "", closeDateExpected: "" });

  function handleAdd() {
    if (!form.name.trim()) return;
    setDeals((prev) => [
      ...prev,
      { ...form, id: crypto.randomUUID(), status: "lead" as CrmDealStatus, valueCents: Math.round(parseFloat(form.valueCents || "0") * 100) },
    ]);
    setForm({ name: "", valueCents: "", contact: "", company: "", closeDateExpected: "" });
    setDialogOpen(false);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between px-6 h-12 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Deals</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Deal
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {deals.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <Handshake className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No deals yet</p>
              <p className="text-xs text-muted-foreground">Create deals to track your sales pipeline.</p>
              <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Deal
              </Button>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Deal</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Value</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Contact</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Company</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Close Date</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-foreground">{d.name}</td>
                  <td className="px-6 py-3 text-sm font-medium text-foreground">{formatCurrency(d.valueCents)}</td>
                  <td className="px-6 py-3">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize", STATUS_COLORS[d.status])}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{d.contact}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{d.company}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{d.closeDateExpected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Deal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Input placeholder="Deal name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Value ($)" type="number" value={form.valueCents} onChange={(e) => setForm({ ...form, valueCents: e.target.value })} />
            <Input placeholder="Contact name" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            <Input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <Input placeholder="Expected close date" type="date" value={form.closeDateExpected} onChange={(e) => setForm({ ...form, closeDateExpected: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name.trim()}>Add Deal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
