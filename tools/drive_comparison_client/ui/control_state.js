import { isBandMetric } from "../calc/metrics.js";
import { clamp } from "../shared/math.js";
import { DEFAULT_MIN_TWR, UI_LANG, normalizePowerResearchView, state } from "../state/core.js";
import { formatNumber, formatTwrDynamicUnit } from "./formatting.js";

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
