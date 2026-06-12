import { isAbsolute, relative, resolve } from "node:path";
import { chromium } from "playwright";
import { startStaticHttpServer } from "./static_http_server.mjs";

const htmlFile = process.argv[2] || "docs/index.html";
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function htmlFileUrl(htmlFile, baseUrl) {
  const absolutePath = resolve(htmlFile);
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const pagePath = (isAbsolute(htmlFile) ? relative(process.cwd(), absolutePath) : htmlFile)
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
  return new URL(pagePath, normalizedBaseUrl).href;
}

async function pageDiagnostics(page) {
  return page.evaluate(async () => {
    const chart = document.getElementById("chart");
    const diagnosticBanner = document.getElementById("chartDiagnostic");
    const debug = window.TI_ENGINE_CHART_DEBUG;
    const debugState = debug && debug.state ? {
      metric: debug.state.metric,
      thrusters: debug.state.thrusters,
      dryMassTons: debug.state.dryMassTons,
      targetDvKps: debug.state.targetDvKps,
      minTwr: debug.state.minTwr,
      minDvKps: debug.state.minDvKps,
      searchTerm: debug.state.searchTerm,
      logX: debug.state.logX,
      logY: debug.state.logY,
    } : null;
    const moduleScriptFetches = await Promise.all(Array.from(document.querySelectorAll('script[type="module"][src]')).map(async script => {
      try {
        const response = await fetch(script.src, { cache: "no-store" });
        const text = await response.text();
        return {
          src: script.src,
          status: response.status,
          ok: response.ok,
          contentType: response.headers.get("content-type") || "",
          textStart: text.slice(0, 200),
        };
      } catch (error) {
        return { src: script.src, error: error.message };
      }
    }));
    const resourceEntries = performance.getEntriesByType("resource")
      .filter(entry => entry.name.includes("/assets/js/") || entry.name.endsWith("favicon.ico"))
      .map(entry => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize,
      }));
    const verifyRuntimeErrors = window.__TI_VERIFY_RUNTIME_ERRORS || [];
    return {
      readyState: document.readyState,
      moduleScripts: document.querySelectorAll('script[type="module"]').length,
      moduleEntryPresent: !!document.querySelector('script[type="module"][src$="assets/js/main.js"]'),
      moduleScriptSrcs: Array.from(document.querySelectorAll('script[type="module"][src]')).map(script => script.src),
      moduleScriptFetches,
      resourceEntries,
      verifyRuntimeErrors,
      debugPresent: !!debug,
      debugTickPlanPresent: !!(debug && debug.tickPlan),
      debugAxisSnapshotPresent: !!(debug && debug.axisSnapshot),
      chartExists: !!chart,
      chartChildCount: chart?.childElementCount ?? 0,
      chartText: chart?.textContent?.replace(/\s+/g, " ").trim().slice(0, 500) || "",
      chartHtmlStart: chart?.innerHTML?.replace(/\s+/g, " ").trim().slice(0, 700) || "",
      dataPointCount: document.querySelectorAll("#chart .data-point").length,
      visibleCountText: document.getElementById("visibleCount")?.textContent?.trim() || "",
      metricSelectValue: document.getElementById("metric")?.value || "",
      chartDiagnosticText: diagnosticBanner?.textContent?.trim() || "",
      debugState,
      currentChartRows: Array.isArray(debug?.currentChartRows) ? debug.currentChartRows.length : null,
      dataDriveCount: Array.isArray(debug?.DATA?.drives) ? debug.DATA.drives.length : null,
      bodyTextStart: document.body?.innerText?.replace(/\s+/g, " ").trim().slice(0, 500) || "",
    };
  }).catch(error => ({ diagnosticError: error.message }));
}

function formatRuntimeDiagnostics({ htmlFile, targetUrl, error, consoleErrors, pageErrors, httpErrors, requestFailures, diagnostics }) {
  return [
    `${htmlFile}: timed out waiting for #chart .data-point`,
    `Target URL: ${targetUrl}`,
    `Original error: ${error.message}`,
    consoleErrors.length ? `Console errors: ${consoleErrors.join(" | ")}` : "Console errors: none captured",
    pageErrors.length ? `Page errors: ${pageErrors.join(" | ")}` : "Page errors: none captured",
    httpErrors.length ? `HTTP errors: ${httpErrors.join(" | ")}` : "HTTP errors: none captured",
    requestFailures.length ? `Request failures: ${requestFailures.join(" | ")}` : "Request failures: none captured",
    `Page diagnostics: ${JSON.stringify(diagnostics)}`,
  ].join("\n");
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

let staticServer = null;
let browser = null;
try {
  staticServer = process.env.PLAYWRIGHT_BASE_URL ? null : await startStaticHttpServer(process.cwd());
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || staticServer.baseUrl;
  browser = await chromium.launch(launchOptions);
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
  const targetUrl = htmlFileUrl(htmlFile, baseUrl);
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  try {
    await page.waitForSelector("#chart .data-point", { timeout: 15000 });
  } catch (error) {
    throw new Error(formatRuntimeDiagnostics({
      htmlFile,
      targetUrl,
      error,
      consoleErrors,
      pageErrors,
      httpErrors,
      requestFailures,
      diagnostics: await pageDiagnostics(page),
    }));
  }

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
  if (browser) await browser.close();
  if (staticServer) await staticServer.close();
}

if (failures.length) {
  console.error(failures.map(message => `- ${message}`).join("\n"));
  process.exit(1);
}

console.log(`Axis tick verification passed for ${htmlFile}`);
