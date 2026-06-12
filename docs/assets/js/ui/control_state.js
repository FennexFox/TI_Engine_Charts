import { isBandMetric } from "../calc/metrics.js";
import { clamp } from "../shared/math.js";
import { DATA, UI_LANG, currentModuleEffectAssumptions, localText, normalizePowerResearchView, state } from "../state/core.js";
import { formatNumber, formatTwrDynamicUnit } from "./formatting.js";

function utilityModuleById(id) {
  const modules = DATA.shipCatalog && Array.isArray(DATA.shipCatalog.utilityModules)
    ? DATA.shipCatalog.utilityModules
    : [];
  return modules.find(item => item && item.dataName === id) || null;
}

function moduleDisplayName(module) {
  if (!module) return "";
  const display = module.displayName;
  if (display && typeof display === "object") {
    return UI_LANG === "en"
      ? display.en || display.kor || display.ko || module.friendlyName || module.dataName
      : display.kor || display.ko || display.en || module.friendlyName || module.dataName;
  }
  return module.friendlyName || module.dataName || "";
}

function effectSummary(effect) {
  const multiplier = Number(effect && effect.multiplier);
  const value = Number.isFinite(multiplier) ? `x${Number(multiplier.toPrecision(3))}` : "";
  if (effect && effect.type === "thrustMultiplier") return `${localText("추력", "Thrust")} ${value}`.trim();
  if (effect && effect.type === "exhaustVelocityMultiplier") return `${localText("EV/Isp", "EV/Isp")} ${value}`.trim();
  if (effect && effect.type === "wasteHeatMultiplier") return `${localText("폐열", "Waste heat")} ${value}`.trim();
  return effect && effect.type ? `${effect.type} ${value}`.trim() : "";
}

function requirementSummary(requirement) {
  const labels = {
    fissionDrive: localText("핵분열 드라이브 필요", "requires fission drive"),
    fusionDrive: localText("핵융합 드라이브 필요", "requires fusion drive"),
    nuclearDrive: localText("핵 드라이브 필요", "requires nuclear drive"),
    hydrogenPropellant: localText("수소 추진제 필요", "requires hydrogen propellant"),
    nonIsruDrive: localText("ISRU 추진제 제외", "requires non-ISRU propellant"),
  };
  return labels[requirement && requirement.type] || (requirement && requirement.type) || "";
}

function moduleEffectSummaries(module) {
  const summaries = Array.isArray(module && module.effects)
    ? module.effects.map(effectSummary).filter(Boolean)
    : [];
  const powerMW = Number(module && module.powerRequirementMW);
  if (Number.isFinite(powerMW) && powerMW > 0) {
    summaries.push(`${localText("보조 전력", "Aux power")} +${formatNumber(powerMW / 1000, " GW")}`);
  }
  return summaries;
}

function moduleRequirementSummaries(module) {
  return Array.isArray(module && module.effectRequirements)
    ? module.effectRequirements.map(requirementSummary).filter(Boolean)
    : [];
}

function moduleUnmodeledRules(module) {
  return Array.isArray(module && module.unmodeledRules)
    ? module.unmodeledRules.map(rule => rule && rule.rule).filter(Boolean)
    : [];
}

function appendChip(container, text, className = "") {
  const chip = document.createElement("span");
  chip.className = `effect-chip${className ? ` ${className}` : ""}`;
  chip.textContent = text;
  container.appendChild(chip);
}

function appendWarning(container, text) {
  const item = document.createElement("div");
  item.className = "module-effects-warning";
  item.textContent = text;
  container.appendChild(item);
}

