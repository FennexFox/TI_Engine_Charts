import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const htmlFile = process.argv[2] || "docs/index.html";
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function axisSpace(value, logScale) {
  return logScale ? Math.log10(Math.max(value, 1e-12)) : value;
}

function nearAxisValue(actual, expected, logScale) {
  const actualSpace = axisSpace(actual, logScale);
  const expectedSpace = axisSpace(expected, logScale);
  const tolerance = Math.max(Math.abs(expectedSpace), 1) * 1e-10;
  return Math.abs(actualSpace - expectedSpace) <= tolerance;
}

function verifyTickPlan({ name, plan, min, max, logScale, pixelSpan, maxTicks }) {
  expect(Array.isArray(plan), `${name}: tick plan is not an array`);
  if (!Array.isArray(plan)) return;
  expect(plan.length >= 2, `${name}: tick plan has fewer than two ticks`);
  expect(plan.length <= maxTicks, `${name}: tick plan exceeded max tick count`);
  if (plan.length < 2) return;

  expect(nearAxisValue(plan[0].value, min, logScale), `${name}: first tick does not cover domain minimum`);
  expect(nearAxisValue(plan[plan.length - 1].value, max, logScale), `${name}: last tick does not cover domain maximum`);

  const labeled = plan.filter(item => item.label);
  expect(labeled.length >= 2, `${name}: fewer than two labeled ticks`);
  expect(labeled[0] === plan[0], `${name}: first tick is not labeled`);
  expect(labeled[labeled.length - 1] === plan[plan.length - 1], `${name}: last tick is not labeled`);

  for (let index = 0; index < plan.length; index += 1) {
    const tick = plan[index];
    expect(Number.isFinite(tick.value), `${name}: non-finite tick value at ${index}`);
    expect(Number.isFinite(tick.pixel), `${name}: non-finite tick pixel at ${index}`);
    expect(tick.pixel >= -1e-6 && tick.pixel <= pixelSpan + 1e-6, `${name}: tick pixel outside axis range at ${index}`);
    if (logScale) expect(tick.value > 0, `${name}: log tick is not positive at ${index}`);
    if (index > 0) {
      const previous = plan[index - 1];
      expect(axisSpace(tick.value, logScale) > axisSpace(previous.value, logScale), `${name}: ticks are not strictly increasing at ${index}`);
    }
  }
}

function verifySnapshotAxis(snapshot, axisName, maxTicks) {
  const axis = snapshot && snapshot[axisName];
  expect(!!axis, `snapshot: missing ${axisName} axis`);
  if (!axis) return;
  expect(Array.isArray(axis.domain) && axis.domain.length === 2, `snapshot ${axisName}: invalid domain`);
  expect(axis.domain.every(Number.isFinite), `snapshot ${axisName}: non-finite domain`);
  expect(axis.tickCount >= 2 && axis.tickCount <= maxTicks, `snapshot ${axisName}: invalid tick count`);
  expect(axis.labeledTickCount >= 2, `snapshot ${axisName}: invalid labeled tick count`);
  expect(Number.isFinite(axis.firstTick), `snapshot ${axisName}: non-finite first tick`);
  expect(Number.isFinite(axis.lastTick), `snapshot ${axisName}: non-finite last tick`);
}

const launchOptions = { headless: true };
if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
  launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
}

const browser = await chromium.launch(launchOptions);
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.route("**/favicon.ico", route => route.fulfill({ status: 204, body: "" }));
  const targetUrl = process.env.PLAYWRIGHT_BASE_URL
    ? new URL(htmlFile, process.env.PLAYWRIGHT_BASE_URL).href
    : pathToFileURL(resolve(htmlFile)).href;
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#chart .data-point", { timeout: 15000 });

  const hasDebug = await page.evaluate(() => !!(window.TI_ENGINE_CHART_DEBUG && window.TI_ENGINE_CHART_DEBUG.tickPlan && window.TI_ENGINE_CHART_DEBUG.axisSnapshot));
  expect(hasDebug, `${htmlFile}: axis debug API missing`);

  const cases = [
    { name: "linear-wide", min: 0, max: 1_000_000, pixelSpan: 1000, logScale: false, maxTicks: 48 },
    { name: "linear-narrow", min: 1000, max: 1000.01, pixelSpan: 1000, logScale: false, maxTicks: 48 },
    { name: "log-wide", min: 1, max: 1_000_000_000, pixelSpan: 1000, logScale: true, maxTicks: 96 },
    { name: "log-narrow", min: 1000, max: 1000.001, pixelSpan: 1000, logScale: true, maxTicks: 96 },
  ];
  for (const item of cases) {
    const plan = await page.evaluate(({ min, max, pixelSpan, logScale, maxTicks }) => {
      return window.TI_ENGINE_CHART_DEBUG.tickPlan(min, max, pixelSpan, logScale, {
        gridPixelGap: logScale ? 72 : 78,
        labelPixelGap: 92,
        maxTicks,
        minTicks: 4,
      });
    }, item);
    verifyTickPlan({ ...item, plan });
  }

  const snapshot = await page.evaluate(() => window.TI_ENGINE_CHART_DEBUG.axisSnapshot());
  expect(snapshot && typeof snapshot === "object", `${htmlFile}: axis snapshot missing`);
  verifySnapshotAxis(snapshot, "x", 96);
  verifySnapshotAxis(snapshot, "y", 96);
  await page.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.map(message => `- ${message}`).join("\n"));
  process.exit(1);
}

console.log(`Axis tick verification passed for ${htmlFile}`);
