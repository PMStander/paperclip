---
name: paperclip-experimentation
description: >
  Operate Paperclip's experimentation platform end-to-end: create campaigns and variants,
  run replay suites, request approvals, activate approved policy rollouts, and manage
  branch lab promotions with auditability and safety rails.
---

# Paperclip Experimentation Skill

Use this skill when you are asked to improve Paperclip using the experimentation platform rather than making one-off manual changes.

This skill assumes you also follow the normal `paperclip` skill for authentication, issue coordination, comments, and approval handling.

## Goals

Use the platform in this order whenever possible:

1. Shadow replay first
2. Population routing second
3. Policy rollout third
4. Branch lab last

Never jump directly to broad live rollout when replay evidence is missing.

## Safety Rules

- Stay company-scoped.
- Prefer replay before live traffic.
- Do not activate anything that still requires approval.
- If an approval is already approved, you may advance the corresponding rollout or promotion.
- Keep variants reversible and documented.
- Use small traffic percentages for challengers first.
- For branch lab, do not push or merge automatically.

## Primary API Flow

### 1. Create a campaign

```bash
POST /api/companies/{companyId}/experiment-campaigns
{
  "name": "Daily issue schedule routing",
  "phase": "population",
  "subjectType": "issue_schedule",
  "subjectId": "<schedule-id>",
  "objective": "Improve completion quality without raising cost",
  "safetyPolicy": { "budgetUsdCap": 20, "requiresApproval": true }
}
```

### 2. Add variants

```bash
POST /api/experiment-campaigns/{campaignId}/variants
{
  "label": "baseline",
  "role": "baseline",
  "trafficPercent": 90,
  "config": {}
}

POST /api/experiment-campaigns/{campaignId}/variants
{
  "label": "challenger-a",
  "role": "challenger",
  "trafficPercent": 10,
  "config": {
    "promptTemplateAppend": "Be more concise and decision-oriented.",
    "issuePatch": { "titlePrefix": "[Experiment] " },
    "adapterConfig": { "temperature": 0.2 }
  }
}
```

### 3. Create and run replay suites

```bash
POST /api/experiment-campaigns/{campaignId}/evaluation-suites
{
  "name": "Historical heartbeat replay",
  "mode": "shadow",
  "sourceType": "heartbeat_run",
  "selector": { "limit": 20 },
  "judgeConfig": { "scoreLabel": "heuristic" }
}

POST /api/evaluation-suites/{suiteId}/run
{ "limit": 20 }
```

Review:

- `GET /api/evaluation-suites/{suiteId}/runs`
- `GET /api/evaluation-runs/{runId}`

### 4. Promote a winning variant

Request approval first:

```bash
POST /api/experiment-variants/{variantId}/request-promotion
{}
```

After approval is resolved to `approved`, promote it:

```bash
POST /api/experiment-variants/{variantId}/promote
{}
```

### 5. Create policy packs and versions

```bash
POST /api/companies/{companyId}/policy-packs
{
  "name": "Hourly support triage cadence",
  "targetType": "solo_instance",
  "targetId": "<solo-instance-id>"
}

POST /api/policy-packs/{policyPackId}/versions
{
  "summary": "Move from daily to hourly cadence",
  "config": { "runSchedule": "hourly" }
}
```

Request rollout:

```bash
POST /api/policy-versions/{policyVersionId}/request-rollout
{ "requestApproval": true }
```

If approved, activate:

```bash
POST /api/policy-rollouts/{rolloutId}/activate
{}
```

### 6. Use branch lab safely

```bash
POST /api/companies/{companyId}/branch-experiments
{
  "projectId": "<project-id>",
  "workspaceId": "<workspace-id>",
  "sourceIssueId": "<issue-id>",
  "validatorCommands": ["pnpm -r typecheck", "pnpm test:run"]
}
```

Request promotion:

```bash
POST /api/branch-experiments/{branchExperimentId}/request-promotion
{}
```

After approval, mark promoted:

```bash
POST /api/branch-experiments/{branchExperimentId}/promote
{}
```

## Approval Follow-up Procedure

When you wake because an approval changed status:

1. `GET /api/approvals/{approvalId}`
2. Inspect approval `type`
3. Advance the matching item:

- `promote_experiment_variant` -> `POST /api/experiment-variants/{variantId}/promote`
- `apply_policy_rollout` -> `POST /api/policy-rollouts/{rolloutId}/activate`
- `promote_branch_experiment` -> `POST /api/branch-experiments/{branchExperimentId}/promote`

4. Comment on the linked issue with what advanced and what remains.

## Recommended Operating Loop

For an autonomous manager agent or solo:

1. Check current campaigns, policy packs, branch experiments
2. Find drafts, paused items, pending approvals, and approved-but-not-activated items
3. Prefer:
   - run replay suites on draft campaigns
   - activate small live cohorts only after replay evidence
   - request approvals when challengers clearly outperform baseline
   - activate approved rollouts immediately if safe
4. Leave a concise audit comment on the relevant issue

## Good Defaults

- Replay suites: 10-20 historical samples first
- Challenger traffic: 5-10% initially
- Policy changes: canary one target first
- Branch lab validators: `pnpm -r typecheck`, `pnpm test:run`, then project-specific checks

## Bad Practices to Avoid

- Promoting without replay evidence
- Large traffic shifts without approvals
- Activating unapproved rollouts
- Treating branch lab as auto-merge
- Running many challengers at 50/50 without a reason