export function updateModuleEffectsPanel() {
  const checkbox = document.getElementById("moduleEffectsEnabled");
  const label = document.getElementById("moduleEffectsEnabledLabel");
  const summary = document.getElementById("moduleEffectsSummary");
  const chips = document.getElementById("moduleEffectsChips");
  const warnings = document.getElementById("moduleEffectsWarnings");
  if (!checkbox || !label || !summary || !chips || !warnings) return;

  const assumptions = currentModuleEffectAssumptions();
  checkbox.checked = !!assumptions.moduleEffectsEnabled;
  label.textContent = localText("모듈 성능 효과 적용", "Apply module performance effects");
  chips.innerHTML = "";
  warnings.innerHTML = "";

  const sourceLabel = assumptions.moduleEffectSource === "manual"
    ? localText("수동 프리셋 목록", "manual preset list")
    : localText("건조질량 계산기 선택", "dry-mass calculator selection");
  const modules = assumptions.activeModuleIds.map(utilityModuleById).filter(Boolean);
  const effectModules = modules.filter(module => moduleEffectSummaries(module).length);
  summary.textContent = assumptions.moduleEffectsEnabled
    ? `${localText("소스", "Source")}: ${sourceLabel} · ${localText("선택", "Selected")} ${modules.length} · ${localText("효과", "Effects")} ${effectModules.length}`
    : `${localText("비활성", "Disabled")} · ${localText("소스", "Source")}: ${sourceLabel}`;

  if (!modules.length) {
    appendChip(chips, localText("성능 모듈 선택 없음", "No performance modules selected"), "is-muted");
  } else {
    modules.forEach(module => {
      const effects = moduleEffectSummaries(module);
      if (effects.length) {
        appendChip(chips, `${moduleDisplayName(module)} · ${effects.join(", ")}`, "is-active");
      } else {
        appendChip(chips, `${moduleDisplayName(module)} · ${localText("성능 효과 없음", "no performance effect")}`, "is-muted");
      }
    });
  }

  if (!assumptions.moduleEffectsEnabled) {
    appendWarning(warnings, localText("현재 차트는 기본 드라이브 값을 사용합니다.", "Charts currently use base drive values."));
    return;
  }

  modules.forEach(module => {
    const requirements = moduleRequirementSummaries(module);
    const unmodeled = moduleUnmodeledRules(module);
    if (requirements.length && moduleEffectSummaries(module).length) {
      appendWarning(warnings, `${moduleDisplayName(module)}: ${requirements.join(", ")}.`);
    }
    if (unmodeled.length) {
      appendWarning(warnings, `${moduleDisplayName(module)}: ${localText("MVP에서 아직 모델링하지 않는 규칙", "rules not modeled in the MVP")} (${unmodeled.join(", ")}).`);
    }
  });
  if (effectModules.length) {
    appendWarning(warnings, localText("지원되는 모듈의 추진, 전력, 폐열 효과가 차트 계산에 반영됩니다.", "Supported module drive, power, and heat effects are reflected in chart calculations."));
  }
}

export function updateChartControls() {
  const fuelUnitBlock = document.getElementById("chartFuelUnit");
  const bandAnalysisControls = document.getElementById("bandAnalysisControls");
  const showTwrInfoRow = document.getElementById("showTwrInfoRow");
  const showMassInfoRow = document.getElementById("showMassInfoRow");
  const minTwrControl = document.getElementById("minTwrControl");
  const minDvControl = document.getElementById("minDvControl");
  const powerResearchViewControl = document.getElementById("powerResearchViewControl");
  fuelUnitBlock.style.display = state.metric === "fuelEfficiency" ? "" : "none";
  bandAnalysisControls.style.display = isBandMetric() ? "" : "none";
  showTwrInfoRow.style.display = (state.metric === "totalMassTons" || state.metric === "fuelMassTons") ? "" : "none";
  showMassInfoRow.style.display = state.metric === "twr" ? "" : "none";
  minTwrControl.style.display = (state.metric === "totalMassTons" || state.metric === "fuelMassTons") ? "" : "none";
  minDvControl.style.display = state.metric === "twr" ? "" : "none";
  powerResearchViewControl.style.display = isBandMetric() ? "" : "none";
  const powerResearchViewSelect = document.getElementById("powerResearchView");
  if (powerResearchViewSelect) {
    powerResearchViewSelect.value = normalizePowerResearchView(state.powerResearchView);
  }
  const showImpracticalCandidates = document.getElementById("showImpracticalCandidates");
  if (showImpracticalCandidates) showImpracticalCandidates.checked = !!state.showImpracticalCandidates;
  updateModuleEffectsPanel();
  syncMinTwrInputs();
  syncMinDvInputs();
}

export function syncMinTwrInputs() {
  const slider = document.getElementById("minTwrExp");
  const number = document.getElementById("minTwrNumber");
  const readout = document.getElementById("minTwrReadout");
  if (!slider || !number || !readout) return;
  state.minTwr = clamp(state.minTwr || 0.0001, 0.0001, 10);
  const exponent = clamp(Math.log10(state.minTwr), Number(slider.min), Number(slider.max));
  slider.value = String(exponent);
  number.value = String(Number(state.minTwr.toPrecision(4)));
  readout.textContent = `${UI_LANG === "en" ? "Showing" : "표시"}: TWR >= ${formatTwrDynamicUnit(state.minTwr)}`;
}

export function syncMinDvInputs() {
  const slider = document.getElementById("minDv");
  const number = document.getElementById("minDvNumber");
  const readout = document.getElementById("minDvReadout");
  if (!slider || !number || !readout) return;
  state.minDvKps = clamp(state.minDvKps || 0, 0, 100000);
  slider.value = String(clamp(state.minDvKps, Number(slider.min), Number(slider.max)));
  number.value = String(Math.round(state.minDvKps));
  readout.textContent = `${UI_LANG === "en" ? "Showing" : "표시"}: dV >= ${formatNumber(state.minDvKps, " km/s")}`;
}
