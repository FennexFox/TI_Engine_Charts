# Graph Report - .  (2026-06-15)

## Corpus Check
- 66 files · ~113,361 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 902 nodes · 2549 edges · 29 communities (28 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Controller Dry Mass|Controller Dry Mass]]
- [[_COMMUNITY_Preset Codec Sync|Preset Codec Sync]]
- [[_COMMUNITY_Drive Page Builder|Drive Page Builder]]
- [[_COMMUNITY_Drive Filtering Logic|Drive Filtering Logic]]
- [[_COMMUNITY_Research Catalog Builder|Research Catalog Builder]]
- [[_COMMUNITY_Chart Rendering Metrics|Chart Rendering Metrics]]
- [[_COMMUNITY_Module Effects Diagnostics|Module Effects Diagnostics]]
- [[_COMMUNITY_Chart Core State|Chart Core State]]
- [[_COMMUNITY_Chart Context Interaction|Chart Context Interaction]]
- [[_COMMUNITY_Static Server Verification|Static Server Verification]]
- [[_COMMUNITY_Tooltip Interaction|Tooltip Interaction]]
- [[_COMMUNITY_Axis Tick Planning|Axis Tick Planning]]
- [[_COMMUNITY_Package Scripts|Package Scripts]]
- [[_COMMUNITY_Import Graph Verifier|Import Graph Verifier]]
- [[_COMMUNITY_Render Diagnostics Flow|Render Diagnostics Flow]]
- [[_COMMUNITY_Template UI Sections|Template UI Sections]]
- [[_COMMUNITY_Build Workflow Policy|Build Workflow Policy]]
- [[_COMMUNITY_Pointer Pan Hover|Pointer Pan Hover]]
- [[_COMMUNITY_Page Rebuild Script|Page Rebuild Script]]
- [[_COMMUNITY_WSL Build Guard|WSL Build Guard]]
- [[_COMMUNITY_Filter Warning Plans|Filter Warning Plans]]
- [[_COMMUNITY_GitHub Contribution Rules|GitHub Contribution Rules]]
- [[_COMMUNITY_Zoom Domain Research|Zoom Domain Research]]
- [[_COMMUNITY_ESM Ship Designer Architecture|ESM Ship Designer Architecture]]
- [[_COMMUNITY_Ship Catalog Concepts|Ship Catalog Concepts]]
- [[_COMMUNITY_Client Syntax Verifier|Client Syntax Verifier]]
- [[_COMMUNITY_Ship Designer Issue Plan|Ship Designer Issue Plan]]
- [[_COMMUNITY_Issue Template Routing|Issue Template Routing]]
- [[_COMMUNITY_Release Checklist|Release Checklist]]

