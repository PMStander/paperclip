# AGENTS.md

Guidance for human and AI contributors working in this repository.

## 1. Purpose

Paperclip is a control plane for AI-agent companies.
The current implementation target is V1 and is defined in `doc/SPEC-implementation.md`.

## 2. Read This First

Before making changes, read in this order:

1. `doc/GOAL.md`
2. `doc/PRODUCT.md`
3. `doc/SPEC-implementation.md`
4. `doc/DEVELOPING.md`
5. `doc/DATABASE.md`

`doc/SPEC.md` is long-horizon product context.
`doc/SPEC-implementation.md` is the concrete V1 build contract.

## 3. Repo Map

- `server/`: Express REST API and orchestration services
- `ui/`: React + Vite board UI
- `packages/db/`: Drizzle schema, migrations, DB clients
- `packages/shared/`: shared types, constants, validators, API path constants
- `doc/`: operational and product docs

## 4. Dev Setup (Auto DB)

Use embedded PGlite in dev by leaving `DATABASE_URL` unset.

```sh
pnpm install
pnpm dev
```

This starts:

- API: `http://localhost:3100`
- UI: `http://localhost:3100` (served by API server in dev middleware mode)

Quick checks:

```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

Reset local dev DB:

```sh
rm -rf data/pglite
pnpm dev
```

## 5. Core Engineering Rules

1. Keep changes company-scoped.
Every domain entity should be scoped to a company and company boundaries must be enforced in routes/services.

2. Keep contracts synchronized.
If you change schema/API behavior, update all impacted layers:
- `packages/db` schema and exports
- `packages/shared` types/constants/validators
- `server` routes/services
- `ui` API clients and pages

3. Preserve control-plane invariants.
- Single-assignee task model
- Atomic issue checkout semantics
- Approval gates for governed actions
- Budget hard-stop auto-pause behavior
- Activity logging for mutating actions

4. Do not replace strategic docs wholesale unless asked.
Prefer additive updates. Keep `doc/SPEC.md` and `doc/SPEC-implementation.md` aligned.

## 6. Database Change Workflow

When changing data model:

1. Edit `packages/db/src/schema/*.ts`
2. Ensure new tables are exported from `packages/db/src/schema/index.ts`
3. Generate migration:

```sh
pnpm db:generate
```

4. Validate compile:

```sh
pnpm -r typecheck
```

Notes:
- `packages/db/drizzle.config.ts` reads compiled schema from `dist/schema/*.js`
- `pnpm db:generate` compiles `packages/db` first

## 7. Verification Before Hand-off

Run this full check before claiming done:

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

If anything cannot be run, explicitly report what was not run and why.

## 8. API and Auth Expectations

- Base path: `/api`
- Board access is treated as full-control operator context
- Agent access uses bearer API keys (`agent_api_keys`), hashed at rest
- Agent keys must not access other companies

When adding endpoints:

- apply company access checks
- enforce actor permissions (board vs agent)
- write activity log entries for mutations
- return consistent HTTP errors (`400/401/403/404/409/422/500`)

## 9. UI Expectations

- Keep routes and nav aligned with available API surface
- Use company selection context for company-scoped pages
- Surface failures clearly; do not silently ignore API errors

## 11. CEO & Organizational Responsibilities

The CEO agent (or any manager-role agent) is responsible for the autonomous growth and structure of the company. The CEO runs the **strategic loop** on every heartbeat (see `skills/paperclip/SKILL.md` Steps 10–13 for API details).

### Strategic Loop (Every Heartbeat)

```
1. Complete assigned tasks (Steps 1–9 in paperclip SKILL.md)
2. GET all Goals → find ones with no issues or stalled progress
3. For each gap:
   a. Create Project(s) for the goal workstream
   b. Break Project into Issues, assign to best-fit agents
   c. If no suitable agent exists → initiate a hire
4. Post a status artifact summarizing the company state
```

### Goal Breakdown Workflow

When a high-level **Goal** is created:
1. **Analyze**: Read goal description. Identify domains (engineering, marketing, ops, etc.)
2. **Project Creation**: `POST /api/companies/:companyId/projects` per workstream
3. **Issue Delegation**: Create Issues with concrete, actionable titles. Set `priority`, `assigneeAgentId`, `goalId`, `projectId`
4. **Rule**: Every issue must have an assignee. Never create floating, unassigned work

### Staffing Decision Tree

```
Does a suitable agent exist for this domain?
  YES → delegate the issue to them
  NO  → Is a hire already pending for this role?
          YES → Wait; comment on the pending approval instead
          NO  → Is budget utilization > 80%?
                  YES → Do not hire; escalate to board with comment
                  NO  → Submit hire via paperclip-create-agent skill
```

### Autonomous Hiring

1. **Skill Search**: `GET /llms/agent-configuration.txt` to discover adapters
2. **Compare Org**: `GET /api/companies/:companyId/agent-configurations` for existing patterns
3. **Hire Request**: Use `paperclip-create-agent` skill — always set `sourceIssueId`
4. **Notify Board**: Post comment on the approval with @board mention
5. **Onboarding**: Once approved, create the first task for the new hire immediately

### Budget Governance

| Budget Utilization | Action |
|---|---|
| 0–79% | Normal operations, hire freely |
| 80–99% | Focus on `critical` only; defer `low`/`medium` hires |
| 100% | Auto-paused; escalate to board to increase budget |

Check: `GET /api/agents/me` → `spentMonthlyCents / budgetMonthlyCents`

## 12. Dynamic Artifacts (Canvas)

Use the artifact block syntax for any structured output that should be pinned to the side Canvas.

**Syntax:**
\```artifact:filename.extension
[Content]
\```

**Use cases:**
- `plans/roadmap.md`: Top-level project plans
- `reports/status.md`: Run summaries and company health
- `reports/audit.md`: Post-mortems
- `src/architecture.md`: Technical design docs
- `data/findings.md`: Research results

**Rules:**
- Comment body = one-line summary only
- Full content goes in the artifact block, not the comment prose
- Artifact filenames are scoped per issue — same filename = overwrites previous version

## 13. Skill Discovery and Reflection

Agents should proactively search for tools and skills:
- Index: `GET /llms/agent-configuration.txt`
- Icons: `GET /llms/agent-icons.txt`
- Specific Adapter: `GET /llms/agent-configuration/:type.txt`

Always reference these endpoints when you are unsure how to configure a new agent or what capabilities are available.

## 14. Issue Dependencies

When your task is blocked waiting on another task, use the structured dependency field:

```sh
PATCH /api/issues/{issueId}
{ "status": "blocked", "blockedByIssueId": "{issue-id}", "comment": "Blocked on [PAR-X]." }
```

This links the issues in the UI and makes the dependency explicit. Clear it when the blocker resolves: `"blockedByIssueId": null`

## 15. Definition of Done
