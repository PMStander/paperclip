import { FileCheck } from "lucide-react";

export function CrmQuotes() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between px-6 h-12 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Quotes</h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <FileCheck className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">No quotes yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create quotes to send proposals to your clients.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
