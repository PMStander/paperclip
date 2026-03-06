import { useState } from "react";
import { ChevronRight, Users, Building2, Handshake, FileText, FileCheck, Package, Kanban } from "lucide-react";
import { cn } from "../lib/utils";
import { SidebarNavItem } from "./SidebarNavItem";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const CRM_NAV_ITEMS = [
  { to: "/crm/contacts", label: "Contacts", icon: Users },
  { to: "/crm/companies", label: "Companies", icon: Building2 },
  { to: "/crm/deals", label: "Deals", icon: Handshake },
  { to: "/crm/invoices", label: "Invoices", icon: FileText },
  { to: "/crm/quotes", label: "Quotes", icon: FileCheck },
  { to: "/crm/products", label: "Products", icon: Package },
  { to: "/crm/pipeline", label: "Pipeline", icon: Kanban },
] as const;

export function SidebarCrm() {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="group">
        <div className="flex items-center px-3 py-1.5">
          <CollapsibleTrigger className="flex items-center gap-1 flex-1 min-w-0">
            <ChevronRight
              className={cn(
                "h-3 w-3 text-muted-foreground/60 transition-transform opacity-0 group-hover:opacity-100",
                open && "rotate-90"
              )}
            />
            <span className="text-[10px] font-medium uppercase tracking-widest font-mono text-muted-foreground/60">
              CRM
            </span>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent>
        <div className="flex flex-col gap-0.5 mt-0.5">
          {CRM_NAV_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
