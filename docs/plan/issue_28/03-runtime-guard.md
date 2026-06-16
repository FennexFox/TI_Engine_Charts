# Phase 03: Runtime built-in preset safety guard

## Goal

- Prevent built-in chart preset application from replacing or restoring the user's local
  design preset library even if a malformed built-in entry contains snapshot fields.

## Scope

- Add a source-level runtime guard for built-in chart preset application.
- Keep ordinary user import/export and user-saved chart preset behavior unchanged.
- Add browser verification that a built-in chart preset with library snapshot fields does not
  mutate user design presets.

## Non-goals

- No changes to user chart preset export format.
- No changes to applying imported user chart presets with snapshots.
- No changes to built-in preset display grouping or edit/delete restrictions unless a test
  reveals a regression.

## Affected files

- `tools/drive_comparison_client/presets/library.js`
- `tools/drive_comparison_client/presets/repository.js` if sanitization belongs in built-in
  normalization
- `tools/verify_drive_comparison_browser.mjs`
- Generated `docs/index.html` and `docs/assets/js/**` only through the default build.

## Implementation steps

- Decide whether to sanitize built-in settings during normalization, at apply time, or both.
- Ensure `applyChartPresetEntry()` passes enough context to `applyPresetToState()` to identify
  built-in presets.
- Make built-in snapshot fields inert while preserving selected design and dry-mass
  calculator application.
- Add browser verification around a deliberately malformed built-in-like preset entry.
- Run the default checked-in data build and verification.

## Acceptance criteria

- Applying a built-in chart preset cannot replace `dryMassPresetLibrary` from embedded
  `designPresetLibrary` or `dryMassPresetLibrary` fields.
- Applying user-saved or imported chart presets still restores design snapshots.
- Built-in chart and dry-mass presets remain grouped separately and non-editable.

## Validation commands

- npm run build
- npm run verify

## Manual smoke tests

- In the generated page, apply the built-in example chart preset and confirm user design
  presets remain present.

## Rollback risks

- An overly broad guard could break legitimate user preset portability; tests must cover both
  built-in guarded and user snapshot-restoring paths.

## Progress

- Added built-in chart preset normalization that strips `designPresetLibrary` and
  `dryMassPresetLibrary` from normalized built-in settings.
- Added an `allowDesignPresetLibraryRestore` option to `applyPresetToState()` and disabled
  snapshot restoration when applying built-in chart entries, including startup presets.
- Exposed the relevant preset helpers through debug hooks for browser verification.
- Added browser verification for a deliberately malformed built-in chart entry containing
  both snapshot fields, while retaining the existing user chart preset snapshot restore
  checks.
- Regenerated the default checked-in-data page/client assets with `npm run build`.

## Decision log

- Runtime guard will be tested independently from converter output so accidental malformed
  checked-in built-ins are also covered.
- Use both conversion-time and runtime hardening: the converter strips snapshots before
  writing source JSON, normalized built-ins strip snapshots at load time, and built-in apply
  calls disable snapshot restoration.
- Keep the default `applyPresetToState()` behavior unchanged so imported and user-saved chart
  presets remain portable.
- Browser verification in this environment required local extracted Ubuntu libraries in
  `.ti_cache/playwright-libs` because sudo package installation was unavailable and Chromium
  initially could not find `libnspr4.so`, `libnss3.so`, `libnssutil3.so`, and
  `libasound.so.2`.

## Outcomes / Retrospective

- Phase 3 completed. Built-in chart presets are resilient to embedded design library
  snapshots, and user/imported chart preset snapshot restoration remains covered.
- Validation passed:
  - `npm run build`
  - `LD_LIBRARY_PATH=.ti_cache/playwright-libs/usr/lib/x86_64-linux-gnu npm run verify`
