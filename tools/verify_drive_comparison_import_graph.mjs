import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(toolsDir, "..");
const clientDir = resolve(toolsDir, "drive_comparison_client");
const strictBoundaries = process.argv.includes("--strict-boundaries");
const showBoundaryWarnings = strictBoundaries || process.argv.includes("--show-boundary-warnings");

function toPosix(path) {
  return path.replace(/\\/g, "/");
}

function moduleFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) return moduleFiles(path);
      return entry.isFile() && entry.name.endsWith(".js") ? [path] : [];
    })
    .sort();
}

function moduleKey(file) {
  return toPosix(relative(clientDir, file));
}

function resolveRelativeImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.js`,
    resolve(base, "index.js"),
  ];
  const resolved = candidates.find(candidate => existsSync(candidate));
  if (!resolved || !resolved.startsWith(clientDir)) return null;
  return moduleKey(resolved);
}

function importSpecifiers(source) {
  const specifiers = [];
  const patterns = [
    /(?:^|\n)\s*import\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g,
    /(?:^|\n)\s*export\s+[^'";]+?\s+from\s+["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

function buildGraph(files) {
  const graph = new Map();
  for (const file of files) {
    const key = moduleKey(file);
    const source = readFileSync(file, "utf8");
    const deps = importSpecifiers(source)
      .map(specifier => resolveRelativeImport(file, specifier))
      .filter(Boolean)
      .filter(dep => dep !== key)
      .sort();
    graph.set(key, [...new Set(deps)]);
  }
  return graph;
}

function findCycles(graph) {
  const state = new Map();
  const stack = [];
  const cycles = [];
  const seenCycles = new Set();

  function visit(node) {
    state.set(node, "visiting");
    stack.push(node);
    for (const dep of graph.get(node) || []) {
      const depState = state.get(dep);
      if (!depState) {
        visit(dep);
      } else if (depState === "visiting") {
        const start = stack.indexOf(dep);
        const cycle = stack.slice(start).concat(dep);
        const canonicalNodes = cycle.slice(0, -1);
        const rotations = canonicalNodes.map((_, index) => canonicalNodes.slice(index).concat(canonicalNodes.slice(0, index)).join(" -> "));
        const reverse = [...canonicalNodes].reverse();
        const reverseRotations = reverse.map((_, index) => reverse.slice(index).concat(reverse.slice(0, index)).join(" -> "));
        const canonical = [...rotations, ...reverseRotations].sort()[0];
        if (!seenCycles.has(canonical)) {
          seenCycles.add(canonical);
          cycles.push(cycle);
        }
      }
    }
    stack.pop();
    state.set(node, "done");
  }

  for (const node of graph.keys()) {
    if (!state.has(node)) visit(node);
  }
  return cycles;
}

function topFolder(module) {
  const slash = module.indexOf("/");
  return slash === -1 ? "" : module.slice(0, slash);
}

function dependencyWarnings(graph) {
  const warnings = [];
  const isStateViolation = (from, to) => topFolder(from) === "state" && ["ui", "chart", "presets", "diagnostics", "calc"].includes(topFolder(to));
  const isCalcViolation = (from, to) => topFolder(from) === "calc" && ["ui", "chart", "presets", "diagnostics"].includes(topFolder(to));
  const isSharedViolation = (from, to) => topFolder(from) === "shared" && topFolder(to) !== "";
  const isDiagnosticsViolation = (from, to) => topFolder(to) === "diagnostics" && topFolder(from) !== "diagnostics" && from !== "main.js";
  const lowLevelChartImport = to => to === "chart/rendering.js" || to === "chart/interaction.js" || to === "chart/context.js";
  const isUiChartInternalWarning = (from, to) => topFolder(from) === "ui" && lowLevelChartImport(to);
  const isPresetFeatureWarning = (from, to) => topFolder(from) === "presets" && ["ui", "chart", "calc"].includes(topFolder(to));

  for (const [from, deps] of graph.entries()) {
    for (const to of deps) {
      if (isStateViolation(from, to)) warnings.push(`${from} imports higher-level module ${to}`);
      if (isCalcViolation(from, to)) warnings.push(`${from} imports higher-level module ${to}`);
      if (isSharedViolation(from, to)) warnings.push(`${from} imports non-shared module ${to}`);
      if (isDiagnosticsViolation(from, to)) warnings.push(`${from} imports diagnostics module ${to}`);
      if (isUiChartInternalWarning(from, to)) warnings.push(`${from} imports chart internal module ${to}`);
      if (isPresetFeatureWarning(from, to)) warnings.push(`${from} imports feature module ${to}`);
    }
  }
  return warnings;
}

const files = moduleFiles(clientDir);
const graph = buildGraph(files);
const cycles = findCycles(graph);
const warnings = dependencyWarnings(graph);

if (cycles.length) {
  console.error("Drive comparison client import graph contains circular dependencies:");
  for (const cycle of cycles) {
    console.error(`- ${cycle.join(" -> ")}`);
  }
  process.exit(1);
}

if (warnings.length && showBoundaryWarnings) {
  const uniqueWarnings = [...new Set(warnings)].sort();
  const label = strictBoundaries ? "Boundary violations" : "Boundary warnings";
  console.warn(`${label}:`);
  for (const warning of uniqueWarnings) console.warn(`- ${warning}`);
  if (strictBoundaries) process.exit(1);
}

const boundaryNote = warnings.length ? `; ${[...new Set(warnings)].length} boundary warnings available with --show-boundary-warnings` : "";
console.log(`Client import graph verification passed for ${files.length} modules with 0 circular dependency groups${boundaryNote}`);
