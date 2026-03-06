import { FileText } from "lucide-react";

export function CrmInvoices() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between px-6 h-12 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Invoices</h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">No invoices yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create invoices to bill your clients.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
