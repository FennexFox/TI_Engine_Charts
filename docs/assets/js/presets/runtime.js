export const presetRuntimeApi = {
  applyDryMassCalculatorPreset: () => false,
  exportedDryMassCalculatorPreset: () => ({}),
  renderDryMassCalcModal: () => {},
  render: () => {},
  setLanguage: () => {},
  syncMinDvInputs: () => {},
  syncMinTwrInputs: () => {},
  updateChartControls: () => {},
};

export function registerPresetRuntimeApi(api = {}) {
  Object.assign(presetRuntimeApi, api);
}
