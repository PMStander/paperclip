import { useState } from "react";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  unitPriceCents: number;
  currency: string;
  taxRate: number;
}

const SAMPLE_PRODUCTS: Product[] = [
  { id: "1", name: "Platform License (Monthly)", sku: "PLT-M-001", description: "Monthly platform subscription", unitPriceCents: 99900, currency: "USD", taxRate: 0 },
  { id: "2", name: "Platform License (Annual)", sku: "PLT-A-001", description: "Annual platform subscription", unitPriceCents: 999900, currency: "USD", taxRate: 0 },
  { id: "3", name: "API Access Tier 1", sku: "API-T1", description: "Up to 10,000 API calls/month", unitPriceCents: 29900, currency: "USD", taxRate: 0 },
  { id: "4", name: "Consulting Hour", sku: "SVC-CON", description: "Technical consulting, per hour", unitPriceCents: 25000, currency: "USD", taxRate: 0 },
  { id: "5", name: "Custom Integration", sku: "SVC-INT", description: "One-time integration setup", unitPriceCents: 500000, currency: "USD", taxRate: 0 },
];

function formatCurrency(cents: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function CrmProducts() {
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", description: "", unitPriceCents: "", currency: "USD", taxRate: "0" });

  function handleAdd() {
    if (!form.name.trim()) return;
    setProducts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: form.name,
        sku: form.sku,
        description: form.description,
        unitPriceCents: Math.round(parseFloat(form.unitPriceCents || "0") * 100),
        currency: form.currency || "USD",
        taxRate: parseFloat(form.taxRate || "0"),
      },
    ]);
    setForm({ name: "", sku: "", description: "", unitPriceCents: "", currency: "USD", taxRate: "0" });
    setDialogOpen(false);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between px-6 h-12 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Products</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Product
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {products.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No products yet</p>
              <p className="text-xs text-muted-foreground">Add products and services for use in quotes and invoices.</p>
              <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Product
              </Button>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Product</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">SKU</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Description</th>
                <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-foreground">{p.name}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground font-mono">{p.sku}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{p.description}</td>
                  <td className="px-6 py-3 text-sm font-medium text-foreground text-right">{formatCurrency(p.unitPriceCents, p.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Input placeholder="Product name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Price ($)" type="number" value={form.unitPriceCents} onChange={(e) => setForm({ ...form, unitPriceCents: e.target.value })} />
              <Input placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name.trim()}>Add Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
