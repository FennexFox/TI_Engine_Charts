# Graph Report - .  (2026-06-17)

## Corpus Check
- 50 files · ~73,770 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 998 nodes · 2800 edges · 39 communities (37 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 66 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Preset Codec|Preset Codec]]
- [[_COMMUNITY_Drive Filtering|Drive Filtering]]
- [[_COMMUNITY_Dashboard Builder|Dashboard Builder]]
- [[_COMMUNITY_Research Catalog|Research Catalog]]
- [[_COMMUNITY_Dry Mass Model|Dry Mass Model]]
- [[_COMMUNITY_Module Effects|Module Effects]]
- [[_COMMUNITY_Diagnostics Interaction|Diagnostics Interaction]]
- [[_COMMUNITY_Chart Rendering|Chart Rendering]]
- [[_COMMUNITY_Chart Pointer Tools|Chart Pointer Tools]]
- [[_COMMUNITY_Core State|Core State]]
- [[_COMMUNITY_Preset Importer|Preset Importer]]
- [[_COMMUNITY_Localized Controls|Localized Controls]]
- [[_COMMUNITY_Browser Verification Server|Browser Verification Server]]
- [[_COMMUNITY_UI Controls|UI Controls]]
- [[_COMMUNITY_Package Scripts|Package Scripts]]
- [[_COMMUNITY_Axis Ticks|Axis Ticks]]
- [[_COMMUNITY_App Controller|App Controller]]
- [[_COMMUNITY_Import Graph Guard|Import Graph Guard]]
- [[_COMMUNITY_Chart Viewport|Chart Viewport]]
- [[_COMMUNITY_Template Loading|Template Loading]]
- [[_COMMUNITY_Build Workflow Policy|Build Workflow Policy]]
- [[_COMMUNITY_Source Ownership Docs|Source Ownership Docs]]
- [[_COMMUNITY_Page Template|Page Template]]
- [[_COMMUNITY_Deploy Rebuild Script|Deploy Rebuild Script]]
- [[_COMMUNITY_WSL Build Script|WSL Build Script]]
- [[_COMMUNITY_Preset Import Tests|Preset Import Tests]]
- [[_COMMUNITY_Pointer Hit Testing|Pointer Hit Testing]]
- [[_COMMUNITY_Chart Architecture Docs|Chart Architecture Docs]]
- [[_COMMUNITY_App Preset Architecture|App Preset Architecture]]
- [[_COMMUNITY_Ship Designer UI Docs|Ship Designer UI Docs]]
- [[_COMMUNITY_Readme Dashboard|Readme Dashboard]]
- [[_COMMUNITY_Syntax Verification|Syntax Verification]]
- [[_COMMUNITY_Searchable Select|Searchable Select]]
- [[_COMMUNITY_Generated Data Policy|Generated Data Policy]]
- [[_COMMUNITY_Dry Mass Architecture|Dry Mass Architecture]]
- [[_COMMUNITY_Import Cycle Rationale|Import Cycle Rationale]]
- [[_COMMUNITY_Preset Library Docs|Preset Library Docs]]
- [[_COMMUNITY_Playwright Verification Docs|Playwright Verification Docs]]
- [[_COMMUNITY_Diagnostics Architecture|Diagnostics Architecture]]

## God Nodes (most connected - your core abstractions)
1. `localText()` - 64 edges
2. `clamp()` - 35 edges
3. `renderDryMassCalcModal()` - 28 edges
4. `build_data()` - 27 edges
5. `renderChart()` - 26 edges
6. `refreshTooltip()` - 26 edges
7. `formatNumber()` - 25 edges
8. `render()` - 24 edges
9. `setupControls()` - 24 edges
10. `handleImportedPresetObject()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Current dashboard features` --semantically_similar_to--> `Chart shell`  [INFERRED] [semantically similar]
  README.md → tools/drive_comparison_template.html
- `Static dashboard` --semantically_similar_to--> `Drive comparison page template`  [INFERRED] [semantically similar]
  README.md → tools/drive_comparison_template.html
- `Built-in presets` --semantically_similar_to--> `Scenario preset card`  [INFERRED] [semantically similar]
  README.md → tools/drive_comparison_template.html
