import { state } from "../state/core.js";

export function isBandMetric(metric = state.metric) {
  return metric === "totalMassTons" || metric === "fuelMassTons" || metric === "twr";
}

export function optionMetricValue(option, metric = state.metric) {
  if (metric === "twr") return option.twr;
  if (metric === "fuelMassTons") return option.propellantTons;
  return option.totalMassTons;
}
