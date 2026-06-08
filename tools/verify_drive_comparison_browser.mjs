import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const htmlFiles = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["docs/index.html"];

const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

async function setLanguage(page, value) {
  await page.locator("#uiLanguageSelect").selectOption(value);
  await page.waitForTimeout(100);
}

async function verifyHtmlFile(browser, htmlFile) {
  const absolutePath = resolve(htmlFile);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto(pathToFileURL(absolutePath).href, { waitUntil: "domcontentloaded" });
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

  await page.locator("#dryMassCalcButton").click();
  await page.waitForSelector("#dryMassCalcModal.is-open", { timeout: 5000 });
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
    const chartApplied = !!loadedChart && applyPresetToState(loadedChart.settings);

    const chartSelectedPayload = await serializePayloadObject(chartPresetExportObject(chartB));
    const parsedSelectedChart = await parsePresetPayload(chartSelectedPayload);
    chartPresetLibrary = [];
    saveChartPresetLibrary();
    const selectedChartImport = await handleImportedPresetObject(parsedSelectedChart, { promptToSaveCurrent: false });

    resetDryMassCalcState();
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
      "#chartPresetSave",
      "#chartPresetLoad",
      "#chartPresetRename",
      "#chartPresetDuplicate",
      "#chartPresetDelete",
      "#chartPresetSetStartup",
      "#chartPresetExportSelected",
      "#chartPresetExportAll",
    ].every(selector => !!document.querySelector(selector));
    const dryMassControls = [
      "#dryMassPresetSave",
      "#dryMassPresetLoad",
      "#dryMassPresetRename",
      "#dryMassPresetDuplicate",
      "#dryMassPresetDelete",
      "#dryMassPresetExportSelected",
      "#dryMassPresetExportAll",
      "#dryMassPresetImport",
    ].every(selector => !!document.querySelector(selector));

    const result = {
      chartCountAfterLibraryImport,
      chartImportOk: chartImport.ok,
      chartApplied,
      chartLoadedDryMass: state.dryMassTons,
      chartLoadedDv: state.targetDvKps,
      chartLoadedThrusters: state.thrusters,
      chartLoadedSearch: state.searchTerm,
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

const browser = await chromium.launch({ headless: true });
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
