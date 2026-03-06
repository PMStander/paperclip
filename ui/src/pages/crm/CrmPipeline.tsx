import { Kanban } from "lucide-react";

export function CrmPipeline() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between px-6 h-12 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Pipeline</h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Kanban className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">No pipeline stages yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Set up your sales pipeline to visualize deal progress.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