- `presets layer` --semantically_similar_to--> `Scenario preset card`  [INFERRED] [semantically similar]
  dev-docs/architecture.md → tools/drive_comparison_template.html
- `Default checked-in UI-only build` --semantically_similar_to--> `Default checked-in UI-only build`  [INFERRED] [semantically similar]
  AGENTS.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Safe Default Build Policy** — agents_default_checked_in_ui_only_build, readme_default_checked_in_ui_only_build, dev_docs_architecture_generated_github_pages_assets, agents_generated_external_data_policy [INFERRED 0.85]
- **Client Source To Published Assets** — agents_drive_comparison_client_source, agents_docs_assets_js, dev_docs_architecture_source_modules, dev_docs_architecture_generated_github_pages_assets, tools_drive_comparison_template_client_entry_script [INFERRED 0.85]
- **Ship Designer Dry Mass Flow** — tools_drive_comparison_template_ship_designer_card, tools_drive_comparison_template_dry_mass_calculator_modal, dev_docs_architecture_ship_designer_grouping, dev_docs_architecture_dry_mass_model_js, dev_docs_architecture_dry_mass_calculator_js [INFERRED 0.75]

## Communities (39 total, 2 thin omitted)

### Community 0 - "Preset Codec"
Cohesion: 0.06
Nodes (95): base64ToBytes(), bytesToBase64(), copyToClipboard(), formatExportPayloadObject(), gunzipBytes(), gzipBytes(), parsePresetPayload(), readFromClipboard() (+87 more)

### Community 1 - "Drive Filtering"
Cohesion: 0.06
Nodes (84): actualPowerFrontier(), bandMetricHiddenReasons(), chartMassOptions(), chartSummaryMassOptions(), closestDriveRowForThrusterCount(), driveRowsByBaseKey, driveRowsForBaseKey(), effectiveDriveValues() (+76 more)

### Community 2 - "Dashboard Builder"
Cohesion: 0.07
Nodes (61): apply_preset_library(), build_data(), build_drive_links(), build_html(), category_sort_key(), compatible_power_sequence(), copy_client_modules(), drive_category_key() (+53 more)

### Community 3 - "Research Catalog"
Cohesion: 0.08
Nodes (63): build_catalog(), build_graph_links(), build_markdown(), clean_value(), context_values(), infer_node_kind(), load_research_localizations(), localized_fields() (+55 more)

### Community 4 - "Dry Mass Model"
Cohesion: 0.10
Nodes (55): applyDryMassCalculatorPreset(), applyShipDesignSimulationDefaultsToState(), armorMassTons(), armorMaxDepthM(), armorMaxPoints(), armorPlateThicknessM(), armorSectionThicknessM(), armorSectionVolumeM3() (+47 more)

### Community 5 - "Module Effects"
Cohesion: 0.06
Nodes (47): baseDriveValues(), compactModuleName(), diagnosticFields(), DRIVE_CHART_UNMODELED_RULE_CATEGORIES, drivePropellant(), driveSatisfiesRequirement(), evaluateModuleEffectsForDrive(), finiteNumber() (+39 more)

### Community 6 - "Diagnostics Interaction"
Cohesion: 0.09
Nodes (47): computeDriveDiagnostics(), dominantHiddenReason(), filteredRows(), setCurrentDiagnostics(), appendReadingCue(), appliedShipAssumptionText(), applyFilterAction(), axisDebugTickSummary() (+39 more)

### Community 7 - "Chart Rendering"
Cohesion: 0.10
Nodes (38): appendImpracticalPointMarker(), appendParetoDominatedPointMarker(), bandPointData(), bandPointVisual(), betterPowerMetricValue(), drawBestAvailablePowerPath(), drawDriveLinkSegments(), drawFirstCompatiblePowerPoint() (+30 more)

### Community 8 - "Chart Pointer Tools"
Cohesion: 0.14
Nodes (36): endChartPan(), handleChartClick(), handleChartKeyDown(), handleChartPointerLeave(), isEditableTarget(), dedupeTooltipRefs(), drawPointStateOverlay(), isPinnedTooltipKey() (+28 more)

