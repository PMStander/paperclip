import { useState } from "react";
import { Building2, Plus, Globe, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CrmCompany {
  id: string;
  name: string;
  domain: string;
  industry: string;
  phone: string;
  address: string;
  contactCount: number;
}

const SAMPLE_COMPANIES: CrmCompany[] = [
  { id: "1", name: "Acme Corp", domain: "acmecorp.com", industry: "Technology", phone: "+1 555-1000", address: "San Francisco, CA", contactCount: 4 },
  { id: "2", name: "Globex Inc", domain: "globex.io", industry: "Finance", phone: "+1 555-2000", address: "New York, NY", contactCount: 2 },
  { id: "3", name: "Initech", domain: "initech.com", industry: "Software", phone: "+1 555-3000", address: "Austin, TX", contactCount: 7 },
];

export function CrmCompanies() {
  const [companies, setCompanies] = useState<CrmCompany[]>(SAMPLE_COMPANIES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", domain: "", industry: "", phone: "", address: "" });

  function handleAdd() {
    if (!form.name.trim()) return;
    setCompanies((prev) => [
      ...prev,
      { ...form, id: crypto.randomUUID(), contactCount: 0 },
    ]);
    setForm({ name: "", domain: "", industry: "", phone: "", address: "" });
    setDialogOpen(false);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between px-6 h-12 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Companies</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Company
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {companies.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No companies yet</p>
              <p className="text-xs text-muted-foreground">Add companies to manage your business accounts.</p>
              <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Company
              </Button>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Company</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Domain</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Industry</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Phone</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Location</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground text-right">Contacts</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-foreground">
                    <span className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {c.name[0]}
                      </span>
                      {c.name}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 shrink-0" />{c.domain}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{c.industry}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0" />{c.phone}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" />{c.address}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground text-right">{c.contactCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Company</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Input placeholder="Company name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Domain (e.g. acme.com)" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
            <Input placeholder="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name.trim()}>Add Company</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
