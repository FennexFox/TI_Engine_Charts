# Plan docs

This folder holds temporary per-issue and per-PR planning context.

## Lifecycle

Plan folders may be deleted when the related PR is merged, closed, or abandoned.

Before deleting a folder, preserve only durable conclusions that remain useful outside the one-off run. Good promotion targets are:

- `README.md` for project/user workflow;
- `AGENTS.md` for contributor and agent workflow rules;
- `.github/**` for PR/issue/review workflow;
- active GitHub issue bodies or comments for follow-up tasks;
- `dev-docs/architecture.md` only for durable client-architecture or boundary decisions.

Do not migrate raw measurement output, temporary prompts, stale phase plans, or local run receipts into durable docs.

## Review rules

- Treat plan files as context, not product code.
- Prefer the current source, tests, and generated-output verifiers over stale plan text.
- When a plan conflicts with current source or project instructions, update or delete the plan rather than preserving compatibility.
- Do not let references from `dev-docs/plan/**` block documentation or source reorganization.

## Suggested folder shape

```text
dev-docs/plan/issue_<number>/
  00-master-plan.md
  01-<phase>.md
  02-<phase>.md
  <issue>-result.md
```

Use shorter structures for simple one-shot tasks.
