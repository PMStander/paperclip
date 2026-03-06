import { useState } from "react";
import { FileCheck, Plus } from "lucide-react";
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
import type { CrmQuoteStatus } from "@paperclipai/shared";

interface Quote {
  id: string;
  number: string;
  company: string;
  contact: string;
  deal: string;
  status: CrmQuoteStatus;
  totalCents: number;
  validUntil: string;
  createdDate: string;
}

const STATUS_COLORS: Record<CrmQuoteStatus, string> = {
  draft: "bg-gray-500/20 text-gray-400",
  sent: "bg-blue-500/20 text-blue-400",
  accepted: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-red-500/20 text-red-400",
  expired: "bg-zinc-500/20 text-zinc-400",
};

const SAMPLE_QUOTES: Quote[] = [
  { id: "1", number: "QT-001", company: "Acme Corp", contact: "Sarah Chen", deal: "Enterprise License", status: "sent", totalCents: 5000000, validUntil: "2026-04-01", createdDate: "2026-03-01" },
  { id: "2", number: "QT-002", company: "Globex Inc", contact: "James Rodriguez", deal: "API Integration", status: "accepted", totalCents: 1200000, validUntil: "2026-03-15", createdDate: "2026-02-15" },
  { id: "3", number: "QT-003", company: "Initech", contact: "Emily Park", deal: "Platform Migration", status: "draft", totalCents: 8500000, validUntil: "2026-04-30", createdDate: "2026-03-05" },
];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

let quoteCounter = 4;

export function CrmQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>(SAMPLE_QUOTES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ company: "", contact: "", deal: "", totalCents: "", validUntil: "" });

  function handleAdd() {
    if (!form.company.trim()) return;
    const num = String(quoteCounter++).padStart(3, "0");
    setQuotes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        number: `QT-${num}`,
        company: form.company,
        contact: form.contact,
        deal: form.deal,
        status: "draft" as CrmQuoteStatus,
        totalCents: Math.round(parseFloat(form.totalCents || "0") * 100),
        validUntil: form.validUntil,
        createdDate: new Date().toISOString().slice(0, 10),
      },
    ]);
    setForm({ company: "", contact: "", deal: "", totalCents: "", validUntil: "" });
    setDialogOpen(false);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between px-6 h-12 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Quotes</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Quote
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {quotes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <FileCheck className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No quotes yet</p>
              <p className="text-xs text-muted-foreground">Create quotes to send proposals to your clients.</p>
              <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Quote
              </Button>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Quote #</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Company</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Deal</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Valid Until</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-foreground font-mono">{q.number}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{q.company}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{q.deal}</td>
                  <td className="px-6 py-3">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize", STATUS_COLORS[q.status])}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-foreground text-right">{formatCurrency(q.totalCents)}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{q.validUntil}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Quote</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Input placeholder="Company *" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <Input placeholder="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            <Input placeholder="Deal" value={form.deal} onChange={(e) => setForm({ ...form, deal: e.target.value })} />
            <Input placeholder="Amount ($)" type="number" value={form.totalCents} onChange={(e) => setForm({ ...form, totalCents: e.target.value })} />
            <Input placeholder="Valid until" type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.company.trim()}>Create Quote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
