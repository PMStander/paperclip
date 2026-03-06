import { useState } from "react";
import { FileText, Plus } from "lucide-react";
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
import type { CrmInvoiceStatus } from "@paperclipai/shared";

interface Invoice {
  id: string;
  number: string;
  company: string;
  contact: string;
  status: CrmInvoiceStatus;
  totalCents: number;
  dueDate: string;
  issuedDate: string;
}

const STATUS_COLORS: Record<CrmInvoiceStatus, string> = {
  draft: "bg-gray-500/20 text-gray-400",
  sent: "bg-blue-500/20 text-blue-400",
  paid: "bg-emerald-500/20 text-emerald-400",
  overdue: "bg-red-500/20 text-red-400",
  cancelled: "bg-zinc-500/20 text-zinc-400",
};

const SAMPLE_INVOICES: Invoice[] = [
  { id: "1", number: "INV-001", company: "Acme Corp", contact: "Sarah Chen", status: "paid", totalCents: 1500000, dueDate: "2026-02-28", issuedDate: "2026-02-01" },
  { id: "2", number: "INV-002", company: "Globex Inc", contact: "James Rodriguez", status: "sent", totalCents: 450000, dueDate: "2026-03-15", issuedDate: "2026-02-15" },
  { id: "3", number: "INV-003", company: "Initech", contact: "Emily Park", status: "overdue", totalCents: 2800000, dueDate: "2026-02-20", issuedDate: "2026-01-20" },
  { id: "4", number: "INV-004", company: "Acme Corp", contact: "Sarah Chen", status: "draft", totalCents: 750000, dueDate: "2026-04-01", issuedDate: "2026-03-01" },
];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

let invoiceCounter = 5;

export function CrmInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>(SAMPLE_INVOICES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ company: "", contact: "", totalCents: "", dueDate: "" });

  function handleAdd() {
    if (!form.company.trim()) return;
    const num = String(invoiceCounter++).padStart(3, "0");
    setInvoices((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        number: `INV-${num}`,
        company: form.company,
        contact: form.contact,
        status: "draft" as CrmInvoiceStatus,
        totalCents: Math.round(parseFloat(form.totalCents || "0") * 100),
        dueDate: form.dueDate,
        issuedDate: new Date().toISOString().slice(0, 10),
      },
    ]);
    setForm({ company: "", contact: "", totalCents: "", dueDate: "" });
    setDialogOpen(false);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between px-6 h-12 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Invoices</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Invoice
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {invoices.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No invoices yet</p>
              <p className="text-xs text-muted-foreground">Create invoices to bill your clients.</p>
              <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Invoice
              </Button>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Invoice #</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Company</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Contact</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-foreground font-mono">{inv.number}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{inv.company}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{inv.contact}</td>
                  <td className="px-6 py-3">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize", STATUS_COLORS[inv.status])}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-foreground text-right">{formatCurrency(inv.totalCents)}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{inv.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Input placeholder="Company *" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <Input placeholder="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            <Input placeholder="Amount ($)" type="number" value={form.totalCents} onChange={(e) => setForm({ ...form, totalCents: e.target.value })} />
            <Input placeholder="Due date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.company.trim()}>Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
