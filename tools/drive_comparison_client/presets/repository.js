import { CHART_PRESET_STARTUP_STORAGE_KEY, CHART_PRESET_STORAGE_KEY, DATA, DRY_MASS_PRESET_STORAGE_KEY } from "../state/core.js";
import {
  cloneJson,
  dedupePresetEntries,
  sanitizePresetName,
  storageReadJson,
  storageWriteJson,
  presetTimestamp,
  uniquePresetId,
} from "./common.js";

export let chartPresetLibrary = loadChartPresetLibrary();
export let dryMassPresetLibrary = loadDryMassPresetLibrary();
export const builtInChartPresetLibrary = loadBuiltInChartPresetLibrary();
export const builtInDryMassPresetLibrary = loadBuiltInDryMassPresetLibrary();
export let startupChartPresetId = loadStartupChartPresetId();

export function setChartPresetLibrary(value) {
  chartPresetLibrary = Array.isArray(value) ? value : [];
}

export function setDryMassPresetLibrary(value) {
  dryMassPresetLibrary = Array.isArray(value) ? value : [];
}

export function normalizeChartPresetEntry(rawEntry, fallbackName = "Chart preset") {
  if (!rawEntry || typeof rawEntry !== "object") return null;
  const source = rawEntry.preset && typeof rawEntry.preset === "object" ? rawEntry.preset : rawEntry;
  const settings = source.settings && typeof source.settings === "object" ? source.settings : source;
  if (!settings || typeof settings !== "object") return null;
  const now = presetTimestamp();
  return {
    id: typeof source.id === "string" && source.id.trim() ? source.id : uniquePresetId("chart"),
    name: sanitizePresetName(source.name, fallbackName),
    settings: cloneJson(settings),
    createdAt: typeof source.createdAt === "string" ? source.createdAt : now,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : now,
  };
}

export function normalizeDryMassPresetEntry(rawEntry, fallbackName = "Design preset") {
  if (!rawEntry || typeof rawEntry !== "object") return null;
  const source = rawEntry.preset && typeof rawEntry.preset === "object" ? rawEntry.preset : rawEntry;
  const dryMassDesign = source.dryMassDesign && typeof source.dryMassDesign === "object"
    ? source.dryMassDesign
    : source.design && typeof source.design === "object"
      ? source.design
      : source.calculator && typeof source.calculator === "object"
        ? source.calculator
        : source.settings && typeof source.settings === "object"
          ? source.settings
          : source.dryMassCalculator && typeof source.dryMassCalculator === "object"
            ? source.dryMassCalculator
            : source.dryMassCalc && typeof source.dryMassCalc === "object"
              ? source.dryMassCalc
              : source;
  if (!dryMassDesign || typeof dryMassDesign !== "object") return null;
  const calculator = cloneJson(dryMassDesign);
  const simulationDefaults = source.simulationDefaults && typeof source.simulationDefaults === "object"
    ? source.simulationDefaults
    : calculator.simulationDefaults && typeof calculator.simulationDefaults === "object"
      ? calculator.simulationDefaults
      : null;
  if (simulationDefaults) calculator.simulationDefaults = cloneJson(simulationDefaults);
  const displayName = source.displayName && typeof source.displayName === "object"
    ? cloneJson(source.displayName)
    : null;
  const now = presetTimestamp();
  const entry = {
    id: typeof source.id === "string" && source.id.trim() ? source.id : uniquePresetId("design"),
    name: sanitizePresetName(source.name, fallbackName),
    calculator,
    createdAt: typeof source.createdAt === "string" ? source.createdAt : now,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : now,
  };
  if (displayName) entry.displayName = displayName;
  return entry;
}

export function presetLibraryData() {
  const library = DATA.presetLibrary;
  return library && typeof library === "object" ? library : {};
}

export function builtInPresetId(prefix, rawEntry, index) {
  const source = rawEntry && rawEntry.preset && typeof rawEntry.preset === "object" ? rawEntry.preset : rawEntry;
  const rawId = source && typeof source.id === "string" && source.id.trim()
    ? source.id.trim()
    : String(index + 1);
  return `${prefix}:${rawId}`;
}

export function normalizeBuiltInChartPresetEntry(rawEntry, index) {
  if (!rawEntry || typeof rawEntry !== "object") return null;
  const source = rawEntry.preset && typeof rawEntry.preset === "object" ? rawEntry.preset : rawEntry;
  const entry = normalizeChartPresetEntry(
    { ...source, id: builtInPresetId("built-in-chart", rawEntry, index) },
    `Built-in chart preset ${index + 1}`,
  );
  if (entry) entry.builtIn = true;
  return entry;
}

export function normalizeBuiltInDryMassPresetEntry(rawEntry, index) {
  if (!rawEntry || typeof rawEntry !== "object") return null;
  const source = rawEntry.preset && typeof rawEntry.preset === "object" ? rawEntry.preset : rawEntry;
  const entry = normalizeDryMassPresetEntry(
    { ...source, id: builtInPresetId("built-in-design", rawEntry, index) },
    `Built-in design preset ${index + 1}`,
  );
  if (entry) entry.builtIn = true;
  return entry;
}