### Community 9 - "Core State"
Cohesion: 0.09
Nodes (35): allDriveRowsById, applyLeftPanelOrder(), cleanRadiatorDisplayName(), CONNECTION_LINE_MODES, currentModuleEffectAssumptions(), HELP_TEXT, HIDDEN_REASON_PRIORITY, HUMAN_ARMORS (+27 more)

### Community 10 - "Preset Importer"
Cohesion: 0.18
Nodes (33): add_or_update_entry(), chart_name(), clone_json(), convert_payload(), design_dedupe_key(), design_source(), extract_chart_settings(), extract_design_entries() (+25 more)

### Community 11 - "Localized Controls"
Cohesion: 0.13
Nodes (26): isModuleRuleRelevantToDriveChart(), connectionLineModeDescription(), connectionLineModeHelpText(), filterActionLabel(), connectionLineModeLabel(), localText(), normalizeConnectionLineMode(), normalizePowerResearchView() (+18 more)

### Community 12 - "Browser Verification Server"
Cohesion: 0.11
Nodes (19): ALLOWED_METHODS, CHROMIUM_UNSAFE_PORTS, listenOnEphemeralPort(), MIME_TYPES, startStaticHttpServer(), axisSpace(), expect(), failures (+11 more)

### Community 13 - "UI Controls"
Cohesion: 0.14
Nodes (25): syncFilterInputs(), updateSortHeaders(), setupPresetExportModal(), setupPresetLibraryControls(), categoryRoot, chart, familyRoot, tooltip (+17 more)

### Community 14 - "Package Scripts"
Cohesion: 0.09
Nodes (21): description, devDependencies, playwright, name, private, scripts, build, build:fast (+13 more)

### Community 15 - "Axis Ticks"
Cohesion: 0.20
Nodes (20): AXIS_TICK_MULTIPLIERS, axisSpaceValue(), axisTickIndexRange(), axisTickOptions(), buildAxisTickPlan(), chooseAxisTickStep(), downsampleTicksWithCoverage(), estimatedAxisTickCount() (+12 more)

### Community 16 - "App Controller"
Cohesion: 0.17
Nodes (16): refreshLocalizedControls(), resetApplicationStateToDefaults(), setLanguage(), registerRenderingCallbacks(), installDebugHooks(), applyHelp(), helpText(), applyStaticLanguage() (+8 more)

### Community 17 - "Import Graph Guard"
Cohesion: 0.14
Nodes (13): buildGraph(), clientDir, cycles, files, { graph, unresolved }, importSpecifiers(), moduleKey(), repoRoot (+5 more)

### Community 18 - "Chart Viewport"
Cohesion: 0.16
Nodes (17): chartHitTargets, chartLadderHitTargets, currentChartRows, setChartHitTargets(), setChartLadderHitTargets(), setChartViewport(), setCurrentChartRows(), baseValueDomain() (+9 more)

### Community 19 - "Template Loading"
Cohesion: 0.26
Nodes (16): candidate_steamapps_dirs(), candidate_templates_dirs(), detect_game_version(), file_fingerprint(), find_steam_appmanifest(), json_default(), load_named_templates(), _load_named_templates_cached() (+8 more)

### Community 20 - "Build Workflow Policy"
Cohesion: 0.15
Nodes (16): Agent Instructions, Default checked-in UI-only build, No full refresh or deep extraction workflow, Local-game-data rebuild, Rebuild workflow, Verification step, WSL build helper, scripts/build-wsl.sh helper (+8 more)

