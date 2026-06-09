import { chartMassOptions } from "./calc/filtering.js";
import { render } from "./chart/interaction.js";
import { isBandMetric } from "./chart/rendering.js";
import { installDebugHooks } from "./diagnostics/debug.js";
import { renderDryMassCalcModal, resetDryMassCalcState } from "./calc/dry_mass.js";
import {
  applyHelp,
  helpText,
  localCategoryHelp,
  localLabel,
  setPresetUiText,
} from "./presets/library.js";
import { registerCoreHooks } from "./state/core.js";
import { refreshSourceNote, setupControls } from "./ui/controls.js";
import { enhanceSearchableSelect } from "./ui/searchable_select.js";
import { formatNumber, formatTwr, formatTwrDynamicUnit } from "./ui/tooltip_table.js";

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

installDebugHooks();
setupControls();
render();
window.addEventListener("resize", render);
