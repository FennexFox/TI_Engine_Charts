# Development docs

`dev-docs/` is for working architecture notes, temporary implementation context, issue plans, profiling notes, and local handoff material. It is not the public GitHub Pages output and it is not generated catalog documentation.

`docs/` is a pure generated Pages/output root. It contains the generated dashboard, published client modules, and generated catalog Markdown files. Do not use `docs/` for durable documentation or planning notes in this repository.

## Working architecture map

- [`architecture.md`](architecture.md): current client architecture map and module boundary guide.

`architecture.md` is a living guide, not a frozen design contract. Update it when `tools/drive_comparison_client/**`, builders, generated-output boundaries, or verification rules change materially. If it disagrees with current source, tests, or verifiers, the current source and tests win.

## Durable versus temporary docs

Durable project documentation belongs in:

- `README.md` for setup, build, deploy, dashboard scope, and generated-output policy;
- `AGENTS.md` for contributor/agent workflow rules;
- `.github/**` for PR, issue, review, and automation guidance;
- active GitHub issue bodies or PR discussions for user-visible roadmap decisions.

Temporary planning material belongs in:

- `dev-docs/plan/<issue-or-topic>/` for per-issue or per-PR plans;
- `.chatgpt/**` for local ChatGPT/Codex run handoffs and receipts;
- `.chatgpt/tool-tests/**` for generated local measurements.

## Plan document lifecycle

- Create per-issue and per-PR plans under `dev-docs/plan/<issue-or-topic>/`.
- Treat those plan folders as disposable after the related PR is merged, closed, or abandoned.
- Before deleting a plan folder, promote any still-useful decisions, conventions, or validated findings into `README.md`, `AGENTS.md`, `.github/**`, or the relevant GitHub issue.
- Do not treat old references from `dev-docs/plan/**` as compatibility blockers for reorganizing durable documentation.
- Do not review `dev-docs/plan/**` as product code unless the PR explicitly asks for planning-document review.

## Generated-output boundary

`docs/index.html`, `docs/assets/js/**`, `docs/research_catalog.md`, `docs/ship_catalog.md`, and `data/generated/**` are generated or Terra Invicta-derived outputs. Source changes should normally happen in `tools/**`, `scripts/**`, `data/preset_library.json`, or `tools/drive_comparison_client/**`, followed by the normal build/verify workflow.

Do not hand-edit generated `docs/**` outputs as source, documentation, or planning material.
