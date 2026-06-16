import { isBandMetric } from "../calc/metrics.js";
import { isModuleRuleRelevantToDriveChart } from "../calc/module_effects.js";
import { clamp } from "../shared/math.js";
import { DATA, DEFAULT_MIN_TWR, UI_LANG, connectionLineModeLabel, currentModuleEffectAssumptions, localText, normalizePowerResearchView, powerResearchActive, powerResearchViewLabel, state } from "../state/core.js";
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
    ? module.unmodeledRules
      .filter(rule => isModuleRuleRelevantToDriveChart(rule))
      .map(rule => rule && rule.rule)
      .filter(Boolean)
    : [];
}

function moduleGrouping(module) {
  const grouping = Number(module && module.grouping);
  return Number.isInteger(grouping) && grouping >= 0 ? grouping : null;
}

function selectedMutualExclusionGroups(modules) {
  const grouped = new Map();
  modules.forEach(module => {
    const grouping = moduleGrouping(module);
    if (grouping === null) return;
    if (!grouped.has(grouping)) grouped.set(grouping, []);
    grouped.get(grouping).push(module);
  });
  return Array.from(grouped.entries())
    .filter(([, items]) => Array.from(new Set(items.map(module => module && module.dataName))).length > 1)
    .map(([grouping, items]) => ({ grouping, items }));
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

function appliedTemplateDisplayName(template) {
  if (!template || typeof template !== "object") return "";
  const display = template.displayName;
  if (display && typeof display === "object") {
    return UI_LANG === "en"
      ? display.en || display.ko || display.kor || template.name || ""
      : display.ko || display.kor || display.en || template.name || "";
  }
  return template.name || "";
}

function updateInlineHelp(element, text) {
  if (!element || !text) return;
  element.dataset.help = text;
  element.title = text;
  element.setAttribute("aria-label", text);
}



function updateEngineCountControl() {
  const labelText = document.getElementById("shipEngineCountLabelText");
  const help = document.getElementById("shipEngineCountHelp");
  if (labelText) labelText.textContent = localText("함선 엔진 수", "Assumed engine count");
  updateInlineHelp(
    help,
    localText(
      "엔진 수 제한이 있는 드라이브는 선택값에 가장 가까운 유효 엔진 수로 표시됩니다.",
      "Drives with engine-count limits are shown at the nearest valid engine count to the selected assumption.",
    ),
  );
}

function appendShipDesignerStatusLine(container, label, value = "") {
  const line = document.createElement("div");
  line.className = "ship-designer-status-line";
  line.textContent = value ? `${label}: ${value}` : label;
  container.appendChild(line);
}

export function updateShipDesignerPanel() {
  const title = document.getElementById("shipDesignerTitle");
  const calcButton = document.getElementById("dryMassCalcButton");
  const actionNote = document.getElementById("shipDesignerActionNote");
  const status = document.getElementById("shipDesignerAppliedTemplate");
  if (title) title.textContent = localText("함선 설계", "Ship Designer");
  if (actionNote) {
    actionNote.textContent = localText(
      "함선, 장갑, 모듈, 건조질량, 기본값을 편집합니다.",
      "Edit hull, armor, modules, dry mass, and design defaults.",
    );
  }
  const templateName = appliedTemplateDisplayName(state.appliedShipTemplate);
  const dryMassValue = formatNumber(state.dryMassTons, " t");
  if (calcButton) {
    const openLabel = templateName
      ? localText("함선 설계 편집", "Edit Ship Design")
      : localText("함선 설계 열기", "Open Ship Designer");
    calcButton.textContent = openLabel;
    calcButton.setAttribute("aria-label", openLabel);
    calcButton.title = openLabel;
  }
  if (!status) return;
  status.replaceChildren();
  if (templateName) {
    status.dataset.appliedTemplate = "true";
    appendShipDesignerStatusLine(status, localText("적용된 설계", "Applied design"), templateName);
  } else {
    status.dataset.appliedTemplate = "false";
    appendShipDesignerStatusLine(status, localText("적용된 함선 템플릿 없음", "No ship template applied"));
  }
  appendShipDesignerStatusLine(status, localText("건조질량", "Dry mass"), dryMassValue);
}

export function updateModuleEffectsPanel() {
  const checkbox = document.getElementById("moduleEffectsEnabled");
  const label = document.getElementById("moduleEffectsEnabledLabel");
  const chips = document.getElementById("moduleEffectsChips");
  const warnings = document.getElementById("moduleEffectsWarnings");
  const details = document.getElementById("moduleEffectsDetails");
  const detailsSummary = document.getElementById("moduleEffectsDetailsSummary");
  if (!checkbox || !label || !chips || !warnings) return;

  const assumptions = currentModuleEffectAssumptions();
  checkbox.checked = !!assumptions.moduleEffectsEnabled;
  label.textContent = localText("모듈 성능 효과 적용", "Apply module performance effects");
  if (detailsSummary) detailsSummary.textContent = localText("선택 모듈 목록", "Selected modules");
  chips.innerHTML = "";
  warnings.innerHTML = "";

  const modules = assumptions.activeModuleIds.map(utilityModuleById).filter(Boolean);
  const effectModules = modules.filter(module => moduleEffectSummaries(module).length);

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

  selectedMutualExclusionGroups(modules).forEach(group => {
    appendWarning(warnings, `${localText("상호배타 모듈 그룹", "Mutually exclusive module group")} ${group.grouping}: ${group.items.map(moduleDisplayName).join(", ")}.`);
  });

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

export function updateChartActiveSummary() {
  const root = document.getElementById("chartActiveSummary");
  if (!root) return;
  const activeCategories = DATA.categories.filter(category => !!state.categories[category.key]).length;
  const selectedFamilies = DATA.subfamilies.filter(family => !!state.categories[family.categoryKey] && !!state.families[family.key]).length;
  const scaleParts = [
    state.logX ? localText("X 로그", "Log X") : localText("X 선형", "Linear X"),
    state.logY ? localText("Y 로그", "Log Y") : localText("Y 선형", "Linear Y"),
  ];
  const parts = [
    `${localText("스케일", "Scale")}: ${scaleParts.join(" / ")}`,
    `${localText("엔진", "Engine")} x${state.thrusters}`,
    `${activeCategories}/${DATA.categories.length} ${localText("대분류", "categories")}`,
    `${selectedFamilies}/${DATA.subfamilies.length} ${localText("계열", "families")}`,
    state.searchTerm ? localText("검색 있음", "Search active") : localText("검색 없음", "No search"),
    powerResearchActive() ? `${localText("전원", "Power")}: ${powerResearchViewLabel()}` : "",
    `${localText("연결선", "Lines")}: ${connectionLineModeLabel()}`,
  ].filter(Boolean);
  root.textContent = parts.join(" · ");
}

export function updateChartControls() {
  const fuelUnitBlock = document.getElementById("chartFuelUnit");
  const bandAnalysisControls = document.getElementById("bandAnalysisControls");
  const showTwrInfoRow = document.getElementById("showTwrInfoRow");
  const showMassInfoRow = document.getElementById("showMassInfoRow");
  const minTwrControl = document.getElementById("minTwrControl");
  const minDvControl = document.getElementById("minDvControl");
  const powerResearchViewControl = document.getElementById("powerResearchViewControl");
  const chartScaleControls = document.getElementById("chartScaleControls");
  const chartOptionsHeading = document.getElementById("chartOptionsHeading");
  const chartLogX = document.getElementById("chartLogX");
  const chartLogY = document.getElementById("chartLogY");
  const chartScaleLabel = document.getElementById("chartScaleLabel");
  const chartLogXLabel = document.getElementById("chartLogXLabel");
  const chartLogYLabel = document.getElementById("chartLogYLabel");
  fuelUnitBlock.style.display = state.metric === "fuelEfficiency" ? "" : "none";
  bandAnalysisControls.style.display = isBandMetric() ? "" : "none";
  showTwrInfoRow.style.display = (state.metric === "totalMassTons" || state.metric === "fuelMassTons") ? "" : "none";
  showMassInfoRow.style.display = state.metric === "twr" ? "" : "none";
  minTwrControl.style.display = isBandMetric() ? "" : "none";
  minDvControl.style.display = state.metric === "twr" ? "" : "none";
  powerResearchViewControl.style.display = isBandMetric() ? "" : "none";
  if (chartOptionsHeading) chartOptionsHeading.textContent = localText("차트 옵션", "Chart options");
  if (bandAnalysisControls) bandAnalysisControls.setAttribute("aria-label", localText("차트 보조 표시", "Chart overlays"));
  if (chartScaleControls) chartScaleControls.setAttribute("aria-label", localText("축 스케일", "Axis scale"));
  if (chartScaleLabel) chartScaleLabel.textContent = localText("축", "Axes");
  if (chartLogX) chartLogX.checked = !!state.logX;
  if (chartLogY) chartLogY.checked = !!state.logY;
  if (chartLogXLabel) chartLogXLabel.textContent = localText("X축 로그", "Log X axis");
  if (chartLogYLabel) chartLogYLabel.textContent = localText("Y축 로그", "Log Y axis");
  const powerResearchViewSelect = document.getElementById("powerResearchView");
  if (powerResearchViewSelect) {
    [...powerResearchViewSelect.options].forEach(option => {
      option.textContent = powerResearchViewLabel(option.value);
    });
    powerResearchViewSelect.value = normalizePowerResearchView(state.powerResearchView);
  }
  const showImpracticalCandidates = document.getElementById("showImpracticalCandidates");
  if (showImpracticalCandidates) showImpracticalCandidates.checked = !!state.showImpracticalCandidates;
  updateEngineCountControl();
  updateShipDesignerPanel();
  updateModuleEffectsPanel();
  updateChartActiveSummary();
  syncMinTwrInputs();
  syncMinDvInputs();
}

export function syncMinTwrInputs() {
  const slider = document.getElementById("minTwrExp");
  const number = document.getElementById("minTwrNumber");
  const readout = document.getElementById("minTwrReadout");
  if (!slider || !number || !readout) return;
  state.minTwr = clamp(state.minTwr || DEFAULT_MIN_TWR, DEFAULT_MIN_TWR, 10);
  const exponent = clamp(Math.log10(state.minTwr), Number(slider.min), Number(slider.max));
  slider.value = String(exponent);
  number.value = String(Number(state.minTwr.toPrecision(4)));
  readout.textContent = `${UI_LANG === "en" ? "Showing" : "표시"}: ${localText("가속도", "acceleration")} >= ${formatTwrDynamicUnit(state.minTwr)}`;
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
