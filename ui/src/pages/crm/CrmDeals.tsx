import { Handshake } from "lucide-react";

export function CrmDeals() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between px-6 h-12 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Deals</h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Handshake className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">No deals yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create deals to track your sales pipeline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