export function loadBuiltInChartPresetLibrary() {
  const presets = presetLibraryData().chartPresets;
  return dedupePresetEntries((Array.isArray(presets) ? presets : [])
    .map(normalizeBuiltInChartPresetEntry)
    .filter(Boolean));
}

export function loadBuiltInDryMassPresetLibrary() {
  const presets = presetLibraryData().dryMassPresets;
  return dedupePresetEntries((Array.isArray(presets) ? presets : [])
    .map(normalizeBuiltInDryMassPresetEntry)
    .filter(Boolean));
}

export function allChartPresetEntries() {
  return [...builtInChartPresetLibrary, ...chartPresetLibrary];
}

export function allDryMassPresetEntries() {
  return [...builtInDryMassPresetLibrary, ...dryMassPresetLibrary];
}

export function loadChartPresetLibrary() {
  const raw = storageReadJson(CHART_PRESET_STORAGE_KEY);
  const presets = Array.isArray(raw) ? raw : (Array.isArray(raw?.presets) ? raw.presets : []);
  return dedupePresetEntries(presets.map(item => normalizeChartPresetEntry(item)).filter(Boolean));
}

export function loadDryMassPresetLibrary() {
  const raw = storageReadJson(DRY_MASS_PRESET_STORAGE_KEY);
  const presets = Array.isArray(raw) ? raw : (Array.isArray(raw?.presets) ? raw.presets : []);
  return dedupePresetEntries(presets.map(item => normalizeDryMassPresetEntry(item)).filter(Boolean));
}

export function loadStartupChartPresetId() {
  try {
    return localStorage.getItem(CHART_PRESET_STARTUP_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function saveChartPresetLibrary() {
  return storageWriteJson(CHART_PRESET_STORAGE_KEY, {
    format: "ti-engine-chart-preset-library/v1",
    presets: chartPresetLibrary,
  });
}

export function saveDryMassPresetLibrary() {
  return storageWriteJson(DRY_MASS_PRESET_STORAGE_KEY, {
    format: "ti-engine-chart-design-preset-library/v1",
    presets: dryMassPresetLibrary,
  });
}

export function chartPresetExportObject(entry) {
  return {
    format: "ti-engine-chart-named-preset/v1",
    id: entry.id,
    name: entry.name,
    settings: cloneJson(entry.settings),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export function chartPresetLibraryExportObject() {
  return {
    format: "ti-engine-chart-preset-library/v1",
    presets: chartPresetLibrary.map(chartPresetExportObject),
    startupPresetId: startupChartPresetId || null,
  };
}

export function dryMassPresetExportObject(entry) {
  const calculator = cloneJson(entry.calculator);
  const simulationDefaults = calculator && calculator.simulationDefaults && typeof calculator.simulationDefaults === "object"
    ? cloneJson(calculator.simulationDefaults)
    : null;
  const dryMassDesign = cloneJson(calculator);
  if (dryMassDesign && typeof dryMassDesign === "object") delete dryMassDesign.simulationDefaults;
  const exported = {
    format: "ti-engine-chart-design-preset/v1",
    id: entry.id,
    name: entry.name,
    dryMassDesign,
    simulationDefaults,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
  if (entry.displayName && typeof entry.displayName === "object") {
    exported.displayName = cloneJson(entry.displayName);
  }
  return exported;
}

export function dryMassPresetLibraryExportObject() {
  return {
    format: "ti-engine-chart-design-preset-library/v1",
    presets: dryMassPresetLibrary.map(dryMassPresetExportObject),
  };
}

export function setStartupChartPreset(id) {
  startupChartPresetId = id || "";
  try {
    if (startupChartPresetId) {
      localStorage.setItem(CHART_PRESET_STARTUP_STORAGE_KEY, startupChartPresetId);
    } else {
      localStorage.removeItem(CHART_PRESET_STARTUP_STORAGE_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

export function firstChartPresetEntry() {
  return allChartPresetEntries()[0] || null;
}

export function firstDryMassPresetEntry() {
  return allDryMassPresetEntries()[0] || null;
}

export function chartPresetDesignLibrarySnapshot() {
  return dryMassPresetLibrary.map(dryMassPresetExportObject);
}

export function restoreDesignPresetLibrarySnapshot(rawEntries) {
  if (!Array.isArray(rawEntries)) return false;
  const entries = rawEntries
    .map((entry, index) => normalizeDryMassPresetEntry(entry, `Restored design preset ${index + 1}`))
    .filter(Boolean)
    .map(entry => ({ ...entry, builtIn: false }));
  setDryMassPresetLibrary(dedupePresetEntries(entries));
  saveDryMassPresetLibrary();
  return true;
}
