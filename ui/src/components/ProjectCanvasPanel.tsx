import { Link } from "@/lib/router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Agent, Issue, IssueComment } from "@paperclipai/shared";
import { AlertCircle, CheckCircle2, ClipboardList, Clock3, Loader2, Sparkles, Download, ExternalLink, Package } from "lucide-react";
import { agentsApi } from "../api/agents";
import { issuesApi } from "../api/issues";
import { queryKeys } from "../lib/queryKeys";
import { cn, issueUrl, relativeTime } from "../lib/utils";
import { ArtifactCanvas, type Artifact } from "./ArtifactCanvas";
import { StatusBadge } from "./StatusBadge";

interface ProjectCanvasPanelProps {
  companyId: string;
  projectId: string;
}

type ProjectComment = IssueComment & {
  issue: Issue;
  authorName: string;
};

function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div className={cn(
      "rounded-lg border p-3",
      tone === "success" && "border-emerald-500/30 bg-emerald-500/5",
      tone === "warning" && "border-amber-500/30 bg-amber-500/5",
    )}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function commentExcerpt(body: string): string {
  const stripped = body.replace(/```artifact:\s*([^\n\s]+)\s*\n([\s\S]*?)```/g, "").replace(/\s+/g, " ").trim();
  return stripped;
}

function artifactTypeFor(filename: string): Artifact["type"] {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "md") return "markdown";
  if (filename.toLowerCase().includes("plan")) return "plan";
  if (filename.toLowerCase().includes("report") || filename.toLowerCase().includes("status")) return "report";
  return "code";
}

/** Deliverable = a final output that a user cares about receiving */
interface Deliverable {
  id: string;
  label: string;
  /** Full URL or local filename */
  value: string;
  isUrl: boolean;
  issueTitle: string;
  issueIdentifier: string;
  issueId: string;
  authorName: string;
  timestamp: string;
}

