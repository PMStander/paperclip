import { Users } from "lucide-react";

export function CrmContacts() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between px-6 h-12 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Contacts</h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">No contacts yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add contacts to start tracking your relationships.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