### Community 21 - "Source Ownership Docs"
Cohesion: 0.17
Nodes (13): tools/build_drive_comparison.py, tools/build_research_catalog.py, tools/build_ship_catalog.py, docs/assets/js/**, tools/drive_comparison_client/**, tools/drive_comparison_template.html, data/preset_library.json, scripts/rebuild_pages.py (+5 more)

### Community 22 - "Page Template"
Cohesion: 0.17
Nodes (13): App loading screen, Calculation notes, Client entry module script, Connection line controls, Display controls, Drive comparison page template, Drive filter controls, Embedded JSON data scripts (+5 more)

### Community 23 - "Deploy Rebuild Script"
Cohesion: 0.38
Nodes (11): CompletedProcess, build_pages(), commit_and_push(), current_branch(), generated_paths_changed(), main(), optional_arg(), parse_args() (+3 more)

### Community 24 - "WSL Build Script"
Cohesion: 0.36
Nodes (10): build-wsl.sh script, check_playwright_chromium(), fail(), is_windows_tool_path(), PATH, reject_windows_tool_if_present(), require_linux_tool(), require_value() (+2 more)

### Community 25 - "Preset Import Tests"
Cohesion: 0.36
Nodes (6): AddBuiltInPresetTests, chart_export(), design_export(), load_json(), Path, write_json()

### Community 26 - "Pointer Hit Testing"
Cohesion: 0.35
Nodes (11): handleChartPointerDown(), handleChartPointerMove(), hitTargetsAt(), ladderHitTargetsAt(), panDomainByPixels(), pointInPlot(), resolveLadderHoverRefs(), svgPointFromEvent() (+3 more)

### Community 27 - "Chart Architecture Docs"
Cohesion: 0.28
Nodes (9): chart/interaction.js, chart layer, chart/rendering.js, DATA.driveLinks, Chart guide, Chart options controls, Chart shell, Chart SVG (+1 more)

### Community 28 - "App Preset Architecture"
Cohesion: 0.25
Nodes (8): app/controller.js, app layer, main.js composition root, presets/codec.js, presets layer, presets/library.js, presets/repository.js, presets/runtime.js

### Community 29 - "Ship Designer UI Docs"
Cohesion: 0.29
Nodes (8): ui/dry_mass_calculator.js, Ship Designer grouping inside Simulation Conditions, ui layer, Dry mass calculator modal, Dry mass preset library, Module effects controls, Ship Designer card, Ship preset simulation defaults

### Community 30 - "Readme Dashboard"
Cohesion: 0.29
Nodes (7): Current dashboard features, GitHub Pages builder, Korean and English language selector, Static dashboard, Terra Invicta Engine Charts, Header project links, UI language selector

### Community 31 - "Syntax Verification"
Cohesion: 0.29
Nodes (5): clientDir, failures, files, repoRoot, toolsDir

### Community 32 - "Searchable Select"
Cohesion: 0.43
Nodes (4): enhanceSearchableSelect(), renderSearchableSelectOptions(), searchableSelectLabel(), searchableSelectOptions()

### Community 33 - "Generated Data Policy"
Cohesion: 0.40
Nodes (5): Deploy workflow, Generated artifacts, Generated and external data policy, Search and review scope, Generated output and deployment scope

### Community 34 - "Dry Mass Architecture"
Cohesion: 0.40
Nodes (5): calc layer, calc/dry_mass.js facade, calc/dry_mass_model.js, shared layer, state layer

### Community 35 - "Import Cycle Rationale"
Cohesion: 0.50
Nodes (4): Circular import guard, Dependency direction, Import graph verifier, Module layout goal

### Community 36 - "Preset Library Docs"
Cohesion: 0.67
Nodes (3): tools/add_builtin_preset.py, Built-in presets, data/preset_library.json

## Knowledge Gaps
- **122 isolated node(s):** `name`, `version`, `private`, `description`, `build` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `evaluateModuleEffectsForDrive()` connect `Module Effects` to `Drive Filtering`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `localText()` connect `Localized Controls` to `Preset Codec`, `Drive Filtering`, `Searchable Select`, `Dry Mass Model`, `Diagnostics Interaction`, `Chart Rendering`, `Core State`, `UI Controls`, `App Controller`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `build_data()` (e.g. with `ship_plan_drive_open_cycle()` and `ship_plan_drive_power_requirement_gw()`) actually correct?**
  _`build_data()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _135 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Preset Codec` be split into smaller, more focused modules?**
  _Cohesion score 0.06251213356629781 - nodes in this community are weakly interconnected._
- **Should `Drive Filtering` be split into smaller, more focused modules?**
  _Cohesion score 0.057971014492753624 - nodes in this community are weakly interconnected._
- **Should `Dashboard Builder` be split into smaller, more focused modules?**
  _Cohesion score 0.07256571640133284 - nodes in this community are weakly interconnected._