const DELIVERABLE_EXTENSIONS = /\.(pdf|epub|mobi|mp4|mp3|mov|avi|apk|ipa|aab|exe|dmg|zip|tar\.gz|docx?|xlsx?)$/i;
const URL_PATTERN = /https?:\/\/[^\s"')]+/g;

function extractDeliverables(
  sortedComments: Array<{ id: string; body: string; issue: Issue; authorName: string; createdAt: string }>,
): Deliverable[] {
  const seen = new Set<string>();
  const result: Deliverable[] = [];

  for (const comment of sortedComments) {
    // Find URLs in the comment body
    const urlMatches = comment.body.match(URL_PATTERN) ?? [];
    for (const url of urlMatches) {
      const cleaned = url.replace(/[.,;)]+$/, "");
      if (seen.has(cleaned)) continue;
      seen.add(cleaned);
      result.push({
        id: `${comment.id}-url-${cleaned}`,
        label: cleaned.length > 60 ? cleaned.slice(0, 57) + "..." : cleaned,
        value: cleaned,
        isUrl: true,
        issueTitle: comment.issue.title,
        issueIdentifier: comment.issue.identifier ?? comment.issue.id.slice(0, 8),
        issueId: comment.issue.id,
        authorName: comment.authorName,
        timestamp: relativeTime(comment.createdAt),
      });
    }

    // Find filenames with deliverable extensions mentioned anywhere in the comment
    const words = comment.body.split(/[\s"'`()\[\]<>,]+/);
    for (const word of words) {
      if (!DELIVERABLE_EXTENSIONS.test(word)) continue;
      const filename = word.trim();
      if (seen.has(filename)) continue;
      seen.add(filename);
      result.push({
        id: `${comment.id}-file-${filename}`,
        label: filename,
        value: filename,
        isUrl: false,
        issueTitle: comment.issue.title,
        issueIdentifier: comment.issue.identifier ?? comment.issue.id.slice(0, 8),
        issueId: comment.issue.id,
        authorName: comment.authorName,
        timestamp: relativeTime(comment.createdAt),
      });
    }
  }

  return result;
}

function DeliverableCard({ deliverable }: { deliverable: Deliverable }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 hover:bg-emerald-500/10 transition-colors">
      <div className="mt-0.5 shrink-0 rounded-md bg-emerald-500/15 p-1">
        {deliverable.isUrl ? (
          <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <Download className="h-3.5 w-3.5 text-emerald-600" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {deliverable.isUrl ? (
          <a
            href={deliverable.value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-emerald-700 dark:text-emerald-300 underline underline-offset-2 break-all hover:text-emerald-900 dark:hover:text-emerald-100"
          >
            {deliverable.label}
          </a>
        ) : (
          <span className="text-sm font-medium font-mono text-foreground">{deliverable.label}</span>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          via{" "}
          <Link
            to={`/issues/${deliverable.issueIdentifier}`}
            className="font-mono hover:underline text-muted-foreground"
          >
            {deliverable.issueIdentifier}
          </Link>
          {" · "}{deliverable.authorName}{" · "}{deliverable.timestamp}
        </p>
      </div>
    </div>
  );
}

export function ProjectCanvasPanel({ companyId, projectId }: ProjectCanvasPanelProps) {
  const [activeArtifactId, setActiveArtifactId] = useState<string | undefined>();

  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.issues.listByProject(companyId, projectId), "canvas"],
    queryFn: async () => {
      const [issues, agents] = await Promise.all([
        issuesApi.list(companyId, { projectId }),
        agentsApi.list(companyId),
      ]);

      const commentsEntries = await Promise.all(
        issues.map(async (issue) => [issue.id, await issuesApi.listComments(issue.id)] as const),
      );

      return {
        issues,
        agents,
        commentsByIssueId: Object.fromEntries(commentsEntries) as Record<string, IssueComment[]>,
      };
    },
    enabled: !!companyId && !!projectId,
  });

  const agentMap = useMemo(
    () => new Map((data?.agents ?? []).map((agent: Agent) => [agent.id, agent.name])),
    [data?.agents],
  );

  const issues = data?.issues ?? [];
  const commentsByIssueId = data?.commentsByIssueId ?? {};

  const metrics = useMemo(() => {
    const open = issues.filter((issue) => !["done", "cancelled"].includes(issue.status));
    return {
      total: issues.length,
      done: issues.filter((issue) => issue.status === "done").length,
      active: issues.filter((issue) => issue.status === "in_progress").length,
      blocked: issues.filter((issue) => issue.status === "blocked").length,
      unassignedOpen: open.filter((issue) => !issue.assigneeAgentId && !issue.assigneeUserId).length,
    };
  }, [issues]);

  const sortedComments = useMemo(() => {
    const flattened: ProjectComment[] = [];
    for (const issue of issues) {
      for (const comment of commentsByIssueId[issue.id] ?? []) {
        flattened.push({
          ...comment,
          issue,
          authorName: comment.authorAgentId ? (agentMap.get(comment.authorAgentId) ?? "Agent") : "Board",
        });
      }
    }

    return flattened.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [agentMap, commentsByIssueId, issues]);

  const artifacts = useMemo(() => {
    const found: Artifact[] = [];
    const ascending = [...sortedComments].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    for (const comment of ascending) {
      const regex = /```artifact:\s*([^\n\s]+)\s*\n([\s\S]*?)```/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(comment.body)) !== null) {
        const filename = match[1].trim();
        found.push({
          id: `${comment.id}-${filename}`,
          filename,
          content: match[2],
          type: artifactTypeFor(filename),
          commentId: comment.id,
          authorName: comment.authorName,
          timestamp: relativeTime(comment.createdAt),
        });
      }
    }

    return found.reverse();
  }, [sortedComments]);

  const deliverables = useMemo(() => extractDeliverables(
    sortedComments.map((c) => ({ ...c, createdAt: String(c.createdAt) })),
  ), [sortedComments]);

  useEffect(() => {
    if (!artifacts.length) {
      setActiveArtifactId(undefined);
      return;
    }
    if (!activeArtifactId || !artifacts.some((artifact) => artifact.id === activeArtifactId)) {
      setActiveArtifactId(artifacts[0]?.id);
    }
  }, [activeArtifactId, artifacts]);

  const activeIssues = useMemo(
    () => issues.filter((issue) => issue.status === "in_progress" || issue.status === "blocked"),
    [issues],
  );

  const queuedIssues = useMemo(
    () => issues.filter((issue) => issue.status === "todo" || issue.status === "backlog"),
    [issues],
  );

  const completedIssues = useMemo(
    () => issues.filter((issue) => issue.status === "done").sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5),
    [issues],
  );

  const needsAttention = useMemo(() => {
    return issues
      .filter((issue) => ["blocked", "todo", "backlog", "in_progress"].includes(issue.status))
      .filter((issue) => issue.status === "blocked" || (!issue.assigneeAgentId && !issue.assigneeUserId))
      .slice(0, 8);
  }, [issues]);

  const recentUpdates = useMemo(
    () => sortedComments.filter((comment) => commentExcerpt(comment.body)).slice(0, 6),
    [sortedComments],
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border p-6 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading project canvas…
      </div>
    );
  }

  if (error) {
    return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{(error as Error).message}</div>;
  }

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Project Canvas
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A live view of progress, attention items, recent updates, and published artifacts for this project.
          </p>
        </div>
      </div>

      {/* Deliverables Section */}
      <section className="rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-emerald-600" />
          <h4 className="text-sm font-semibold">Deliverables</h4>
          {deliverables.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{deliverables.length} found</span>
          )}
        </div>
        {deliverables.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No deliverables detected yet. Agents can surface final outputs (PDFs, videos, URLs) by mentioning them in their task comments.
          </p>
        ) : (
          <div className="space-y-2">
            {deliverables.map((d) => (
              <DeliverableCard key={d.id} deliverable={d} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Open" value={metrics.total - metrics.done} hint="Tasks not finished yet" />
        <MetricCard label="Active" value={metrics.active} hint="Currently being worked" />
        <MetricCard label="Blocked" value={metrics.blocked} hint="Needs a decision or dependency" tone={metrics.blocked > 0 ? "warning" : "default"} />
        <MetricCard label="Unassigned" value={metrics.unassignedOpen} hint="Open work without an owner" tone={metrics.unassignedOpen > 0 ? "warning" : "default"} />
        <MetricCard label="Done" value={metrics.done} hint="Completed deliverables" tone={metrics.done > 0 ? "success" : "default"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <section className="rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold">Needs attention</h4>
            {needsAttention.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No blocked or unassigned tasks right now.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {needsAttention.map((issue) => {
                  const unassigned = !issue.assigneeAgentId && !issue.assigneeUserId;
                  return (
                    <Link
                      key={issue.id}
                      to={issueUrl(issue)}
                      className="flex items-start gap-3 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 no-underline text-inherit transition-colors hover:bg-amber-500/10"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className="font-mono text-xs text-muted-foreground">{issue.identifier}</span>
                          <span className="truncate">{issue.title}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {issue.status === "blocked" ? "Blocked" : "Needs assignee"} · updated {relativeTime(issue.updatedAt)}
                          {unassigned ? " · no owner" : ""}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold">Current process</h4>
            <div className="mt-3 space-y-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" /> Working now
                </div>
                {activeIssues.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks are actively running right now.</p>
                ) : (
                  <div className="space-y-2">
                    {activeIssues.map((issue) => (
                      <Link key={issue.id} to={issueUrl(issue)} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 no-underline text-inherit hover:bg-accent/30">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{issue.identifier}</span>
                            <span className="truncate text-sm font-medium">{issue.title}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">Updated {relativeTime(issue.updatedAt)}</p>
                        </div>
                        <StatusBadge status={issue.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <ClipboardList className="h-3.5 w-3.5" /> Queued next
                </div>
                {queuedIssues.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No queued tasks.</p>
                ) : (
                  <div className="space-y-2">
                    {queuedIssues.slice(0, 6).map((issue) => (
                      <Link key={issue.id} to={issueUrl(issue)} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 no-underline text-inherit hover:bg-accent/30">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{issue.identifier}</span>
                            <span className="truncate text-sm font-medium">{issue.title}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {!issue.assigneeAgentId && !issue.assigneeUserId ? "No assignee yet" : `Updated ${relativeTime(issue.updatedAt)}`}
                          </p>
                        </div>
                        <StatusBadge status={issue.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Recently completed
                </div>
                {completedIssues.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing completed yet.</p>
                ) : (
                  <div className="space-y-2">
                    {completedIssues.map((issue) => (
                      <Link key={issue.id} to={issueUrl(issue)} className="flex items-center justify-between gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 no-underline text-inherit hover:bg-emerald-500/10">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{issue.identifier}</span>
                            <span className="truncate text-sm font-medium">{issue.title}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">Completed {relativeTime(issue.updatedAt)}</p>
                        </div>
                        <StatusBadge status={issue.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold">Recent updates</h4>
            {recentUpdates.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No progress notes yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {recentUpdates.map((comment) => (
                  <Link key={comment.id} to={issueUrl(comment.issue)} className="block rounded-md border border-border px-3 py-2 no-underline text-inherit hover:bg-accent/30">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{comment.issue.identifier}</span>
                      <span>·</span>
                      <span>{comment.authorName}</span>
                      <span>·</span>
                      <span>{relativeTime(comment.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{comment.issue.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{commentExcerpt(comment.body)}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-lg border border-border p-4">
          <h4 className="text-sm font-semibold">Published artifacts</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            The latest structured outputs agents have published for this project.
          </p>
          <div className="mt-4 h-[520px] overflow-hidden rounded-lg border border-border/60">
            <ArtifactCanvas
              artifacts={artifacts}
              activeArtifactId={activeArtifactId}
              onSelectArtifact={setActiveArtifactId}
              className="h-full"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
