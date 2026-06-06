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
  const languageOptions = await page.locator("#uiLanguageSelect option").count();
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
  await page.locator("#dryMassCalcClose").click();

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
