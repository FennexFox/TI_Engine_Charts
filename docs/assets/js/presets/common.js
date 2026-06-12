import { HELP_TEXT, UI_LANG, localText } from "../state/core.js";

export function localLabel(item) {
  if (UI_LANG === "en") return item.labelEn || item.label || item.key;
  return item.label || item.labelEn || item.key;
}

export function localCategoryHelp(category) {
  if (UI_LANG === "en") return category.helpEn || category.help || "";
  return category.help || category.helpEn || "";
}

export function helpText(key) {
  const item = HELP_TEXT[key] || {};
  return UI_LANG === "en" ? (item.en || item.ko || "") : (item.ko || item.en || "");
}

export function applyHelp(element, text) {
  if (!element || !text) return;
  element.dataset.help = text;
  element.title = text;
}

export function cloneJson(value) {
  const text = JSON.stringify(value);
  return text ? JSON.parse(text) : null;
}

export function storageReadJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storageWriteJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function uniquePresetId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizePresetName(value, fallback = "Preset") {
  const name = String(value || "").trim();
  return name || fallback;
}

export function uniquePresetName(baseName, library, ignoreId = "") {
  const base = sanitizePresetName(baseName, "Preset");
  let candidate = base;
  let suffix = 2;
  while (library.some(item => item.id !== ignoreId && item.name === candidate)) {
    candidate = `${base} (${suffix})`;
    suffix += 1;
  }
  return candidate;
}

export function presetTimestamp() {
  return new Date().toISOString();
}

export function dedupePresetEntries(entries) {
  const seen = new Set();
  return entries.filter(entry => {
    if (!entry || seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

export function presetEntryOptionLabel(entry, startupId = "", labelFn = item => item.name) {
  const label = labelFn(entry);
  return entry.id === startupId
    ? `${label} ${localText("(기본)", "(default)")}`
    : label;
}

export function dryMassPresetDisplayName(entry) {
  const display = entry && entry.displayName;
  if (display && typeof display === "object") {
    const name = UI_LANG === "en"
      ? display.en || display.ko || display.kor || entry.name
      : display.ko || display.kor || display.en || entry.name;
    return sanitizePresetName(name, entry.name || "Preset");
  }
  return sanitizePresetName(entry && entry.name, "Preset");
}

export function sortedDryMassPresetEntries(entries) {
  const locale = UI_LANG === "en" ? "en" : "ko-KR";
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const nameCompare = dryMassPresetDisplayName(left.entry).localeCompare(dryMassPresetDisplayName(right.entry), locale, {
        numeric: true,
        sensitivity: "base",
      });
      return nameCompare || left.index - right.index;
    })
    .map(item => item.entry);
}
