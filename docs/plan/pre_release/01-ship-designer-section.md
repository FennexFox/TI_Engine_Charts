# Phase 01 - Ship Designer Section

## Goal

Add a dedicated Ship Designer section inside Simulation Conditions that groups the dry-mass calculator entry point, applied ship-template status, and module performance effect controls without changing calculation behavior.

## Scope

- Reorganize the Simulation Conditions card in `tools/drive_comparison_template.html`.
- Replace the emoji-only dry-mass calculator affordance with a clear text button or text+icon button.
- Move or wrap `#moduleEffectsControl` inside the new Ship Designer section while preserving existing element IDs and event wiring.
- Surface the applied ship design or template name when available.
- Distinguish the design that was last applied to the chart from the preset/template currently selected or edited inside the modal.
- Show a clear no-template-applied state when no named dry-mass design has been applied.
- Add focused styling for the new section in `tools/drive_comparison_styles.css`.
- Add or update browser verification for the new section and unchanged modal/module behavior.

## Non-Goals

- Do not change dry-mass calculation formulas.
- Do not change module-effect evaluation.
- Do not redesign the dry-mass calculator modal.
- Do not change preset serialization unless a tiny applied-template status field is required and reviewed in this phase.
- Do not change generated `docs/assets/js/**` by hand.

## Affected Files

- `tools/drive_comparison_template.html`
- `tools/drive_comparison_styles.css`
- `tools/drive_comparison_client/ui/dry_mass_calculator.js`
- `tools/drive_comparison_client/ui/control_state.js`
- `tools/drive_comparison_client/state/core.js`
- `tools/drive_comparison_client/presets/library.js`
- `tools/drive_comparison_client/presets/repository.js`
- `tools/verify_drive_comparison_browser.mjs`
- Generated `docs/index.html` and `docs/assets/js/**` after rebuild

## Implementation Steps

1. Add a nested Ship Designer section inside the existing Simulation Conditions card rather than creating a new left-panel card.
2. Keep the dry-mass slider and number input in Simulation Conditions, but place the calculator opener and design status in the Ship Designer section.
3. Change the calculator opener from emoji-only to explicit text such as `Open Dry Mass Calculator` or `Edit Ship Design`; keep an accessible label.
4. Preserve the existing `#dryMassCalcButton` ID so `setupDryMassCalculator()` can keep wiring the modal.
5. Move `#moduleEffectsControl` under the Ship Designer section and keep `#moduleEffectsEnabled`, `#moduleEffectsSummary`, `#moduleEffectsChips`, and `#moduleEffectsWarnings` unchanged.
6. Add an applied-template status element, for example `#shipDesignerAppliedTemplate`.
7. Decide the status source during implementation:
   - The displayed applied template name must reflect the design that was last applied to the chart, not merely the currently selected preset/template inside the modal.
   - Prefer the last applied named dry-mass design preset if that state already exists.
   - If no named design has been applied, display `No ship template applied`.
   - Do not imply that merely selecting a hull, preset, or draft inside the modal means a template was applied unless the user actually applied that design.
   - If the implementation can cheaply detect a selected-but-unapplied draft, it may show that state separately, but it must not label that draft as applied.
8. Update localization refresh paths so the section title, button, and status text update when the app language changes.
9. Add CSS that makes the section visually grouped but not a nested card inside a card.
10. Add browser checks that the section exists, the text button opens the modal, the module-effects checkbox still toggles calculations, and the status displays the no-template state by default.
11. Rebuild generated app assets from source.

## Acceptance Criteria

- Simulation Conditions contains a visible Ship Designer, Ship Design, or Ship Configuration section.
- The dry-mass calculator is reachable through a clear text label or button, not only an emoji.
- Module performance effect controls appear inside the ship-design section.
- A named applied ship template is displayed when available.
- The displayed applied-template status reflects the last design applied to the chart, not the current modal selection alone.
- The UI clearly states when no ship template is applied.
- Existing dry-mass calculator open, edit, reset, apply, and apply-with-defaults flows still work.
- Existing module performance effect toggling and summary behavior still work.
- Existing left-panel card collapse, reorder, and summary behavior still work.

## Validation Commands

```powershell
python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push
node tools/verify_drive_comparison_client_syntax.mjs
node tools/verify_drive_comparison_import_graph.mjs
node tools/verify_drive_comparison_browser.mjs
npm run verify
```

## Manual Smoke Tests

