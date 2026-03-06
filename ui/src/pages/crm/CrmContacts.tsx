import { useState } from "react";
import { Users, Plus, Mail, Phone, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  title: string;
}

const SAMPLE_CONTACTS: Contact[] = [
  { id: "1", firstName: "Sarah", lastName: "Chen", email: "sarah@acmecorp.com", phone: "+1 555-0101", company: "Acme Corp", title: "VP of Engineering" },
  { id: "2", firstName: "James", lastName: "Rodriguez", email: "james@globex.io", phone: "+1 555-0102", company: "Globex Inc", title: "CTO" },
  { id: "3", firstName: "Emily", lastName: "Park", email: "emily@initech.com", phone: "+1 555-0103", company: "Initech", title: "Product Manager" },
];

export function CrmContacts() {
  const [contacts, setContacts] = useState<Contact[]>(SAMPLE_CONTACTS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", company: "", title: "" });

  function handleAdd() {
    if (!form.firstName.trim()) return;
    setContacts((prev) => [
      ...prev,
      { ...form, id: crypto.randomUUID() },
    ]);
    setForm({ firstName: "", lastName: "", email: "", phone: "", company: "", title: "" });
    setDialogOpen(false);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between px-6 h-12 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Contacts</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Contact
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {contacts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No contacts yet</p>
              <p className="text-xs text-muted-foreground">Add contacts to start tracking your relationships.</p>
              <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Contact
              </Button>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Email</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Phone</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Company</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Title</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-foreground">{c.firstName} {c.lastName}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 shrink-0" />{c.email}
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0" />{c.phone}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 shrink-0" />{c.company}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{c.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Contact</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="First name *" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <Input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <Input placeholder="Job title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.firstName.trim()}>Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
