import { chartMassOptions } from "./calc/filtering.js";
import { render, redrawChartOnly } from "./chart/interaction.js";
import { isBandMetric } from "./calc/metrics.js";
import { registerRenderingCallbacks } from "./chart/rendering.js";
import { installDebugHooks } from "./diagnostics/debug.js";
import { applyDryMassCalculatorPreset, exportedDryMassCalculatorPreset, renderDryMassCalcModal, resetDryMassCalcState } from "./calc/dry_mass.js";
import {
  applyHelp,
  helpText,
  localCategoryHelp,
  localLabel,
  registerPresetRuntimeApi,
  setPresetUiText,
} from "./presets/library.js";
import { registerCoreHooks } from "./state/core.js";
import { refreshSourceNote, setupControls } from "./ui/controls.js";
import { updateChartControls, syncMinDvInputs, syncMinTwrInputs } from "./ui/control_state.js";
import { enhanceSearchableSelect } from "./ui/searchable_select.js";
import { formatNumber, formatTwr, formatTwrDynamicUnit } from "./ui/formatting.js";

registerCoreHooks({
  applyHelp,
  chartMassOptions,
  enhanceSearchableSelect,
  formatNumber,
  formatTwr,
  formatTwrDynamicUnit,
  helpText,
  isBandMetric,
  localCategoryHelp,
  localLabel,
  refreshSourceNote,
  render,
  renderDryMassCalcModal,
  resetDryMassCalcState,
  setPresetUiText,
});

registerRenderingCallbacks({
  redrawChartOnly,
});

registerPresetRuntimeApi({
  applyDryMassCalculatorPreset,
  exportedDryMassCalculatorPreset,
  render,
  renderDryMassCalcModal,
  syncMinDvInputs,
  syncMinTwrInputs,
  updateChartControls,
});

installDebugHooks();
setupControls();
render();
window.addEventListener("resize", render);