- Open `docs/index.html` or the local static server output in a browser.
- Confirm Simulation Conditions shows the Ship Designer section at desktop and mobile widths.
- Click the dry-mass calculator text button and confirm the modal opens and focuses a usable control.
- Select a hull and a utility module, apply dry mass, and confirm the main dry-mass inputs update.
- Select or rename a template without applying it and confirm the Simulation Conditions status does not falsely report it as the applied template.
- Toggle module performance effects and confirm the summary/chips/warnings update in the Ship Designer section.
- Switch Korean and English UI language and confirm the new section text updates without layout overlap.

## Rollback Risks

- Preset naming state may be ambiguous if the current dry-mass preset system does not distinguish selected, edited, and applied templates. If so, prefer `No ship template applied` or an explicitly conservative status over a misleading applied name.
- Moving DOM nodes can break event wiring if existing IDs are renamed.
- A section styled as a nested card could make the left panel feel heavier and conflict with existing control-card design.
- Language refresh paths can leave stale text if new labels are not wired through existing localization helpers.

## Progress

- [x] Implement the Ship Designer section.
- [x] Preserve dry-mass calculator and module-effect wiring.
- [x] Add applied-template/no-template status.
- [x] Add or update browser verification.
- [x] Rebuild generated assets.
- [x] Run validation commands.
- [x] Complete manual smoke tests.

## Decision Log

- Decision: Keep this section inside the existing Simulation Conditions card.
  Reason: The issue asks for grouping inside Simulation Conditions, and a new top-level card would add panel-management churn.
- Decision: Preserve existing DOM IDs for controls.
  Reason: This keeps the phase reviewable and reduces event-listener risk.
- Decision: Treat applied-template status conservatively.
  Reason: Displaying a selected-but-not-applied design as applied would be misleading.
- Decision: Store the last applied named dry-mass design in chart runtime state as `state.appliedShipTemplate`.
  Reason: The status must reflect an explicit chart apply action, and the current preset selector alone cannot distinguish selected, edited, and applied designs.
- Decision: Do not serialize the applied-template status in chart presets in this phase.
  Reason: The phase only needs current-session applied status, and adding preset schema behavior would widen review scope.
- Decision: Add a deterministic browser verifier fixture for named dry-mass designs.
  Reason: The current generated page has zero built-in dry-mass presets, so the applied-template test needs to create its own named design.

## Outcomes

Implemented. Simulation Conditions now contains a nested Ship Designer section with the text dry-mass calculator command, applied-template/no-template status, and module effect controls grouped together.

The dry-mass calculator still owns calculation and apply behavior. Applying an unnamed design updates the main dry-mass controls without falsely showing a named applied template. Saving, selecting, or renaming a design preset without applying it leaves the side-panel status unchanged. Applying a selected named design marks the status as applied and displays the design name.

Updated source files:

- `tools/drive_comparison_template.html`
- `tools/drive_comparison_styles.css`
- `tools/drive_comparison_client/state/core.js`
- `tools/drive_comparison_client/ui/control_state.js`
- `tools/drive_comparison_client/ui/dry_mass_calculator.js`
- `tools/verify_drive_comparison_browser.mjs`

Regenerated output:

- `docs/index.html`
- `docs/assets/js/state/core.js`
- `docs/assets/js/ui/control_state.js`
- `docs/assets/js/ui/dry_mass_calculator.js`

Validation results:

- `python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push` passed.
- `node tools/verify_drive_comparison_client_syntax.mjs` passed.
- `node tools/verify_drive_comparison_import_graph.mjs` passed with 0 circular dependency groups and the existing 6 boundary warnings available via `--show-boundary-warnings`.
- `node tools/verify_drive_comparison_browser.mjs` passed.
- `npm run verify` passed.

Manual smoke results:

- Confirmed Ship Designer layout at desktop and 390px mobile width.
- Confirmed the dry-mass calculator text button opens the modal and focuses a modal control.
- Changed hull/module selections, applied dry mass, and confirmed the main dry-mass input updated.
- Saved and renamed a dry-mass template without applying it and confirmed the applied-template status stayed unchanged.
- Applied the renamed template and confirmed the applied-template status showed the renamed design.
- Toggled module performance effects and confirmed the summary changed inside the Ship Designer section.
- Switched Korean and English text and confirmed the Ship Designer text stayed populated without layout overflow.

## Retrospective

The first smoke script attempts exposed two useful verifier details: enhanced searchable selects hide their native `<select>` elements from direct Playwright selection, and dry-mass preset management controls live inside the modal. The final smoke test exercises those flows through their real change events and visible modal controls.
