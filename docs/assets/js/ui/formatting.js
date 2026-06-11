import { clamp } from "../shared/math.js";

export function paintStyle(property, fallback, preferred) {
  const base = fallback || "#64748b";
  const paint = preferred || base;
  return `${property}:${base};${property}:${paint};`;
}

export function backgroundStyle(fallback, preferred) {
  return paintStyle("background", fallback, preferred);
}

export function tickMinGap(ticks) {
  if (!Array.isArray(ticks) || ticks.length < 2) return NaN;
  let gap = Infinity;
  for (let index = 1; index < ticks.length; index += 1) {
    const delta = Math.abs(ticks[index] - ticks[index - 1]);
    if (Number.isFinite(delta) && delta > 0) gap = Math.min(gap, delta);
  }
  return gap === Infinity ? NaN : gap;
}

export function fractionDigitsForStep(step) {
  if (!Number.isFinite(step) || step <= 0) return 1;
  if (step >= 10) return 0;
  if (step >= 1) return 1;
  return clamp(Math.ceil(-Math.log10(step)) + 1, 0, 8);
}

export function formatAxisTick(value, ticks, options = {}) {
  if (!Number.isFinite(value)) return "-";
  const compact = options.compact !== false;
  const abs = Math.abs(value);
  const gap = tickMinGap(ticks);
  let scaled = value;
  let scaledGap = gap;
  let suffix = "";
  if (compact && abs >= 1_000_000) {
    scaled = value / 1_000_000;
    scaledGap = gap / 1_000_000;
    suffix = "M";
  } else if (compact && abs >= 1_000) {
    scaled = value / 1_000;
    scaledGap = gap / 1_000;
    suffix = "k";
  }
  const maximumFractionDigits = fractionDigitsForStep(Math.abs(scaledGap));
  const text = Number(scaled).toLocaleString("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
    useGrouping: Math.abs(scaled) >= 1000,
  });
  return `${text}${suffix}`;
}

export function formatTick(value) {
  if (!Number.isFinite(value)) return "-";
  if (Math.abs(value) < 1 && value !== 0) return value.toPrecision(2);
  return formatCompact(value, 1_000);
}

export function formatNumber(value, suffix = "") {
  if (!Number.isFinite(value)) return "-";
  return `${formatCompact(value, 1_000_000)}${suffix}`;
}

export function formatTwr(value, suffix = "") {
  if (!Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  const text = abs > 0 && abs < 0.001
    ? Number(value.toPrecision(2)).toString()
    : formatCompact(value, 1_000_000);
  return `${text}${suffix}`;
}

export function formatTwrDynamicUnit(value) {
  if (!Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  if (abs === 0) return "0g";
  const units = [
    ["g", 1],
    ["mg", 1e3],
    ["µg", 1e6],
    ["ng", 1e9],
  ];
  let selected = units[units.length - 1];
  for (const unit of units) {
    if (abs * unit[1] >= 0.1) {
      selected = unit;
      break;
    }
  }
  const scaled = value * selected[1];
  const text = Math.abs(scaled) > 0 && Math.abs(scaled) < 0.001
    ? Number(scaled.toPrecision(2)).toString()
    : formatCompact(scaled, 1_000_000);
  return `${text}${selected[0]}`;
}

export function formatCompact(value, threshold = 1_000) {
  if (!Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  if (abs < threshold) return trim(value);
  const suffixes = ["", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
  let tier = Math.floor(Math.log10(abs) / 3);
  if (tier >= suffixes.length) return Number(value).toExponential(0).replace("e+", "e");
  let scaled = value / Math.pow(1000, tier);
  if (Math.abs(scaled) >= 999.5 && tier < suffixes.length - 1) {
    tier += 1;
    scaled = value / Math.pow(1000, tier);
  }
  return `${trim(scaled)}${suffixes[tier]}`;
}

export function trim(value) {
  if (!Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3;
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function formatPercent(value) {
  return Number.isFinite(value) ? `${trim(value * 100)}%` : "-";
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}