## God Nodes (most connected - your core abstractions)
1. `localText()` - 53 edges
2. `clamp()` - 33 edges
3. `renderDryMassCalcModal()` - 28 edges
4. `build_data()` - 27 edges
5. `renderChart()` - 26 edges
6. `refreshTooltip()` - 24 edges
7. `handleImportedPresetObject()` - 23 edges
8. `render()` - 22 edges
9. `formatNumber()` - 21 edges
10. `ResearchCostIndex` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Build and Browser Verification Phase` --semantically_similar_to--> `Generated Artifact Policy`  [INFERRED] [semantically similar]
  docs/plan/issue_32/02-verification.md → AGENTS.md
- `Default Checked-in UI-only Build` --semantically_similar_to--> `Default Checked-in UI-only Build`  [INFERRED] [semantically similar]
  AGENTS.md → README.md
- `Local Game Data Rebuild` --semantically_similar_to--> `Local Terra Invicta Data Rebuild`  [INFERRED] [semantically similar]
  AGENTS.md → README.md
- `Generated Artifact Policy` --semantically_similar_to--> `Generated Output and Deployment Scope`  [INFERRED] [semantically similar]
  AGENTS.md → README.md
- `Cross Phase Invariants` --semantically_similar_to--> `Generated Artifact Policy`  [INFERRED] [semantically similar]
  docs/plan/issue_33/00-master-plan.md → AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Default UI-only Build Guardrails** — agents_default_checked_in_ui_only_build, readme_default_checked_in_ui_only_build, dev_native_esm_architecture_native_esm_architecture, agents_generated_artifact_policy [INFERRED 0.85]
- **Ship Designer Discoverability Workflow** — issue_32_00_master_plan_promoted_ship_designer_workflow, issue_32_01_ship_designer_entry_visible_text_cta, issue_32_02_verification_focused_ship_designer_smoke, tools_drive_comparison_template_ship_designer_card, tools_drive_comparison_template_dry_mass_calculator_modal [EXTRACTED 1.00]
- **Actionable Filter Banner Workflow** — issue_33_01_diagnostics_model_hidden_summary, issue_33_01_diagnostics_model_search_summary, issue_33_02_action_banner_ui_filter_action_banner_model, issue_33_03_browser_verifier_actionable_banner_playwright_checks, tools_drive_comparison_template_filter_action_banner [EXTRACTED 1.00]

## Communities (29 total, 1 thin omitted)

### Community 0 - "Controller Dry Mass"
Cohesion: 0.05
Nodes (94): refreshLocalizedControls(), resetApplicationStateToDefaults(), setLanguage(), applyDryMassCalculatorPreset(), applyShipDesignSimulationDefaultsToState(), armorMassTons(), armorMaxDepthM(), armorMaxPoints() (+86 more)

### Community 1 - "Preset Codec Sync"
Cohesion: 0.06
Nodes (97): syncFilterInputs(), base64ToBytes(), bytesToBase64(), copyToClipboard(), formatExportPayloadObject(), gunzipBytes(), gzipBytes(), parsePresetPayload() (+89 more)

### Community 2 - "Drive Page Builder"
Cohesion: 0.06
Nodes (77): apply_preset_library(), build_data(), build_drive_links(), build_html(), category_sort_key(), compatible_power_sequence(), copy_client_modules(), drive_category_key() (+69 more)

### Community 3 - "Drive Filtering Logic"
Cohesion: 0.06
Nodes (71): actualPowerFrontier(), bandMetricHiddenReasons(), chartMassOptions(), closestDriveRowForThrusterCount(), dominantHiddenReason(), driveRowsByBaseKey, driveRowsForBaseKey(), effectiveDriveValues() (+63 more)

### Community 4 - "Research Catalog Builder"
Cohesion: 0.08
Nodes (63): build_catalog(), build_graph_links(), build_markdown(), clean_value(), context_values(), infer_node_kind(), load_research_localizations(), localized_fields() (+55 more)

### Community 5 - "Chart Rendering Metrics"
Cohesion: 0.08
Nodes (49): chartSummaryMassOptions(), optionMetricValue(), renderChartGuide(), appendImpracticalPointMarker(), appendParetoDominatedPointMarker(), bandPointData(), bandPointVisual(), bandPointVisualState() (+41 more)

### Community 6 - "Module Effects Diagnostics"
Cohesion: 0.06
Nodes (47): baseDriveValues(), compactModuleName(), diagnosticFields(), DRIVE_CHART_UNMODELED_RULE_CATEGORIES, drivePropellant(), driveSatisfiesRequirement(), evaluateModuleEffectsForDrive(), finiteNumber() (+39 more)

### Community 7 - "Chart Core State"
Cohesion: 0.07
Nodes (46): connectionLineModeDescription(), connectionLineModeHelpText(), applyLeftPanelOrder(), categoryRoot, chartDefaultState(), cleanRadiatorDisplayName(), CONNECTION_LINE_MODES, connectionLineModeLabel() (+38 more)

### Community 8 - "Chart Context Interaction"
Cohesion: 0.11
Nodes (35): chartHitTargets, chartLadderHitTargets, currentChartRows, setChartHitTargets(), setChartLadderHitTargets(), setChartViewport(), setCurrentChartRows(), setCurrentDiagnostics() (+27 more)

### Community 9 - "Static Server Verification"
Cohesion: 0.11
Nodes (19): ALLOWED_METHODS, CHROMIUM_UNSAFE_PORTS, listenOnEphemeralPort(), MIME_TYPES, startStaticHttpServer(), axisSpace(), expect(), failures (+11 more)

### Community 10 - "Tooltip Interaction"
Cohesion: 0.23
Nodes (24): handleChartClick(), handleChartKeyDown(), handleChartPointerLeave(), isEditableTarget(), dedupeTooltipRefs(), isPinnedTooltipKey(), mergePinnedFocusTooltipRefs(), mergePinnedTooltipRefs() (+16 more)

### Community 11 - "Axis Tick Planning"
Cohesion: 0.18
Nodes (22): AXIS_TICK_MULTIPLIERS, axisSpaceValue(), axisTickIndexRange(), axisTickOptions(), buildAxisTickPlan(), chooseAxisTickStep(), downsampleTicksWithCoverage(), estimatedAxisTickCount() (+14 more)

### Community 12 - "Package Scripts"
Cohesion: 0.09
Nodes (21): description, devDependencies, playwright, name, private, scripts, build, build:fast (+13 more)

### Community 13 - "Import Graph Verifier"
Cohesion: 0.14
Nodes (13): buildGraph(), clientDir, cycles, files, { graph, unresolved }, importSpecifiers(), moduleKey(), repoRoot (+5 more)

### Community 14 - "Render Diagnostics Flow"
Cohesion: 0.16
Nodes (16): computeDriveDiagnostics(), filteredRows(), endChartPan(), redrawChartOnly(), render(), renderChartDiagnostic(), renderConnectionLineControls(), renderFamilyDiagnostics() (+8 more)

### Community 15 - "Template UI Sections"
Cohesion: 0.17
Nodes (13): Ko-fi Sponsorship, Built-in Presets, Chart Diagnostic, Client Entry Script, Control Card Layout, Drive Comparison Template, Drive Filter Controls, Embedded Data Scripts (+5 more)

### Community 16 - "Build Workflow Policy"
Cohesion: 0.20
Nodes (12): Agent Instructions, Default Checked-in UI-only Build, Generated Artifact Policy, Local Game Data Rebuild, Source of Truth Paths, Cross Phase Invariants, Dashboard Features, Default Checked-in UI-only Build (+4 more)

### Community 17 - "Pointer Pan Hover"
Cohesion: 0.30
Nodes (12): handleChartPointerDown(), handleChartPointerMove(), hitTargetsAt(), ladderHitTargetsAt(), panDomainByPixels(), pointInPlot(), resolveLadderHoverRefs(), svgPointFromEvent() (+4 more)

### Community 18 - "Page Rebuild Script"
Cohesion: 0.38
Nodes (11): CompletedProcess, build_pages(), commit_and_push(), current_branch(), generated_paths_changed(), main(), optional_arg(), parse_args() (+3 more)

### Community 19 - "WSL Build Guard"
Cohesion: 0.36
Nodes (10): build-wsl.sh script, check_playwright_chromium(), fail(), is_windows_tool_path(), PATH, reject_windows_tool_if_present(), require_linux_tool(), require_value() (+2 more)

### Community 20 - "Filter Warning Plans"
Cohesion: 0.21
Nodes (12): Actionable Filter Warnings Plan, Phased Diagnostics Refactor Strategy, Diagnostics Model Phase, Hidden Summary, Reason Key Split, Search Summary, Action Banner UI Phase, Banner Action Handlers (+4 more)

### Community 21 - "GitHub Contribution Rules"
Cohesion: 0.24
Nodes (11): Git Text Workflow, Repository-wide Copilot Instructions, Generated Output Deployment Impact, Pull Request Template, Reviewer Checklist, Commit Message Instructions, Conventional Commit Format, Type Selection Rules (+3 more)

### Community 22 - "Zoom Domain Research"
Cohesion: 0.33
Nodes (11): isBandMetric(), baseValueDomain(), constrainDomain(), currentZoomContext(), paddedDomain(), renderChart(), sameDomain(), setZoomDomains() (+3 more)

### Community 23 - "ESM Ship Designer Architecture"
Cohesion: 0.24
Nodes (10): Chart Ownership, Dependency Direction, Dry Mass Calculator Split, Module Boundary Verifier, Native ES Module Architecture, Dry Mass Status Copy, Ship Designer Entry Phase, Visible Text CTA (+2 more)

### Community 24 - "Ship Catalog Concepts"
Cohesion: 0.33
Nodes (9): Armor Catalog, Dry Mass Interpretation Notes, Hull Catalog, Module Effects Normalization, Ship Catalog Generation Source, Terra Invicta Ship Catalog, Utility Module Catalog, Weapon Module Catalog (+1 more)

### Community 25 - "Client Syntax Verifier"
Cohesion: 0.29
Nodes (5): clientDir, failures, files, repoRoot, toolsDir

### Community 26 - "Ship Designer Issue Plan"
Cohesion: 0.40
Nodes (5): One Modal Reuse Strategy, Promoted Ship Designer Workflow, Ship Designer Discoverability Plan, Build and Browser Verification Phase, Focused Ship Designer Smoke

### Community 27 - "Issue Template Routing"
Cohesion: 0.67
Nodes (4): Bug Report, Issue Area Taxonomy, Issue Discussions Routing, Feature Request

## Knowledge Gaps
- **101 isolated node(s):** `name`, `version`, `private`, `description`, `build` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `evaluateModuleEffectsForDrive()` connect `Module Effects Diagnostics` to `Drive Filtering Logic`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `localText()` connect `Controller Dry Mass` to `Preset Codec Sync`, `Chart Rendering Metrics`, `Chart Core State`, `Chart Context Interaction`, `Render Diagnostics Flow`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `build_data()` (e.g. with `ship_plan_drive_open_cycle()` and `ship_plan_drive_power_requirement_gw()`) actually correct?**
  _`build_data()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _113 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Controller Dry Mass` be split into smaller, more focused modules?**
  _Cohesion score 0.05313257182416061 - nodes in this community are weakly interconnected._
- **Should `Preset Codec Sync` be split into smaller, more focused modules?**
  _Cohesion score 0.06030619865571322 - nodes in this community are weakly interconnected._
- **Should `Drive Page Builder` be split into smaller, more focused modules?**
  _Cohesion score 0.05787545787545788 - nodes in this community are weakly interconnected._