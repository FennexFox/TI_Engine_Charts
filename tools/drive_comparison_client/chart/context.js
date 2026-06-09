export let chartViewport = null;
export let chartHitTargets = [];
export let chartLadderHitTargets = [];
export let currentChartRows = [];
export let currentDiagnostics = null;

export function setChartViewport(value) {
  chartViewport = value;
}

export function setChartHitTargets(value) {
  chartHitTargets = value;
}

export function setChartLadderHitTargets(value) {
  chartLadderHitTargets = value;
}

export function setCurrentChartRows(value) {
  currentChartRows = value;
}

export function setCurrentDiagnostics(value) {
  currentDiagnostics = value;
}
