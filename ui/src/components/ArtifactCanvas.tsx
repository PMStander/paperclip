import React, { useMemo } from "react";
import { 
  FileText, 
  Code, 
  ChevronRight, 
  Maximize2, 
  Copy, 
  Check,
  Zap,
  Layout
} from "lucide-react";
import { MarkdownBody } from "./MarkdownBody";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Artifact {
  id: string;
  filename: string;
  type: "markdown" | "code" | "plan" | "report";
  content: string;
  commentId: string;
  authorName?: string;
  timestamp: string;
}

interface ArtifactCanvasProps {
  artifacts: Artifact[];
  activeArtifactId?: string;
  onSelectArtifact: (id: string) => void;
  className?: string;
}

export function ArtifactCanvas({ 
  artifacts, 
  activeArtifactId, 
  onSelectArtifact,
  className 
}: ArtifactCanvasProps) {
  const activeArtifact = useMemo(() => 
    artifacts.find(a => a.id === activeArtifactId) || artifacts[0],
  [artifacts, activeArtifactId]);

  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!activeArtifact) return;
    navigator.clipboard.writeText(activeArtifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (artifacts.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center h-full", className)}>
        <Layout className="h-12 w-12 text-muted-foreground/20 mb-4" />
        <h3 className="text-sm font-medium text-muted-foreground">No artifacts found</h3>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px]">
          Agents will publish structured outputs here during their work runs.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background border-l border-border/50", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-accent/5">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500 fill-amber-500/20" />
          <h2 className="text-sm font-semibold tracking-tight">Artifact Canvas</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-xs" onClick={handleCopy} title="Copy content">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon-xs" title="Expand view">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Artifact Selector (if multiple) */}
      {artifacts.length > 1 && (
        <div className="flex items-center gap-2 px-2 py-2 overflow-x-auto border-b border-border/30 no-scrollbar">
          {artifacts.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelectArtifact(a.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-all border",
                activeArtifact?.id === a.id
                  ? "bg-primary/10 border-primary/30 text-primary font-medium"
                  : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
              )}
            >
              {a.type === "code" ? <Code className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              {a.filename}
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {activeArtifact && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  {activeArtifact.type === "code" ? <Code size={18} /> : <FileText size={18} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-none">{activeArtifact.filename}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">
                    {activeArtifact.type} · {activeArtifact.timestamp}
                  </p>
                </div>
              </div>

              <div className="glass-morphism rounded-xl border border-white/10 dark:border-white/5 overflow-hidden">
                <div className="p-1">
                   <MarkdownBody className="text-sm p-4 leading-relaxed">
                    {activeArtifact.content}
                  </MarkdownBody>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border/30">
                <p className="text-[10px] text-muted-foreground italic flex items-center gap-1.5 opacity-60">
                  Published by <span className="font-semibold text-foreground/70">{activeArtifact.authorName || "Agent"}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
