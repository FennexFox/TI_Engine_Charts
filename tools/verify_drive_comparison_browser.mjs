import { isAbsolute, relative, resolve } from "node:path";
import { chromium } from "playwright";
import { startStaticHttpServer } from "./static_http_server.mjs";

const htmlFiles = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["docs/index.html"];

const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function nearlySameDomain(a, b, tolerance = 1e-8) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== 2 || b.length !== 2) return false;
  const scale = Math.max(Math.abs(b[1] - b[0]), Math.abs(b[0]), Math.abs(b[1]), 1);
  return Math.abs(a[0] - b[0]) <= scale * tolerance
    && Math.abs(a[1] - b[1]) <= scale * tolerance;
}

function htmlFileUrl(htmlFile, baseUrl) {
  const absolutePath = resolve(htmlFile);
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const pagePath = (isAbsolute(htmlFile) ? relative(process.cwd(), absolutePath) : htmlFile)
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
  return new URL(pagePath, normalizedBaseUrl).href;
}

async function setLanguage(page, value) {
  await page.locator("#uiLanguageSelect").selectOption(value);
  await page.waitForTimeout(100);
}

async function verifyHtmlFile(browser, htmlFile, baseUrl) {
  const targetUrl = htmlFileUrl(htmlFile, baseUrl);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  const pageErrors = [];
  const httpErrors = [];
  const requestFailures = [];
  await page.addInitScript(() => {
    window.__TI_VERIFY_RUNTIME_ERRORS = [];
    window.addEventListener("error", event => {
      window.__TI_VERIFY_RUNTIME_ERRORS.push({
        type: "error",
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });
    window.addEventListener("unhandledrejection", event => {
      window.__TI_VERIFY_RUNTIME_ERRORS.push({
        type: "unhandledrejection",
        reason: String(event.reason && (event.reason.stack || event.reason.message || event.reason)),
      });
    });
  });
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("response", response => {
    const status = response.status();
    if (status >= 400) {
      httpErrors.push(`${status} ${response.url()}`);
    }
  });
  page.on("requestfailed", request => {
    requestFailures.push(`${request.failure()?.errorText || "failed"} ${request.url()}`);
  });
  await page.route("**/favicon.ico", route => route.fulfill({ status: 204, body: "" }));

  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  expect(await page.locator('script[type="module"][src$="assets/js/main.js"]').count() === 1, `${htmlFile}: module entry script missing`);
  try {
    await page.waitForSelector("#chart .data-point", { timeout: 15000 });
  } catch (error) {
    const diagnostics = await page.evaluate(() => {
      const chart = document.getElementById("chart");
      const diagnosticBanner = document.getElementById("chartDiagnostic");
      return {
        readyState: document.readyState,
        moduleScripts: document.querySelectorAll('script[type="module"]').length,
        chartExists: !!chart,
        chartChildCount: chart?.childElementCount ?? 0,
        dataPointCount: document.querySelectorAll("#chart .data-point").length,
        visibleCountText: document.getElementById("visibleCount")?.textContent?.trim() || "",
        metric: document.getElementById("metric")?.value || "",
        chartDiagnosticText: diagnosticBanner?.textContent?.trim() || "",
        runtimeErrors: window.__TI_VERIFY_RUNTIME_ERRORS || [],
        bodyTextStart: document.body?.innerText?.replace(/\s+/g, " ").trim().slice(0, 500) || "",
      };
    }).catch(diagnosticError => ({ diagnosticError: diagnosticError.message }));
    throw new Error([
      `${htmlFile}: timed out waiting for #chart .data-point`,
      `Original error: ${error.message}`,
      consoleErrors.length ? `Console errors: ${consoleErrors.join(" | ")}` : "Console errors: none captured",
      pageErrors.length ? `Page errors: ${pageErrors.join(" | ")}` : "Page errors: none captured",
      httpErrors.length ? `HTTP errors: ${httpErrors.join(" | ")}` : "HTTP errors: none captured",
      requestFailures.length ? `Request failures: ${requestFailures.join(" | ")}` : "Request failures: none captured",
      `Page diagnostics: ${JSON.stringify(diagnostics)}`,
    ].join("\n"));
  }

  const title = await page.locator("h1").innerText();
  const initialLanguage = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    selector: document.getElementById("uiLanguageSelect")?.value || "",
  }));
  const languageOptions = await page.locator("#uiLanguageSelect option").count();
  expect(initialLanguage.lang === "en", `${htmlFile}: initial document language should be English`);
  expect(initialLanguage.selector === "en", `${htmlFile}: initial language selector should be English`);
  expect(/Drive Comparison/.test(title), `${htmlFile}: initial title should render in English`);
  expect(title.trim().length > 0, `${htmlFile}: title did not render`);
  expect(languageOptions === 2, `${htmlFile}: language selector missing`);

  await setLanguage(page, "en");
  const englishTitle = await page.locator("h1").innerText();
  const englishSource = await page.locator("#sourceNote").innerText();
  const englishMetricGroups = await page.locator("#metric optgroup").evaluateAll(groups => groups.map(group => group.label));
  expect(/Drive Comparison/.test(englishTitle), `${htmlFile}: English language switch did not update title`);
  expect(/Game version/.test(englishSource), `${htmlFile}: English language switch did not update source note`);
  expect(
    englishMetricGroups.length === 2
      && /Simulation \(total mass, fuel mass, TWR\)/.test(englishMetricGroups[0] || "")
      && /Basic information \(thrust, efficiency, power\)/.test(englishMetricGroups[1] || ""),
    `${htmlFile}: English metric group labels were not localized`,
  );
  const cardSummaryChecks = await page.evaluate(() => {
    const simulationSummaryText = () => document.querySelector('.control-card[data-control-card="simulation"] [data-card-summary]')?.textContent || "";
    const filterSummaryText = () => document.querySelector('.control-card[data-control-card="filter"] [data-card-summary]')?.textContent || "";

    setLanguage("en", { rerender: false });
    Object.assign(state, { metric: "totalMassTons", minTwr: 0.25, minDvKps: 125, logX: true, logY: true });
    syncUiFromState();
    updateLeftPanelCardSummaries();
    const totalMassSimulationSummary = simulationSummaryText();
    const totalMassFilterSummary = filterSummaryText();

    Object.assign(state, { metric: "twr", minTwr: 0.25, minDvKps: 125, logX: true, logY: true });
    syncUiFromState();
    updateLeftPanelCardSummaries();
    const twrSimulationSummary = simulationSummaryText();
    const twrFilterSummary = filterSummaryText();

    setLanguage("ko", { rerender: false });
    Object.assign(state, { metric: "totalMassTons", minTwr: 0.25, minDvKps: 125, logX: true, logY: true });
    syncUiFromState();
    updateLeftPanelCardSummaries();
    const koreanFilterSummary = filterSummaryText();

    resetChartStateToDefaults();
    setLanguage("en", { rerender: false });
    syncUiFromState();
    updateLeftPanelCardSummaries();

    return { totalMassSimulationSummary, totalMassFilterSummary, twrSimulationSummary, twrFilterSummary, koreanFilterSummary };
  });
  expect(
    /TWR/.test(cardSummaryChecks.totalMassSimulationSummary) && !/dV ≥/.test(cardSummaryChecks.totalMassSimulationSummary),
    `${htmlFile}: total-mass simulation summary should show the TWR threshold`,
  );
  expect(
    !/TWR/.test(cardSummaryChecks.totalMassFilterSummary) && !/dV/.test(cardSummaryChecks.totalMassFilterSummary),
    `${htmlFile}: total-mass filter summary should not show moved simulation thresholds`,
  );
  expect(
    /dV/.test(cardSummaryChecks.twrFilterSummary) && !/TWR/.test(cardSummaryChecks.twrFilterSummary),
    `${htmlFile}: TWR filter summary should show only the dV threshold`,
  );
  expect(
    !/TWR/.test(cardSummaryChecks.twrSimulationSummary),
    `${htmlFile}: TWR simulation summary should not show the minimum TWR threshold when that control is hidden`,
  );
  expect(
    /X축 로그/.test(cardSummaryChecks.koreanFilterSummary)
      && /Y축 로그/.test(cardSummaryChecks.koreanFilterSummary)
      && !/log X|log Y|Log X|Log Y/.test(cardSummaryChecks.koreanFilterSummary),
    `${htmlFile}: Korean filter summary should localize log axis labels`,
  );

  const moduleEffectCalculationChecks = await page.evaluate(() => {
    resetChartStateToDefaults();
    state.metric = "totalMassTons";
    state.dryMassTons = 1000;
    state.targetDvKps = 50;
    state.minTwr = 0.0001;
    state.showImpracticalCandidates = true;
    state.moduleEffectSource = "manual";
    const fusionHydrogen = DATA.drives.find(row => (
      row.categoryKey === "Fusion"
      && row.propellant === "Hydrogen"
      && (row.powerOptions || row.reactorOptions || []).length
    ));
    const fissionHydrogen = DATA.drives.find(row => (
      row.categoryKey === "Fission"
      && row.propellant === "Hydrogen"
      && (row.powerOptions || row.reactorOptions || []).length
    ));
    const firstOption = row => chartMassOptions(row)[0] || null;
    if (!fusionHydrogen || !fissionHydrogen) return { missingFixture: true };

    state.moduleEffectsEnabled = false;
    state.moduleEffectModuleIds = ["MuonSpiker", "HydronTrap"];
    const base = firstOption(fusionHydrogen);
    const disabled = firstOption(fusionHydrogen);

    state.moduleEffectsEnabled = true;
    state.moduleEffectModuleIds = ["MuonSpiker"];
    const thrust = firstOption(fusionHydrogen);
    const thrustMetric = metricDefs.thrustMN.value(fusionHydrogen);

    state.moduleEffectModuleIds = ["HydronTrap"];
    const ev = firstOption(fusionHydrogen);
    state.fuelEfficiencyUnit = "kps";
    const evMetric = metricDefs.fuelEfficiency.value(fusionHydrogen);
    state.fuelEfficiencyUnit = "seconds";
    const ispMetric = metricDefs.fuelEfficiency.value(fusionHydrogen);

    state.moduleEffectModuleIds = ["MuonSpiker"];
    state.moduleEffectsEnabled = false;
    const fissionBase = firstOption(fissionHydrogen);
    state.moduleEffectsEnabled = true;
    const incompatible = firstOption(fissionHydrogen);

    state.moduleEffectModuleIds = ["ElectronicCountermeasures1"];
    const unsupported = firstOption(fusionHydrogen);

    return {
      missingFixture: false,
      disabledParity: !!base && !!disabled
        && Math.abs(base.totalMassTons - disabled.totalMassTons) < 1e-9
        && Math.abs(base.propellantTons - disabled.propellantTons) < 1e-9
        && Math.abs(base.twr - disabled.twr) < 1e-12,
      thrustApplied: !!base && !!thrust
        && Math.abs(base.totalMassTons - thrust.totalMassTons) < 1e-9
        && thrust.twr > base.twr * 1.09
        && thrust.effectiveThrustN > thrust.baseThrustN,
      evApplied: !!base && !!ev
        && ev.propellantTons < base.propellantTons
        && ev.totalMassTons < base.totalMassTons
        && ev.maxPracticalDvKps > base.maxPracticalDvKps
        && ev.effectiveExhaustVelocityKps > ev.baseExhaustVelocityKps,
      incompatibleSkipped: !!fissionBase && !!incompatible
        && Math.abs(fissionBase.totalMassTons - incompatible.totalMassTons) < 1e-9
        && Math.abs(fissionBase.twr - incompatible.twr) < 1e-12
        && incompatible.moduleEffectDiagnostics.unmetRequirements.length > 0
        && incompatible.moduleEffectDiagnostics.skippedEffects.length > 0,
      unsupportedDiagnosed: !!unsupported
        && unsupported.moduleEffectDiagnostics.unsupportedRules.some(item => item.rule === "ECM"),
      powerPreservedDiagnostic: !!thrust
        && thrust.moduleEffectDiagnostics.powerSideEffects.some(item => item.status === "baseValuesPreserved"),
      thrustMetricEffective: Math.abs(thrustMetric - fusionHydrogen.thrustN * 1.1 / 1e6) < 1e-9,
      evMetricEffective: Math.abs(evMetric - fusionHydrogen.exhaustVelocityKps * 1.5) < 1e-9,
      ispMetricEffective: ispMetric > fusionHydrogen.specificImpulseSeconds * 1.49,
    };
  });
  expect(!moduleEffectCalculationChecks.missingFixture, `${htmlFile}: module-effect calculation fixture drives were not found`);
  expect(moduleEffectCalculationChecks.disabledParity, `${htmlFile}: module effects disabled did not preserve base mass options`);
  expect(moduleEffectCalculationChecks.thrustApplied, `${htmlFile}: thrust multiplier did not update TWR/effective thrust`);
  expect(moduleEffectCalculationChecks.evApplied, `${htmlFile}: EV multiplier did not update propellant/total mass/max practical dV`);
  expect(moduleEffectCalculationChecks.incompatibleSkipped, `${htmlFile}: incompatible module effect was not skipped with diagnostics`);
  expect(moduleEffectCalculationChecks.unsupportedDiagnosed, `${htmlFile}: unsupported module rule was not carried as diagnostics`);
  expect(moduleEffectCalculationChecks.powerPreservedDiagnostic, `${htmlFile}: power-side base-value diagnostic missing`);
  expect(moduleEffectCalculationChecks.thrustMetricEffective, `${htmlFile}: thrust metric did not use effective thrust`);
  expect(moduleEffectCalculationChecks.evMetricEffective, `${htmlFile}: fuel-efficiency metric did not use effective exhaust velocity`);
  expect(moduleEffectCalculationChecks.ispMetricEffective, `${htmlFile}: fuel-efficiency metric did not use effective specific impulse`);

  await page.locator("#chartPresetActionsMenu > summary").click();
  const chartPresetMenuState = await page.evaluate(() => {
    const overflow = [...document.querySelectorAll("#presetClipboard .compact-command")]
      .some(button => button.scrollWidth > button.clientWidth + 1);
    return {
      overflow,
      exportSelected: !!document.querySelector("#chartPresetExportSelected"),
      exportAll: !!document.querySelector("#chartPresetExportAll"),
      exportCurrentText: document.querySelector("#presetExport")?.textContent?.trim() || "",
    };
  });
  expect(chartPresetMenuState.exportCurrentText === "Export current settings", `${htmlFile}: chart current-settings export label missing`);
  expect(!chartPresetMenuState.exportSelected && !chartPresetMenuState.exportAll, `${htmlFile}: removed chart export buttons still render`);
  expect(!chartPresetMenuState.overflow, `${htmlFile}: chart preset management menu text overflows its buttons`);
  await page.locator("#chartPresetActionsMenu > summary").click();

  await setLanguage(page, "ko");
  const visiblePoints = await page.locator("#chart .data-point").count();
  const categoryHelpCount = await page.locator(".category-row[data-help]").count();
  const overlayHelpCount = await page.locator("#bandAnalysisControls .check-row[data-help]").count();
  const usageText = await page.locator("#tooltip .usage-panel").innerText();
  const customHelpRuleCount = await page.evaluate(() => {
    return [...document.styleSheets].reduce((count, sheet) => {
      return count + [...sheet.cssRules].filter(rule => String(rule.selectorText || "").includes("[data-help]::after")).length;
    }, 0);
  });

  expect(visiblePoints > 0, `${htmlFile}: no chart data points rendered`);
  expect(categoryHelpCount >= 5, `${htmlFile}: category help tooltips were not attached`);
  expect(overlayHelpCount >= 4, `${htmlFile}: overlay help tooltips were not attached`);
  expect(customHelpRuleCount === 0, `${htmlFile}: custom data-help tooltip rule still exists`);
  expect(usageText.trim().length > 0, `${htmlFile}: empty detail panel usage text missing`);

  const powerViewChecks = await page.evaluate(() => {
    const selectedPowerResearchView = () => {
      const select = document.getElementById("powerResearchView");
      if (select) return select.value || "";
      return document.querySelector('input[name="powerResearchView"]:checked')?.value || "";
    };
    const powerResearchViewOptions = () => {
      const select = document.getElementById("powerResearchView");
      return select ? [...select.options].map(option => ({ value: option.value, label: option.textContent.trim() })) : [];
    };
    const debugAxisSnapshot = () => window.TI_ENGINE_CHART_DEBUG?.axisSnapshot?.() || null;

    resetChartStateToDefaults();
    setLanguage("en", { rerender: false });
    state.metric = "totalMassTons";
    syncUiFromState();
    render();
    const defaultMode = {
      selected: selectedPowerResearchView(),
      options: powerResearchViewOptions(),
      controlVisible: getComputedStyle(document.getElementById("powerResearchViewControl")).display !== "none",
      basePoints: document.querySelectorAll("#chart .power-base-point").length,
      extraPoints: document.querySelectorAll("#chart .power-extra-point").length,
      ladderLines: document.querySelectorAll("#chart .power-ladder-line").length,
      bandSurfaces: document.querySelectorAll("#chart [data-band-pair-step], #chart [data-band-step]").length,
    };
    const legacyMigration = {};
    applyPresetToState({ metric: "totalMassTons", powerResearchView: "off" });
    legacyMigration.off = state.powerResearchView;
    resetChartStateToDefaults();
    applyPresetToState({ metric: "totalMassTons", usePowerResearch: false });
    legacyMigration.falseBoolean = state.powerResearchView;
    resetChartStateToDefaults();
    applyPresetToState({ metric: "totalMassTons", usePowerResearch: true });
    legacyMigration.trueBoolean = state.powerResearchView;
    resetChartStateToDefaults();
    state.metric = "totalMassTons";
    setLanguage("en", { rerender: false });
    syncUiFromState();
    render();
    const target = currentChartRows.find(row => chartMassOptions(row).length > 1);
    const targetOptions = target ? chartMassOptions(target) : [];

    state.powerResearchView = "focus";
    state.hoverPoints = [];
    state.lastTooltipItems = [];
    state.tooltipPinned = false;
    syncUiFromState();
    render();
    const focusIdle = {
      selected: selectedPowerResearchView(),
      basePoints: document.querySelectorAll("#chart .power-base-point").length,
      extraPoints: document.querySelectorAll("#chart .power-extra-point").length,
      ladderLines: document.querySelectorAll("#chart .power-ladder-line").length,
      xDomain: debugAxisSnapshot()?.x?.domain || null,
      yDomain: debugAxisSnapshot()?.y?.domain || null,
    };

    if (target && targetOptions.length) {
      const ref = tooltipRef(target.id, targetOptions[0].id);
      state.hoverPoints = [ref];
      state.lastTooltipItems = [ref];
      render();
      refreshTooltip(currentChartRows);
    }
    const focusActive = {
      extraPoints: document.querySelectorAll("#chart .power-extra-point").length,
      focusedExtraPoints: document.querySelectorAll("#chart .power-extra-point.is-focused").length,
      ladderLines: document.querySelectorAll("#chart .power-ladder-line").length,
      focusedLines: document.querySelectorAll("#chart .power-ladder-line.is-focused").length,
      powerStepRows: document.querySelectorAll("#tooltip .power-steps-table tbody tr").length,
      powerStepText: document.querySelector("#tooltip .tooltip-power-steps")?.textContent || "",
    };

    state.powerResearchView = "all";
    state.hoverPoints = [];
    state.lastTooltipItems = [];
    state.tooltipPinned = false;
    syncUiFromState();
    render();
    const allMode = {
      selected: selectedPowerResearchView(),
      extraPoints: document.querySelectorAll("#chart .power-extra-point").length,
      subduedExtraPoints: document.querySelectorAll("#chart .power-extra-point.is-subdued").length,
      ladderLines: document.querySelectorAll("#chart .power-ladder-line").length,
      subduedLines: document.querySelectorAll("#chart .power-ladder-line.is-subdued").length,
      dashedLines: [...document.querySelectorAll("#chart .power-ladder-line")]
        .filter(path => (path.getAttribute("stroke-dasharray") || "").trim().length > 0).length,
      bandSurfaces: document.querySelectorAll("#chart [data-band-pair-step], #chart [data-band-step]").length,
      xDomain: debugAxisSnapshot()?.x?.domain || null,
      yDomain: debugAxisSnapshot()?.y?.domain || null,
    };

    state.powerResearchView = "best";
    state.hoverPoints = [];
    state.lastTooltipItems = [];
    state.tooltipPinned = false;
    syncUiFromState();
    render();
    const bestPoint = document.querySelector("#chart .power-best-point");
    if (bestPoint) {
      const ref = tooltipRef(bestPoint.getAttribute("data-row-id"), bestPoint.getAttribute("data-power-option-id"));
      state.lastTooltipItems = [ref];
      state.hoverPoints = [ref];
      refreshTooltip(currentChartRows);
    }
    const bestMode = {
      selected: selectedPowerResearchView(),
      basePoints: document.querySelectorAll("#chart .power-base-point").length,
      bestPoints: document.querySelectorAll("#chart .power-best-point").length,
      bestLines: document.querySelectorAll("#chart .power-best-line").length,
      solidLines: [...document.querySelectorAll("#chart .power-best-line")]
        .filter(path => !(path.getAttribute("stroke-dasharray") || "").trim()).length,
      bestExtraPoints: document.querySelectorAll("#chart .power-best-point.power-extra-point").length,
      subduedBestPoints: document.querySelectorAll("#chart .power-best-point.is-subdued").length,
      extraPoints: document.querySelectorAll("#chart .power-extra-point").length,
      ladderLines: document.querySelectorAll("#chart .power-ladder-line").length,
      bandSurfaces: document.querySelectorAll("#chart [data-band-pair-step], #chart [data-band-step]").length,
      powerStepText: document.querySelector("#tooltip .tooltip-power-steps")?.textContent || "",
      selectedPowerText: document.querySelector("#tooltip .tooltip-title-power")?.textContent || "",
    };

    state.metric = "thrustMN";
    syncUiFromState();
    render();
    const nonPowerMetric = {
      controlVisible: getComputedStyle(document.getElementById("powerResearchViewControl")).display !== "none",
      bestLines: document.querySelectorAll("#chart .power-best-line").length,
      ladderLines: document.querySelectorAll("#chart .power-ladder-line").length,
    };

    resetChartStateToDefaults();
    setLanguage("ko", { rerender: false });
    syncUiFromState();
    render();
    return { defaultMode, legacyMigration, hasMultiOptionTarget: !!target, focusIdle, focusActive, allMode, bestMode, nonPowerMetric };
  });
  expect(powerViewChecks.defaultMode.controlVisible, `${htmlFile}: Power view control is hidden on band metric`);
  expect(powerViewChecks.defaultMode.selected === "focus", `${htmlFile}: Base is not the default Power view`);
  expect(
    JSON.stringify(powerViewChecks.defaultMode.options.map(option => option.value)) === JSON.stringify(["focus", "all", "best"]),
    `${htmlFile}: Power view options are not exactly focus/all/best`,
  );
  expect(
    JSON.stringify(powerViewChecks.defaultMode.options.map(option => option.label)) === JSON.stringify(["Base", "All ladders", "Best Available"]),
    `${htmlFile}: Power view labels are not exactly the expected English labels`,
  );
  expect(!powerViewChecks.defaultMode.options.some(option => /envelope/i.test(option.label) || option.value === "off" || option.value === "envelope"), `${htmlFile}: removed Power view option still appears`);
  expect(powerViewChecks.defaultMode.basePoints > 0, `${htmlFile}: default Base mode did not render base points`);
  expect(powerViewChecks.defaultMode.extraPoints === 0, `${htmlFile}: idle default Base mode rendered extra power points`);
  expect(powerViewChecks.defaultMode.ladderLines === 0, `${htmlFile}: idle default Base mode rendered ladder lines`);
  expect(powerViewChecks.defaultMode.bandSurfaces === 0, `${htmlFile}: default mode rendered old power band surfaces`);
  expect(powerViewChecks.legacyMigration.off === "focus", `${htmlFile}: legacy powerResearchView off did not migrate to focus`);
  expect(powerViewChecks.legacyMigration.falseBoolean === "focus", `${htmlFile}: legacy usePowerResearch false did not migrate to focus`);
  expect(powerViewChecks.legacyMigration.trueBoolean === "all", `${htmlFile}: legacy usePowerResearch true did not migrate to all`);
  expect(powerViewChecks.hasMultiOptionTarget, `${htmlFile}: no multi-power-option drive available for ladder verification`);
  expect(powerViewChecks.focusIdle.selected === "focus", `${htmlFile}: Base Power view did not select focus mode`);
  expect(powerViewChecks.focusIdle.basePoints > 0, `${htmlFile}: Base mode removed base points`);
  expect(powerViewChecks.focusIdle.extraPoints === 0, `${htmlFile}: idle Base mode rendered unrelated extra points`);
  expect(powerViewChecks.focusActive.extraPoints > 0, `${htmlFile}: active Base mode did not render extra points`);
  expect(powerViewChecks.focusActive.focusedExtraPoints === powerViewChecks.focusActive.extraPoints, `${htmlFile}: focus extra points were not marked focused`);
  expect(powerViewChecks.focusActive.focusedLines > 0, `${htmlFile}: active Base mode did not render focused dashed lines`);
  expect(powerViewChecks.focusActive.powerStepRows > 1, `${htmlFile}: Power steps table did not include multiple power options`);
  expect(/Wet mass/.test(powerViewChecks.focusActive.powerStepText) && /TWR/.test(powerViewChecks.focusActive.powerStepText), `${htmlFile}: Power steps table missing key columns`);
  expect(powerViewChecks.allMode.selected === "all", `${htmlFile}: All ladders Power view did not select all mode`);
  expect(powerViewChecks.allMode.extraPoints > 0, `${htmlFile}: All ladders mode did not render extra points`);
  expect(powerViewChecks.allMode.subduedExtraPoints > 0, `${htmlFile}: All ladders mode did not apply subdued point styling`);
  expect(powerViewChecks.allMode.ladderLines > 0 && powerViewChecks.allMode.subduedLines > 0, `${htmlFile}: All ladders mode did not render subdued ladder lines`);
  expect(powerViewChecks.allMode.dashedLines === powerViewChecks.allMode.ladderLines, `${htmlFile}: All ladders mode did not render dashed ladder lines`);
  expect(powerViewChecks.allMode.bandSurfaces === 0, `${htmlFile}: All ladders mode rendered old power band surfaces`);
  expect(nearlySameDomain(powerViewChecks.allMode.xDomain, powerViewChecks.focusIdle.xDomain), `${htmlFile}: All ladders mode changed the default X viewport instead of fitting base points`);
  expect(nearlySameDomain(powerViewChecks.allMode.yDomain, powerViewChecks.focusIdle.yDomain), `${htmlFile}: All ladders mode changed the default Y viewport instead of fitting base points`);
  expect(powerViewChecks.bestMode.selected === "best", `${htmlFile}: Best Available Power view did not select best mode`);
  expect(powerViewChecks.bestMode.basePoints > 0, `${htmlFile}: Best Available did not preserve first-compatible baseline points`);
  expect(powerViewChecks.bestMode.bestPoints > 0 && powerViewChecks.bestMode.bestLines > 1, `${htmlFile}: Best Available did not render best points and lines for multiple drives`);
  expect(powerViewChecks.bestMode.solidLines === powerViewChecks.bestMode.bestLines, `${htmlFile}: Best Available lines should be solid, not dashed`);
  expect(powerViewChecks.bestMode.bestExtraPoints === powerViewChecks.bestMode.bestPoints, `${htmlFile}: Best Available points do not use the ladder extra-point style`);
  expect(powerViewChecks.bestMode.subduedBestPoints > 0, `${htmlFile}: Best Available did not apply subdued point styling`);
  expect(powerViewChecks.bestMode.extraPoints === powerViewChecks.bestMode.bestPoints && powerViewChecks.bestMode.ladderLines === 0, `${htmlFile}: Best Available rendered unexpected ladder extras`);
  expect(powerViewChecks.bestMode.bandSurfaces === 0, `${htmlFile}: Best Available rendered old power band surfaces`);
  expect(/Wet mass/.test(powerViewChecks.bestMode.powerStepText) && /TWR/.test(powerViewChecks.bestMode.powerStepText), `${htmlFile}: Best Available tooltip missing power step details`);
  expect(powerViewChecks.bestMode.selectedPowerText.trim().length > 0, `${htmlFile}: Best Available tooltip did not identify the selected power plant`);
  expect(!powerViewChecks.nonPowerMetric.controlVisible, `${htmlFile}: Power view control is visible on a non-power-comparison metric`);
  expect(powerViewChecks.nonPowerMetric.bestLines === 0 && powerViewChecks.nonPowerMetric.ladderLines === 0, `${htmlFile}: Power view rendered on a non-power-comparison metric`);

  await page.locator("#dryMassCalcButton").click();
  await page.waitForSelector("#dryMassCalcModal.is-open", { timeout: 5000 });
  const dryMassManageSizing = await page.evaluate(() => {
    const manage = document.querySelector("#dryMassPresetActionsMenu > summary")?.getBoundingClientRect();
    const save = document.querySelector("#dryMassPresetSave")?.getBoundingClientRect();
    return !!manage && !!save && Math.abs(manage.height - save.height) < 1;
  });
  expect(dryMassManageSizing, `${htmlFile}: dry-mass preset Manage button height differs from adjacent buttons`);
  await page.locator("#dryMassPresetActionsMenu > summary").click();
  await page.locator("#dryMassPresetExportSelected").click();
  await page.waitForSelector("#presetExportModal.is-open", { timeout: 5000 });
  const exportModalAboveDryMassModal = await page.evaluate(() => {
    const card = document.querySelector("#presetExportModal .modal-card");
    if (!card) return false;
    const box = card.getBoundingClientRect();
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + Math.min(20, box.height / 2));
    return !!top && !!top.closest("#presetExportModal");
  });
  expect(exportModalAboveDryMassModal, `${htmlFile}: export modal appears behind the dry-mass calculator modal`);
  await page.locator("#presetExportClose").click();
  await page.waitForFunction(() => !document.querySelector("#presetExportModal")?.classList.contains("is-open"), null, { timeout: 5000 });
  const dryMassPresetMenuClosedByOutsideClick = await page.locator("#dryMassPresetActionsMenu").evaluate(menu => !menu.open);
  expect(dryMassPresetMenuClosedByOutsideClick, `${htmlFile}: dry-mass preset management menu did not close after an outside click`);
  expect(await page.locator('#dryMassCalcArmor select[data-armor-field="type"]').count() === 3, `${htmlFile}: dry-mass calculator armor type controls missing`);
  expect(await page.locator('#dryMassCalcArmor input[data-armor-field="points"]').count() === 3, `${htmlFile}: dry-mass calculator armor point controls missing`);
  const initialCalcMass = await page.evaluate(() => dryMassCalcTotalTons());
  await page.locator("#dryMassCalcArmornosePoints").evaluate(input => {
    input.value = "1";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(100);
  const armorMass = await page.evaluate(() => dryMassCalcArmorTotals().massTons);
  const armoredCalcMass = await page.evaluate(() => dryMassCalcTotalTons());
  expect(armorMass > 0, `${htmlFile}: armor points did not produce armor mass`);
  expect(armoredCalcMass > initialCalcMass, `${htmlFile}: armor mass was not included in dry-mass total`);
  await page.locator("#dryMassCalcReset").click();
  const resetArmorPoints = await page.locator('#dryMassCalcArmor input[data-armor-field="points"]').evaluateAll(inputs => inputs.map(input => Number(input.value)));
  expect(resetArmorPoints.every(value => value === 0), `${htmlFile}: dry-mass calculator reset did not clear armor points`);

  const presetRoundTrip = await page.evaluate(async () => {
    const testClass = SHIP_CLASS_OPTIONS.find(item => {
      const slots = Number(item.utilitySlots ?? item.internalModules) || 0;
      return slots > 0 && hardpointCapacity(item, "nose") > 0;
    }) || SHIP_CLASS_OPTIONS[0];
    dryMassCalcState.classId = testClass ? testClass.dataName : dryMassCalcState.classId;
    normalizeDryMassCalcSlots();

    const shipClass = selectedShipClass();
    const utility = utilityModulesForShipClass(shipClass).find(item => item.dataName !== EMPTY_UTILITY_MODULE.dataName);
    if (utility && dryMassCalcState.slotModules.length) {
      dryMassCalcState.slotModules[0] = utility.dataName;
    }

    const weapon = weaponModulesForSection("nose").find(item => (
      item.dataName !== EMPTY_WEAPON_MODULE.dataName
      && weaponSlotSize(item) <= hardpointCapacity(shipClass, "nose")
    ));
    if (weapon) dryMassCalcState.weaponModules.nose = [weapon.dataName];

    const armor = selectedArmorById(DEFAULT_ARMOR_ID);
    if (armor) {
      dryMassCalcState.armor.nose = {
        armorId: armor.dataName,
        points: Math.min(1, armorMaxPoints(shipClass, "nose", armor)),
      };
    }
    normalizeDryMassCalcSlots();

    state.moduleEffectsEnabled = true;
    state.moduleEffectSource = "manual";
    state.moduleEffectModuleIds = ["MuonSpiker", "MissingModule", "Empty", "HydronTrap", "MuonSpiker"];
    const expectedModuleEffects = {
      moduleEffectsEnabled: true,
      moduleEffectSource: "manual",
      moduleEffectModuleIds: ["MuonSpiker", "HydronTrap"],
    };

    const expected = JSON.stringify(exportedDryMassCalculatorPreset());
    const serialized = await serializePresetPayload();
    const parsed = await parsePresetPayload(serialized);
    const exportedModuleEffects = {
      moduleEffectsEnabled: parsed.moduleEffectsEnabled,
      moduleEffectSource: parsed.moduleEffectSource,
      moduleEffectModuleIds: parsed.moduleEffectModuleIds,
    };
    const oldPreset = JSON.parse(JSON.stringify(parsed));
    delete oldPreset.moduleEffectsEnabled;
    delete oldPreset.moduleEffectSource;
    delete oldPreset.moduleEffectModuleIds;
    state.moduleEffectsEnabled = true;
    state.moduleEffectSource = "manual";
    state.moduleEffectModuleIds = ["MuonSpiker"];
    const oldApplied = applyPresetToState(oldPreset);
    const oldModuleEffects = currentModuleEffectAssumptions();
    resetDryMassCalcState();
    resetChartStateToDefaults();
    const applied = applyPresetToState(parsed);
    const actual = JSON.stringify(exportedDryMassCalculatorPreset());
    const importedModuleEffects = currentModuleEffectAssumptions();
    dryMassCalcState.slotModules = ["MuonSpiker", "Empty", "HydronTrap"];
    const dryMassSourceAssumptions = currentModuleEffectAssumptions({
      moduleEffectsEnabled: true,
      moduleEffectSource: "dryMassCalculator",
      moduleEffectModuleIds: ["NeutroniumSpiker"],
    });
    return {
      applied,
      expected,
      actual,
      exportedField: !!parsed.dryMassCalculator,
      moduleFieldsExported: JSON.stringify(exportedModuleEffects) === JSON.stringify(expectedModuleEffects),
      moduleFieldsRoundTrip: importedModuleEffects.moduleEffectsEnabled === true
        && importedModuleEffects.moduleEffectSource === "manual"
        && importedModuleEffects.moduleEffectModuleIds.join("|") === "MuonSpiker|HydronTrap"
        && importedModuleEffects.moduleIds.join("|") === "MuonSpiker|HydronTrap",
      oldPresetApplied: oldApplied,
      oldPresetDefaults: oldModuleEffects.moduleEffectsEnabled === false
        && oldModuleEffects.moduleEffectSource === "dryMassCalculator"
        && oldModuleEffects.moduleEffectModuleIds.length === 0
        && oldModuleEffects.moduleIds.length === 0,
      dryMassSourceIds: dryMassSourceAssumptions.activeModuleIds.join("|"),
    };
  });
  expect(presetRoundTrip.exportedField, `${htmlFile}: exported preset did not include dry-mass calculator state`);
  expect(presetRoundTrip.applied, `${htmlFile}: preset with dry-mass calculator state was not accepted`);
  expect(presetRoundTrip.moduleFieldsExported, `${htmlFile}: exported preset did not include validated module-effect fields`);
  expect(presetRoundTrip.moduleFieldsRoundTrip, `${htmlFile}: module-effect fields did not round-trip through preset import/export`);
  expect(presetRoundTrip.oldPresetApplied, `${htmlFile}: old preset without module-effect fields was not accepted`);
  expect(presetRoundTrip.oldPresetDefaults, `${htmlFile}: old preset without module-effect fields did not reset to safe defaults`);
  expect(presetRoundTrip.dryMassSourceIds === "MuonSpiker|HydronTrap", `${htmlFile}: dry-mass source module-effect assumptions did not derive selected utility IDs`);
  expect(
    presetRoundTrip.actual === presetRoundTrip.expected,
    `${htmlFile}: dry-mass calculator state did not round-trip through preset import/export`,
  );

  const namedPresetRoundTrip = await page.evaluate(async () => {
    localStorage.removeItem(CHART_PRESET_STORAGE_KEY);
    localStorage.removeItem(CHART_PRESET_STARTUP_STORAGE_KEY);
    localStorage.removeItem(DRY_MASS_PRESET_STORAGE_KEY);
    chartPresetLibrary = [];
    dryMassPresetLibrary = [];
    setStartupChartPreset("");
    renderPresetLibraryControls();

    resetDryMassCalcState();
    dryMassCalcState.notes = "snapshot design notes";
    dryMassCalcState.simulationDefaults = {
      targetDvKps: 777,
      minTwr: 0.42,
      radiatorId: DATA.radiators[0] ? DATA.radiators[0].id : state.radiatorId,
    };
    const designSnapshot = saveDryMassPresetFromCalculator("Design Snapshot", exportedDryMassCalculatorPreset());
    renderDryMassPresetControls(designSnapshot && designSnapshot.id);

    state.dryMassTons = 12345;
    state.targetDvKps = 321;
    state.thrusters = 4;
    state.searchTerm = "alpha";
    state.moduleEffectsEnabled = true;
    state.moduleEffectSource = "manual";
    state.moduleEffectModuleIds = ["MuonSpiker", "MissingModule", "HydronTrap", "MuonSpiker"];
    const chartA = saveChartPresetFromSettings("Scenario Alpha", exportedPreset());

    state.dryMassTons = 67890;
    state.targetDvKps = 654;
    state.thrusters = 2;
    const chartB = saveChartPresetFromSettings("Scenario Beta", exportedPreset());
    const startupSaved = setStartupChartPreset(chartA.id);

    const chartLibraryPayload = await serializePayloadObject(chartPresetLibraryExportObject());
    const parsedChartLibrary = await parsePresetPayload(chartLibraryPayload);
    chartPresetLibrary = [];
    saveChartPresetLibrary();
    const chartImport = await handleImportedPresetObject(parsedChartLibrary, { promptToSaveCurrent: false });
    const chartCountAfterLibraryImport = chartPresetLibrary.length;
    const startupRestored = startupChartPresetId === chartA.id;
    const loadedChart = chartPresetLibrary.find(item => item.name === "Scenario Alpha");
    dryMassPresetLibrary = [];
    saveDryMassPresetLibrary();
    const chartApplied = !!loadedChart && applyPresetToState(loadedChart.settings);
    const chartLoadedAfterManualApply = {
      dryMass: state.dryMassTons,
      dv: state.targetDvKps,
      thrusters: state.thrusters,
      search: state.searchTerm,
      designCount: dryMassPresetLibrary.length,
      designNotes: dryMassPresetLibrary[0] && dryMassPresetLibrary[0].calculator.notes,
      designDv: dryMassPresetLibrary[0] && dryMassPresetLibrary[0].calculator.simulationDefaults && dryMassPresetLibrary[0].calculator.simulationDefaults.targetDvKps,
      designMinTwr: dryMassPresetLibrary[0] && dryMassPresetLibrary[0].calculator.simulationDefaults && dryMassPresetLibrary[0].calculator.simulationDefaults.minTwr,
      moduleEffects: currentModuleEffectAssumptions(),
    };

    const chartSelectedPayload = await serializePayloadObject(chartPresetExportObject(chartB));
    const parsedSelectedChart = await parsePresetPayload(chartSelectedPayload);
    chartPresetLibrary = [];
    saveChartPresetLibrary();
    const selectedChartImport = await handleImportedPresetObject(parsedSelectedChart, { promptToSaveCurrent: false });

    resetDryMassCalcState();
    dryMassPresetLibrary = [];
    saveDryMassPresetLibrary();
    dryMassCalcState.notes = "alpha notes";
    const dryMassA = saveDryMassPresetFromCalculator("Hull Alpha", exportedDryMassCalculatorPreset());
    resetDryMassCalcState();
    const dryMassApplied = !!dryMassA && applyDryMassCalculatorPreset(dryMassA.calculator);
    const dryMassNotesRestored = dryMassCalcState.notes === "alpha notes";

    const dryMassLibraryPayload = await serializePayloadObject(dryMassPresetLibraryExportObject());
    const parsedDryMassLibrary = await parsePresetPayload(dryMassLibraryPayload);
    dryMassPresetLibrary = [];
    saveDryMassPresetLibrary();
    const dryMassImport = await handleImportedPresetObject(parsedDryMassLibrary, {
      preferredKind: "dryMass",
      promptToSaveCurrent: false,
    });
    const dryMassCountAfterLibraryImport = dryMassPresetLibrary.length;

    const dryMassSelectedPayload = await serializePayloadObject(dryMassPresetExportObject(dryMassPresetLibrary[0]));
    const parsedSelectedDryMass = await parsePresetPayload(dryMassSelectedPayload);
    dryMassPresetLibrary = [];
    saveDryMassPresetLibrary();
    const selectedDryMassImport = await handleImportedPresetObject(parsedSelectedDryMass, {
      preferredKind: "dryMass",
      promptToSaveCurrent: false,
    });
    const selectedDryMassImportedId = dryMassPresetLibrary[0] && dryMassPresetLibrary[0].id;
    const selectedDryMassCountAfterImport = dryMassPresetLibrary.length;
    const selectedDryMassImportSelected = document.getElementById("dryMassPresetSelect")?.value === selectedDryMassImportedId;
    const selectedDryMassImportApplied = dryMassCalcState.notes === "alpha notes";

    dryMassPresetLibrary = [];
    saveDryMassPresetLibrary();
    resetDryMassCalcState();
    dryMassCalcState.notes = "overwrite baseline";
    const savedBase = saveDryMassPresetFromCalculator("Variant", exportedDryMassCalculatorPreset());
    renderDryMassPresetControls(savedBase && savedBase.id);
    dryMassCalcState.notes = "overwrite update";
    const originalPrompt = window.prompt;
    let savePromptCount = 0;
    window.prompt = () => {
      savePromptCount += 1;
      return "Should Not Prompt";
    };
    document.getElementById("dryMassPresetSave").click();
    const saveOverwriteOk = dryMassPresetLibrary.length === 1
      && dryMassPresetLibrary[0].id === savedBase.id
      && dryMassPresetLibrary[0].calculator.notes === "overwrite update"
      && savePromptCount === 0;
    let saveAsNewPromptCount = 0;
    dryMassCalcState.notes = "copy update";
    window.prompt = () => {
      saveAsNewPromptCount += 1;
      return "Variant";
    };
    document.getElementById("dryMassPresetSaveAsNew").click();
    window.prompt = originalPrompt;
    const copiedPreset = dryMassPresetLibrary.find(item => item.name === "Variant (2)");
    const saveAsNewOk = dryMassPresetLibrary.length === 2
      && !!copiedPreset
      && copiedPreset.id !== savedBase.id
      && copiedPreset.calculator.notes === "copy update"
      && saveAsNewPromptCount === 1;

    dryMassPresetLibrary = [
      { id: "design-z", name: "Internal Search Token", displayName: { en: "Zulu", ko: "줄루" }, calculator: exportedDryMassCalculatorPreset(), createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      { id: "design-a", name: "Hidden Alpha Token", displayName: { en: "Alpha", ko: "알파" }, calculator: exportedDryMassCalculatorPreset(), createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      { id: "design-b", name: "Hidden Beta Token", displayName: { en: "Beta", ko: "베타" }, calculator: exportedDryMassCalculatorPreset(), createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    ];
    saveDryMassPresetLibrary();
    setLanguage("en", { rerender: false });
    renderDryMassPresetControls("design-z");
    const dryMassSelect = document.getElementById("dryMassPresetSelect");
    const dryMassSearchable = dryMassSelect?.nextElementSibling;
    const dryMassSearchInput = dryMassSearchable?.querySelector(".searchable-select-search");
    const dryMassSearchTrigger = dryMassSearchable?.querySelector(".searchable-select-trigger");
    const sortedDryMassLabels = [...dryMassSelect.querySelectorAll("option")]
      .filter(option => option.value.startsWith("design-"))
      .map(option => option.textContent.trim());
    dryMassSearchTrigger?.click();
    dryMassSearchInput.value = "alpha";
    dryMassSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
    const alphaMatches = dryMassSearchable
      ? [...dryMassSearchable.querySelectorAll(".searchable-select-option")].map(option => option.textContent.trim())
      : [];
    dryMassSearchInput.value = "hidden";
    dryMassSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
    const hiddenMatches = dryMassSearchable
      ? dryMassSearchable.querySelectorAll(".searchable-select-option").length
      : -1;
    dryMassSearchInput.value = "";
    dryMassSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
    const restoredSearchCount = dryMassSearchable
      ? dryMassSearchable.querySelectorAll(".searchable-select-option").length
      : -1;
    const dryMassSearchableOk = !!dryMassSearchable
      && sortedDryMassLabels.join("|") === "Alpha|Beta|Zulu"
      && alphaMatches.length === 1
      && alphaMatches[0] === "Alpha"
      && hiddenMatches === 0
      && restoredSearchCount === 3;

    const chartControls = [
      "#chartPresetSelect",
      "#chartPresetSave",
      "#chartPresetActionsMenu",
      "#chartPresetRename",
      "#chartPresetDelete",
      "#chartPresetSetStartup",
      "#chartPresetClearStartup",
      "#presetExport",
      "#presetImport",
      "#presetExportModal",
      "#presetExportOutput",
      "#presetExportCopy",
    ].every(selector => !!document.querySelector(selector))
      && !document.querySelector("#chartPresetLoad")
      && !document.querySelector("#chartPresetReset")
      && !document.querySelector("#chartPresetDuplicate")
      && !document.querySelector("#chartPresetExportSelected")
      && !document.querySelector("#chartPresetExportAll");
    const dryMassControls = [
      "#dryMassPresetSelect",
      "#dryMassPresetSave",
      "#dryMassPresetSaveAsNew",
      "#dryMassPresetRename",
      "#dryMassPresetDelete",
      "#dryMassPresetActionsMenu",
      "#dryMassPresetExportSelected",
      "#dryMassPresetImport",
      "#shipPresetTargetDv",
      "#shipPresetMinTwr",
      "#shipPresetRadiator",
      "#dryMassCalcApplyWithDefaults",
    ].every(selector => !!document.querySelector(selector))
      && !document.querySelector("#dryMassPresetLoad")
      && !document.querySelector("#dryMassPresetDuplicate")
      && !document.querySelector("#dryMassPresetExportAll");

    const result = {
      chartCountAfterLibraryImport,
      chartImportOk: chartImport.ok,
      chartApplied,
      chartLoadedDryMass: chartLoadedAfterManualApply.dryMass,
      chartLoadedDv: chartLoadedAfterManualApply.dv,
      chartLoadedThrusters: chartLoadedAfterManualApply.thrusters,
      chartLoadedSearch: chartLoadedAfterManualApply.search,
      chartLoadedDesignCount: chartLoadedAfterManualApply.designCount,
      chartLoadedDesignNotes: chartLoadedAfterManualApply.designNotes,
      chartLoadedDesignDv: chartLoadedAfterManualApply.designDv,
      chartLoadedDesignMinTwr: chartLoadedAfterManualApply.designMinTwr,
      chartLoadedModuleEffects: chartLoadedAfterManualApply.moduleEffects,
      selectedChartImportOk: selectedChartImport.ok,
      selectedChartCount: chartPresetLibrary.length,
      startupSaved,
      startupRestored,
      dryMassApplied,
      dryMassNotesRestored,
      dryMassImportOk: dryMassImport.ok,
      dryMassCountAfterLibraryImport,
      selectedDryMassImportOk: selectedDryMassImport.ok,
      selectedDryMassCount: selectedDryMassCountAfterImport,
      selectedDryMassImportSelected,
      selectedDryMassImportApplied,
      saveOverwriteOk,
      saveAsNewOk,
      dryMassSearchableOk,
      chartControls,
      dryMassControls,
    };

    localStorage.removeItem(CHART_PRESET_STORAGE_KEY);
    localStorage.removeItem(CHART_PRESET_STARTUP_STORAGE_KEY);
    localStorage.removeItem(DRY_MASS_PRESET_STORAGE_KEY);
    chartPresetLibrary = [];
    dryMassPresetLibrary = [];
    setStartupChartPreset("");
    resetChartStateToDefaults();
    syncUiFromState();
    renderPresetLibraryControls();

    return result;
  });
  expect(namedPresetRoundTrip.chartImportOk, `${htmlFile}: chart preset library import failed`);
  expect(namedPresetRoundTrip.chartCountAfterLibraryImport === 2, `${htmlFile}: chart preset library did not merge two presets`);
  expect(namedPresetRoundTrip.chartApplied, `${htmlFile}: named chart preset did not apply`);
  expect(namedPresetRoundTrip.chartLoadedDryMass === 12345, `${htmlFile}: named chart preset did not restore dry mass`);
  expect(namedPresetRoundTrip.chartLoadedDv === 321, `${htmlFile}: named chart preset did not restore target dV`);
  expect(namedPresetRoundTrip.chartLoadedThrusters === 4, `${htmlFile}: named chart preset did not restore engine count`);
  expect(namedPresetRoundTrip.chartLoadedSearch === "alpha", `${htmlFile}: named chart preset did not restore search filter`);
  expect(namedPresetRoundTrip.chartLoadedDesignCount === 1, `${htmlFile}: named chart preset did not restore design preset library`);
  expect(namedPresetRoundTrip.chartLoadedDesignNotes === "snapshot design notes", `${htmlFile}: named chart preset did not restore design preset content`);
  expect(namedPresetRoundTrip.chartLoadedDesignDv === 777, `${htmlFile}: named chart preset did not restore design preset simulation defaults`);
  expect(Math.abs(namedPresetRoundTrip.chartLoadedDesignMinTwr - 0.42) < 1e-9, `${htmlFile}: named chart preset did not restore design preset minimum TWR`);
  expect(
    namedPresetRoundTrip.chartLoadedModuleEffects
      && namedPresetRoundTrip.chartLoadedModuleEffects.moduleEffectsEnabled === true
      && namedPresetRoundTrip.chartLoadedModuleEffects.moduleEffectSource === "manual"
      && namedPresetRoundTrip.chartLoadedModuleEffects.moduleEffectModuleIds.join("|") === "MuonSpiker|HydronTrap",
    `${htmlFile}: named chart preset did not restore module-effect assumption fields`,
  );
  expect(namedPresetRoundTrip.selectedChartImportOk, `${htmlFile}: selected chart preset import failed`);
  expect(namedPresetRoundTrip.selectedChartCount === 1, `${htmlFile}: selected chart preset import did not add one preset`);
  expect(namedPresetRoundTrip.startupSaved && namedPresetRoundTrip.startupRestored, `${htmlFile}: startup chart preset did not persist through library export/import`);
  expect(namedPresetRoundTrip.dryMassApplied, `${htmlFile}: dry-mass preset did not apply to calculator`);
  expect(namedPresetRoundTrip.dryMassNotesRestored, `${htmlFile}: dry-mass preset notes did not restore`);
  expect(namedPresetRoundTrip.dryMassImportOk, `${htmlFile}: dry-mass preset library import failed`);
  expect(namedPresetRoundTrip.dryMassCountAfterLibraryImport === 1, `${htmlFile}: dry-mass preset library did not merge one preset`);
  expect(namedPresetRoundTrip.selectedDryMassImportOk, `${htmlFile}: selected dry-mass preset import failed`);
  expect(namedPresetRoundTrip.selectedDryMassCount === 1, `${htmlFile}: selected dry-mass preset import did not add one preset`);
  expect(namedPresetRoundTrip.selectedDryMassImportSelected, `${htmlFile}: selected dry-mass preset import did not move the dropdown selection`);
  expect(namedPresetRoundTrip.selectedDryMassImportApplied, `${htmlFile}: selected dry-mass preset import did not apply the imported calculator state`);
  expect(namedPresetRoundTrip.saveOverwriteOk, `${htmlFile}: dry-mass Save did not overwrite the selected user preset without creating a duplicate`);
  expect(namedPresetRoundTrip.saveAsNewOk, `${htmlFile}: dry-mass Save as New did not create a separate unique-name preset`);
  expect(namedPresetRoundTrip.dryMassSearchableOk, `${htmlFile}: dry-mass preset searchable dropdown did not sort or filter by displayed label`);
  expect(namedPresetRoundTrip.chartControls, `${htmlFile}: chart preset management controls missing`);
  expect(namedPresetRoundTrip.dryMassControls, `${htmlFile}: dry-mass preset management controls missing`);

  const footerLayout = await page.evaluate(() => {
    const footer = document.querySelector("#dryMassCalcModal .dry-mass-modal-footer");
    const summary = footer?.querySelector(".dry-mass-summary-row");
    const total = document.getElementById("dryMassCalcTotal");
    const breakdown = document.getElementById("dryMassCalcBreakdown");
    const actions = footer?.querySelector(".dry-mass-modal-actions");
    if (!footer || !summary || !total || !breakdown || !actions) return null;
    const footerBox = footer.getBoundingClientRect();
    const summaryBox = summary.getBoundingClientRect();
    const totalBox = total.getBoundingClientRect();
    const breakdownBox = breakdown.getBoundingClientRect();
    const actionsBox = actions.getBoundingClientRect();
    return {
      actionsBelowSummary: actionsBox.top >= summaryBox.bottom - 1,
      totalAndCapsulesSameRow: Math.abs(totalBox.top - breakdownBox.top) < 8,
      capsulesRightAligned: Math.abs(breakdownBox.right - summaryBox.right) < 2,
      noHorizontalOverflow: summaryBox.right <= footerBox.right + 1 && actionsBox.right <= footerBox.right + 1,
    };
  });
  expect(!!footerLayout, `${htmlFile}: dry-mass modal footer layout elements missing`);
  if (footerLayout) {
    expect(footerLayout.actionsBelowSummary, `${htmlFile}: dry-mass modal actions should render on a separate row`);
    expect(footerLayout.totalAndCapsulesSameRow, `${htmlFile}: dry-mass total and breakdown capsules should share a summary row`);
    expect(footerLayout.capsulesRightAligned, `${htmlFile}: dry-mass breakdown capsules should align to the right`);
    expect(footerLayout.noHorizontalOverflow, `${htmlFile}: dry-mass modal footer overflows horizontally`);
  }

  await page.locator("#shipPresetMinTwr").evaluate(input => {
    input.value = "0.37";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator("#dryMassCalcApplyWithDefaults").click();
  await page.waitForFunction(() => !document.querySelector("#dryMassCalcModal")?.classList.contains("is-open"), null, { timeout: 5000 });
  const minTwrAppliedFromDesignDefaults = await page.evaluate(() => Math.abs(state.minTwr - 0.37) < 1e-9);
  expect(minTwrAppliedFromDesignDefaults, `${htmlFile}: dry-mass Apply with defaults did not apply minimum TWR`);
  await page.locator("#dryMassCalcButton").click();
  await page.waitForSelector("#dryMassCalcModal.is-open", { timeout: 5000 });
  const notesBox = await page.locator("#dryMassCalcNotes").boundingBox();
  expect(!!notesBox, `${htmlFile}: dry-mass notes field was not measurable`);
  if (notesBox) {
    await page.mouse.move(notesBox.x + 8, notesBox.y + Math.min(12, notesBox.height / 2));
    await page.mouse.down();
    await page.mouse.move(8, 8);
    await page.mouse.up();
    await page.waitForTimeout(100);
    expect(await page.locator("#dryMassCalcModal.is-open").count() === 1, `${htmlFile}: dry-mass modal closed after a drag that started inside the memo field`);
    await page.mouse.click(8, 8);
    await page.waitForFunction(() => !document.querySelector("#dryMassCalcModal")?.classList.contains("is-open"), null, { timeout: 5000 });
  }

  const metricSearchable = page.locator("#metric + .searchable-select");
  await metricSearchable.locator(".searchable-select-trigger").click();
  await metricSearchable.locator(".searchable-select-search").fill("twr");
  const twrSearchOptions = await metricSearchable.locator('.searchable-select-option[data-value="twr"]').count();
  expect(twrSearchOptions > 0, `${htmlFile}: searchable select did not filter to the TWR option`);
  await metricSearchable.locator('.searchable-select-option[data-value="twr"]').first().click();
  await page.waitForTimeout(100);
  expect(await page.locator("#metric").inputValue() === "twr", `${htmlFile}: searchable select did not apply selected metric`);
  expect(await metricSearchable.locator(".searchable-select-menu").isHidden(), `${htmlFile}: searchable select menu did not close after selection`);

  const leftPanelRoundTrip = await page.evaluate(() => {
    localStorage.removeItem(LEFT_PANEL_LAYOUT_STORAGE_KEY);
    leftPanelLayout = loadLeftPanelLayout();
    applyLeftPanelOrder();
    const displayCard = document.querySelector('.control-card[data-control-card="display"]');
    const filterCard = document.querySelector('.control-card[data-control-card="filter"]');
    displayCard.querySelector("[data-card-toggle]").click();
    filterCard.querySelector('[data-panel-move="up"]').click();
    const stored = JSON.parse(localStorage.getItem(LEFT_PANEL_LAYOUT_STORAGE_KEY));
    return {
      displayCollapsed: displayCard.dataset.collapsed === "true",
      storedDisplayCollapsed: stored.collapsed.display === true,
      storedOrder: stored.order,
    };
  });
  expect(leftPanelRoundTrip.displayCollapsed, `${htmlFile}: left panel display card did not collapse`);
  expect(leftPanelRoundTrip.storedDisplayCollapsed, `${htmlFile}: left panel collapsed state did not persist to localStorage`);
  expect(
    Array.isArray(leftPanelRoundTrip.storedOrder)
      && leftPanelRoundTrip.storedOrder.indexOf("filter") < leftPanelRoundTrip.storedOrder.indexOf("simulation"),
    `${htmlFile}: left panel order change did not persist to localStorage`,
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#chart .data-point", { timeout: 15000 });
  const leftPanelAfterReload = await page.evaluate(() => {
    const displayCard = document.querySelector('.control-card[data-control-card="display"]');
    const cards = [...document.querySelectorAll(".control-card[data-control-card]")].map(card => card.dataset.controlCard);
    return {
      displayCollapsed: displayCard.dataset.collapsed === "true",
      order: cards,
    };
  });
  expect(leftPanelAfterReload.displayCollapsed, `${htmlFile}: left panel collapsed state did not restore after reload`);
  expect(
    leftPanelAfterReload.order.indexOf("filter") < leftPanelAfterReload.order.indexOf("simulation"),
    `${htmlFile}: left panel order did not restore after reload`,
  );
  await page.locator("#resetLeftPanelLayout").click();
  await page.waitForTimeout(100);

  const zoomBefore = await page.evaluate(() => window.TI_ENGINE_CHART_DEBUG.axisSnapshot());
  expect(!!zoomBefore && !zoomBefore.zoomed, `${htmlFile}: initial debug snapshot unexpectedly zoomed`);
  const chartBox = await page.locator("#chart").boundingBox();
  expect(!!chartBox, `${htmlFile}: chart has no screen box for zoom smoke`);
  if (chartBox) {
    await page.mouse.move(chartBox.x + chartBox.width / 2, chartBox.y + chartBox.height / 2);
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(120);
  }
  const zoomAfter = await page.evaluate(() => window.TI_ENGINE_CHART_DEBUG.axisSnapshot());
  expect(!!zoomAfter && zoomAfter.zoomed, `${htmlFile}: wheel zoom did not create zoom state`);
  expect(
    zoomAfter
      && zoomAfter.x.domain.every(Number.isFinite)
      && zoomAfter.y.domain.every(Number.isFinite)
      && zoomAfter.x.tickCount >= 2
      && zoomAfter.y.tickCount >= 2,
    `${htmlFile}: debug snapshot did not return finite axis metadata after zoom`,
  );
  await page.locator("#resetZoom").click();
  await page.waitForTimeout(100);
  const zoomReset = await page.evaluate(() => window.TI_ENGINE_CHART_DEBUG.axisSnapshot());
  expect(!!zoomReset && !zoomReset.zoomed, `${htmlFile}: reset zoom did not clear zoom state`);

  const firstPoint = page.locator("#chart .data-point").first();
  const pointBox = await firstPoint.boundingBox();
  expect(!!pointBox, `${htmlFile}: first data point has no screen box`);
  if (pointBox) {
    await page.mouse.move(pointBox.x + pointBox.width / 2, pointBox.y + pointBox.height / 2);
  }
  await page.waitForSelector("#tooltip .tooltip-item", { timeout: 10000 });
  const cardCountAfterHover = await page.locator("#tooltip .tooltip-item").count();
  expect(cardCountAfterHover > 0, `${htmlFile}: hover did not create detail card`);

  if (pointBox) {
    await page.mouse.click(pointBox.x + pointBox.width / 2, pointBox.y + pointBox.height / 2);
  }
  await page.waitForTimeout(80);

  const firstPin = page.locator("#tooltip .tooltip-item-pin").first();
  await firstPin.click();
  expect(await firstPin.getAttribute("aria-pressed") === "true", `${htmlFile}: card pin did not toggle on`);
  expect(await page.locator("#tooltip .tooltip-item.is-pinned").count() > 0, `${htmlFile}: pinned card styling missing`);

  await page.locator("#thrusters").evaluate(input => {
    input.value = "2";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(100);
  const pinnedCountAfterThrusterChange = await page.locator("#tooltip .tooltip-item.is-pinned").count();
  const pinnedTitleAfterThrusterChange = pinnedCountAfterThrusterChange
    ? await page.locator("#tooltip .tooltip-item.is-pinned h2").first().innerText()
    : "";
  expect(pinnedCountAfterThrusterChange > 0, `${htmlFile}: changing engine count removed pinned card`);
  expect(/\bx2\b/.test(pinnedTitleAfterThrusterChange), `${htmlFile}: pinned card did not follow engine count change`);

  await page.locator(".tooltip-close").click();
  expect(await page.locator("#tooltip .tooltip-item.is-pinned").count() > 0, `${htmlFile}: clear-all removed pinned cards`);
  await page.locator("#tooltip .tooltip-item-close").first().click();
  expect(await page.locator("#tooltip .usage-panel").count() > 0, `${htmlFile}: removing final pinned card did not restore usage panel`);

  expect(consoleErrors.length === 0, `${htmlFile}: console errors: ${consoleErrors.join(" | ")}`);
  expect(pageErrors.length === 0, `${htmlFile}: page errors: ${pageErrors.join(" | ")}`);

  await page.close();
}

const launchOptions = { headless: true };
if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
  launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
}

let staticServer = null;
let browser = null;
try {
  staticServer = process.env.PLAYWRIGHT_BASE_URL ? null : await startStaticHttpServer(process.cwd());
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || staticServer.baseUrl;
  browser = await chromium.launch(launchOptions);
  for (const htmlFile of htmlFiles) {
    await verifyHtmlFile(browser, htmlFile, baseUrl);
  }
} finally {
  if (browser) await browser.close();
  if (staticServer) await staticServer.close();
}

if (failures.length) {
  console.error(failures.map(message => `- ${message}`).join("\n"));
  process.exit(1);
}

console.log(`Browser verification passed for ${htmlFiles.join(", ")}`);
