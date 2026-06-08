import { pathToFileURL } from "node:url";
import { isAbsolute, relative, resolve } from "node:path";
import { chromium } from "playwright";

const htmlFiles = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["docs/index.html"];

const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function htmlFileUrl(htmlFile) {
  const absolutePath = resolve(htmlFile);
  if (!process.env.PLAYWRIGHT_BASE_URL) return pathToFileURL(absolutePath).href;

  const baseUrl = process.env.PLAYWRIGHT_BASE_URL.endsWith("/")
    ? process.env.PLAYWRIGHT_BASE_URL
    : `${process.env.PLAYWRIGHT_BASE_URL}/`;
  const pagePath = (isAbsolute(htmlFile) ? relative(process.cwd(), absolutePath) : htmlFile)
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
  return new URL(pagePath, baseUrl).href;
}

async function setLanguage(page, value) {
  await page.locator("#uiLanguageSelect").selectOption(value);
  await page.waitForTimeout(100);
}

async function verifyHtmlFile(browser, htmlFile) {
  const targetUrl = htmlFileUrl(htmlFile);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.route("**/favicon.ico", route => route.fulfill({ status: 204, body: "" }));

  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#chart .data-point", { timeout: 15000 });

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
  const filterSummaryChecks = await page.evaluate(() => {
    const summaryText = () => document.querySelector('.control-card[data-control-card="filter"] [data-card-summary]')?.textContent || "";

    setLanguage("en", { rerender: false });
    Object.assign(state, { metric: "totalMassTons", minTwr: 0.25, minDvKps: 125, logX: true, logY: true });
    syncUiFromState();
    updateLeftPanelCardSummaries();
    const totalMassSummary = summaryText();

    Object.assign(state, { metric: "twr", minTwr: 0.25, minDvKps: 125, logX: true, logY: true });
    syncUiFromState();
    updateLeftPanelCardSummaries();
    const twrSummary = summaryText();

    setLanguage("ko", { rerender: false });
    Object.assign(state, { metric: "totalMassTons", minTwr: 0.25, minDvKps: 125, logX: true, logY: true });
    syncUiFromState();
    updateLeftPanelCardSummaries();
    const koreanSummary = summaryText();

    resetChartStateToDefaults();
    setLanguage("en", { rerender: false });
    syncUiFromState();
    updateLeftPanelCardSummaries();

    return { totalMassSummary, twrSummary, koreanSummary };
  });
  expect(
    /TWR/.test(filterSummaryChecks.totalMassSummary) && !/dV/.test(filterSummaryChecks.totalMassSummary),
    `${htmlFile}: total-mass filter summary should show only the TWR threshold`,
  );
  expect(
    /dV/.test(filterSummaryChecks.twrSummary) && !/TWR/.test(filterSummaryChecks.twrSummary),
    `${htmlFile}: TWR filter summary should show only the dV threshold`,
  );
  expect(
    /X축 로그/.test(filterSummaryChecks.koreanSummary)
      && /Y축 로그/.test(filterSummaryChecks.koreanSummary)
      && !/log X|log Y|Log X|Log Y/.test(filterSummaryChecks.koreanSummary),
    `${htmlFile}: Korean filter summary should localize log axis labels`,
  );

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

    resetChartStateToDefaults();
    setLanguage("en", { rerender: false });
    state.metric = "totalMassTons";
    syncUiFromState();
    render();
    const baseMode = {
      selected: selectedPowerResearchView(),
      controlVisible: getComputedStyle(document.getElementById("powerResearchViewControl")).display !== "none",
      basePoints: document.querySelectorAll("#chart .power-base-point").length,
      extraPoints: document.querySelectorAll("#chart .power-extra-point").length,
      ladderLines: document.querySelectorAll("#chart .power-ladder-line").length,
      bandSurfaces: document.querySelectorAll("#chart [data-band-pair-step], #chart [data-band-step]").length,
    };
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
      bandSurfaces: document.querySelectorAll("#chart [data-band-pair-step], #chart [data-band-step]").length,
    };

    resetChartStateToDefaults();
    setLanguage("ko", { rerender: false });
    syncUiFromState();
    render();
    return { baseMode, hasMultiOptionTarget: !!target, focusIdle, focusActive, allMode };
  });
  expect(powerViewChecks.baseMode.controlVisible, `${htmlFile}: Power view control is hidden on band metric`);
  expect(powerViewChecks.baseMode.selected === "off", `${htmlFile}: Base mode is not the default Power view`);
  expect(powerViewChecks.baseMode.basePoints > 0, `${htmlFile}: Base mode did not render base points`);
  expect(powerViewChecks.baseMode.extraPoints === 0, `${htmlFile}: Base mode rendered extra power points`);
  expect(powerViewChecks.baseMode.ladderLines === 0, `${htmlFile}: Base mode rendered ladder lines`);
  expect(powerViewChecks.baseMode.bandSurfaces === 0, `${htmlFile}: Base mode rendered old power band surfaces`);
  expect(powerViewChecks.hasMultiOptionTarget, `${htmlFile}: no multi-power-option drive available for ladder verification`);
  expect(powerViewChecks.focusIdle.selected === "focus", `${htmlFile}: Selected ladder Power view did not select focus mode`);
  expect(powerViewChecks.focusIdle.basePoints > 0, `${htmlFile}: Selected ladder mode removed base points`);
  expect(powerViewChecks.focusIdle.extraPoints === 0, `${htmlFile}: idle Selected ladder mode rendered unrelated extra points`);
  expect(powerViewChecks.focusActive.extraPoints > 0, `${htmlFile}: active Selected ladder mode did not render extra points`);
  expect(powerViewChecks.focusActive.focusedExtraPoints === powerViewChecks.focusActive.extraPoints, `${htmlFile}: focus extra points were not marked focused`);
  expect(powerViewChecks.focusActive.focusedLines > 0, `${htmlFile}: active Selected ladder mode did not render focused dashed lines`);
  expect(powerViewChecks.focusActive.powerStepRows > 1, `${htmlFile}: Power steps table did not include multiple power options`);
  expect(/Wet mass/.test(powerViewChecks.focusActive.powerStepText) && /TWR/.test(powerViewChecks.focusActive.powerStepText), `${htmlFile}: Power steps table missing key columns`);
  expect(powerViewChecks.allMode.selected === "all", `${htmlFile}: All ladders Power view did not select all mode`);
  expect(powerViewChecks.allMode.extraPoints > 0, `${htmlFile}: All ladders mode did not render extra points`);
  expect(powerViewChecks.allMode.subduedExtraPoints > 0, `${htmlFile}: All ladders mode did not apply subdued point styling`);
  expect(powerViewChecks.allMode.ladderLines > 0 && powerViewChecks.allMode.subduedLines > 0, `${htmlFile}: All ladders mode did not render subdued ladder lines`);
  expect(powerViewChecks.allMode.bandSurfaces === 0, `${htmlFile}: All ladders mode rendered old power band surfaces`);

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
  await page.locator("#dryMassPresetActionsMenu > summary").click();
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

    const expected = JSON.stringify(exportedDryMassCalculatorPreset());
    const serialized = await serializePresetPayload();
    const parsed = await parsePresetPayload(serialized);
    resetDryMassCalcState();
    const applied = applyPresetToState(parsed);
    return {
      applied,
      expected,
      actual: JSON.stringify(exportedDryMassCalculatorPreset()),
      exportedField: !!parsed.dryMassCalculator,
    };
  });
  expect(presetRoundTrip.exportedField, `${htmlFile}: exported preset did not include dry-mass calculator state`);
  expect(presetRoundTrip.applied, `${htmlFile}: preset with dry-mass calculator state was not accepted`);
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
      radiatorId: DATA.radiators[0] ? DATA.radiators[0].id : state.radiatorId,
    };
    const designSnapshot = saveDryMassPresetFromCalculator("Design Snapshot", exportedDryMassCalculatorPreset());
    renderDryMassPresetControls(designSnapshot && designSnapshot.id);

    state.dryMassTons = 12345;
    state.targetDvKps = 321;
    state.thrusters = 4;
    state.searchTerm = "alpha";
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
      "#dryMassPresetRename",
      "#dryMassPresetDelete",
      "#dryMassPresetActionsMenu",
      "#dryMassPresetExportSelected",
      "#dryMassPresetImport",
      "#shipPresetTargetDv",
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
      selectedChartImportOk: selectedChartImport.ok,
      selectedChartCount: chartPresetLibrary.length,
      startupSaved,
      startupRestored,
      dryMassApplied,
      dryMassNotesRestored,
      dryMassImportOk: dryMassImport.ok,
      dryMassCountAfterLibraryImport,
      selectedDryMassImportOk: selectedDryMassImport.ok,
      selectedDryMassCount: dryMassPresetLibrary.length,
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
  expect(namedPresetRoundTrip.selectedChartImportOk, `${htmlFile}: selected chart preset import failed`);
  expect(namedPresetRoundTrip.selectedChartCount === 1, `${htmlFile}: selected chart preset import did not add one preset`);
  expect(namedPresetRoundTrip.startupSaved && namedPresetRoundTrip.startupRestored, `${htmlFile}: startup chart preset did not persist through library export/import`);
  expect(namedPresetRoundTrip.dryMassApplied, `${htmlFile}: dry-mass preset did not apply to calculator`);
  expect(namedPresetRoundTrip.dryMassNotesRestored, `${htmlFile}: dry-mass preset notes did not restore`);
  expect(namedPresetRoundTrip.dryMassImportOk, `${htmlFile}: dry-mass preset library import failed`);
  expect(namedPresetRoundTrip.dryMassCountAfterLibraryImport === 1, `${htmlFile}: dry-mass preset library did not merge one preset`);
  expect(namedPresetRoundTrip.selectedDryMassImportOk, `${htmlFile}: selected dry-mass preset import failed`);
  expect(namedPresetRoundTrip.selectedDryMassCount === 1, `${htmlFile}: selected dry-mass preset import did not add one preset`);
  expect(namedPresetRoundTrip.chartControls, `${htmlFile}: chart preset management controls missing`);
  expect(namedPresetRoundTrip.dryMassControls, `${htmlFile}: dry-mass preset management controls missing`);
  await page.locator("#dryMassCalcClose").click();

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

const browser = await chromium.launch(launchOptions);
try {
  for (const htmlFile of htmlFiles) {
    await verifyHtmlFile(browser, htmlFile);
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.map(message => `- ${message}`).join("\n"));
  process.exit(1);
}

console.log(`Browser verification passed for ${htmlFiles.join(", ")}`);
