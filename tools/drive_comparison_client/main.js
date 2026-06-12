import { setLanguage, refreshLocalizedControls } from "./app/controller.js";
import { chartMassOptions, effectiveDriveValues } from "./calc/filtering.js";
import { render, redrawChartOnly } from "./chart/interaction.js";
import { registerRenderingCallbacks } from "./chart/rendering.js";
import { installDebugHooks } from "./diagnostics/debug.js";
import { applyDryMassCalculatorPreset, exportedDryMassCalculatorPreset } from "./calc/dry_mass.js";
import { renderDryMassCalcModal } from "./ui/dry_mass_calculator.js";
import { registerPresetRuntimeApi } from "./presets/library.js";
import { registerMetricCalculationHooks } from "./state/core.js";
import { setupControls } from "./ui/controls.js";
import { updateChartControls, syncMinDvInputs, syncMinTwrInputs } from "./ui/control_state.js";

registerMetricCalculationHooks({
  chartMassOptions,
  effectiveDriveValues,
});

registerRenderingCallbacks({
  redrawChartOnly,
});

registerPresetRuntimeApi({
  applyDryMassCalculatorPreset,
  exportedDryMassCalculatorPreset,
  render,
  renderDryMassCalcModal,
  setLanguage,
  syncMinDvInputs,
  syncMinTwrInputs,
  updateChartControls,
});

installDebugHooks();
setupControls({ setLanguage, refreshLocalizedControls });
render();
window.addEventListener("resize", render);
