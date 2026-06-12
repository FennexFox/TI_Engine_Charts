import { render } from "../chart/interaction.js";
import { resetDryMassCalcState } from "../calc/dry_mass.js";
import { renderDryMassCalcModal } from "../ui/dry_mass_calculator.js";
import {
  applyHelp,
  helpText,
  localCategoryHelp,
  localLabel,
  setPresetUiText,
} from "../presets/library.js";
import {
  DATA,
  applyStaticLanguage,
  renderRadiatorOptions,
  resetChartStateToDefaults,
  setUiLanguage,
  state,
  syncMetricGroupLabels,
  updateLeftPanelCardSummaries,
} from "../state/core.js";
import { refreshSourceNote } from "../ui/controls.js";
import { enhanceSearchableSelect } from "../ui/searchable_select.js";

export function resetApplicationStateToDefaults() {
  resetChartStateToDefaults();
  resetDryMassCalcState();
}

export function setLanguage(lang, { rerender = true } = {}) {
  setUiLanguage(lang);
  applyStaticLanguage();
  refreshLocalizedControls();
  refreshSourceNote();
  updateLeftPanelCardSummaries();
  if (rerender) render();
}

export function refreshLocalizedControls() {
  document.querySelectorAll(".category-row").forEach(row => {
    const category = DATA.categories.find(item => item.key === row.dataset.categoryKey);
    const text = row.querySelector(".category-name");
    if (category && text) text.textContent = localLabel(category);
    if (category) applyHelp(row, localCategoryHelp(category));
  });
  document.querySelectorAll(".family-row").forEach(row => {
    const family = DATA.subfamilies.find(item => item.key === row.dataset.familyKey);
    const text = row.querySelector(".family-name");
    if (family && text) text.textContent = localLabel(family);
  });
  syncMetricGroupLabels();
  enhanceSearchableSelect(document.getElementById("metric"));
  const showTwrInfo = document.getElementById("showTwrInfo");
  const showMassInfo = document.getElementById("showMassInfo");
  const paretoHighlight = document.getElementById("paretoHighlight");
  const showImpracticalCandidates = document.getElementById("showImpracticalCandidates");
  if (showTwrInfo) applyHelp(showTwrInfo.closest(".check-row"), helpText("showTwrInfo"));
  if (showMassInfo) applyHelp(showMassInfo.closest(".check-row"), helpText("showMassInfo"));
  if (paretoHighlight) applyHelp(paretoHighlight.closest(".check-row"), helpText("paretoHighlight"));
  if (showImpracticalCandidates) applyHelp(showImpracticalCandidates.closest(".check-row"), helpText("showImpracticalCandidates"));
  applyHelp(document.querySelector("#minTwrControl .label"), helpText("minTwr"));
  applyHelp(document.querySelector("#minDvControl .label"), helpText("minDv"));
  renderRadiatorOptions(document.getElementById("radiator"));
  enhanceSearchableSelect(document.getElementById("radiator"));
  setPresetUiText();
  renderDryMassCalcModal();
}
