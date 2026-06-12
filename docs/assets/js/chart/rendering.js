import { chartMassOptions, chartSummaryMassOptions, isImpracticalOption, massOptions, rowUnlockResearchValue } from "../calc/filtering.js";
import { isBandMetric, optionMetricValue } from "../calc/metrics.js";
import { clamp } from "../shared/math.js";
import { DATA, allDriveRowsById, chart, localText, metricDefs, metricLabel, powerResearchActive, state } from "../state/core.js";
import { formatAxisTick, paintStyle } from "../ui/formatting.js";
import { buildAxisTickPlan } from "./axis.js";
import { chartHitTargets, chartLadderHitTargets, chartViewport, currentChartRows } from "./context.js";


const renderingCallbacks = {
      redrawChartOnly: () => {},
    };

export function registerRenderingCallbacks(callbacks = {}) {
      Object.assign(renderingCallbacks, callbacks);
    }

export function drawGridAndAxes(ctx) {
      const { width, height, margin, innerW, innerH, x, y, xDomain, yDomain } = ctx;
      const xTickPlan = buildAxisTickPlan(xDomain[0], xDomain[1], innerW, state.logX, {
        gridPixelGap: state.logX ? 72 : 78,
        labelPixelGap: 112,
        maxTicks: state.logX ? 96 : 48,
        minTicks: 4,
      });
      const yTickPlan = buildAxisTickPlan(yDomain[0], yDomain[1], innerH, state.logY, {
        gridPixelGap: state.logY ? 58 : 54,
        labelPixelGap: 46,
        maxTicks: state.logY ? 96 : 48,
        minTicks: 4,
      });
      const xTicks = xTickPlan.filter(item => item.label).map(item => item.value);
      const yTicks = yTickPlan.filter(item => item.label).map(item => item.value);
      const grid = svgEl("g", { class: "grid" });
      yTickPlan.forEach(({ value, major }) => {
        const gy = y(value);
        if (!Number.isFinite(gy) || gy < margin.top - 1 || gy > margin.top + innerH + 1) return;
        grid.appendChild(svgEl("line", {
          class: major ? "major-grid" : "minor-grid",
          x1: margin.left,
          x2: margin.left + innerW,
          y1: gy,
          y2: gy,
        }));
      });
      xTickPlan.forEach(({ value, major }) => {
        const gx = x(value);
        if (!Number.isFinite(gx) || gx < margin.left - 1 || gx > margin.left + innerW + 1) return;
        grid.appendChild(svgEl("line", {
          class: major ? "major-grid" : "minor-grid",
          x1: gx,
          x2: gx,
          y1: margin.top,
          y2: margin.top + innerH,
        }));
      });
      chart.appendChild(grid);

      const axis = svgEl("g", { class: "axis" });
      axis.appendChild(svgEl("line", { x1: margin.left, x2: margin.left + innerW, y1: margin.top + innerH, y2: margin.top + innerH }));
      axis.appendChild(svgEl("line", { x1: margin.left, x2: margin.left, y1: margin.top, y2: margin.top + innerH }));
      xTickPlan.forEach(({ value, major }) => {
        const gx = x(value);
        if (!Number.isFinite(gx) || gx < margin.left - 1 || gx > margin.left + innerW + 1) return;
        axis.appendChild(svgEl("line", {
          class: major ? "major-tick" : "minor-tick",
          x1: gx,
          x2: gx,
          y1: margin.top + innerH,
          y2: margin.top + innerH + (major ? 5 : 3),
        }));
        if (!major) return;
        const text = svgEl("text", { x: gx, y: margin.top + innerH + 22, "text-anchor": "middle" });
        text.textContent = formatAxisTick(value, xTicks, { compact: true });
        axis.appendChild(text);
      });
      yTickPlan.forEach(({ value, major }) => {
        const gy = y(value);
        if (!Number.isFinite(gy) || gy < margin.top - 1 || gy > margin.top + innerH + 1) return;
        axis.appendChild(svgEl("line", {
          class: major ? "major-tick" : "minor-tick",
          x1: margin.left - (major ? 5 : 3),
          x2: margin.left,
          y1: gy,
          y2: gy,
        }));
        if (!major) return;
        const text = svgEl("text", { x: margin.left - 10, y: gy + 4, "text-anchor": "end" });
        text.textContent = formatAxisTick(value, yTicks, { compact: true });
        axis.appendChild(text);
      });
      const xTitle = svgEl("text", { class: "axis-title", x: margin.left + innerW / 2, y: height - 22, "text-anchor": "middle" });
      xTitle.textContent = `${powerResearchActive()
        ? localText("누적 연구력 (전원 진행 포함)", "Cumulative research (power progression included)")
        : localText("누적 연구력 (최초 전원 포함)", "Cumulative research (first power included)")}${state.logX ? " (log)" : ""}`;
      axis.appendChild(xTitle);
      const yTitle = svgEl("text", {
        class: "axis-title",
        x: 18,
        y: margin.top + innerH / 2,
        transform: `rotate(-90 18 ${margin.top + innerH / 2})`,
        "text-anchor": "middle",
      });
      yTitle.textContent = `${metricLabel(state.metric)}${state.logY ? " (log)" : ""}`;
      axis.appendChild(yTitle);
      chart.appendChild(axis);
    }

export function groupedRows(rows) {
      const groups = new Map();
      rows.forEach(row => {
        if (!groups.has(row.familyKey)) groups.set(row.familyKey, []);
        groups.get(row.familyKey).push(row);
      });
      groups.forEach(group => group.sort((a, b) => rowUnlockResearchValue(a) - rowUnlockResearchValue(b) || a.baseDisplayName.localeCompare(b.baseDisplayName)));
      return groups;
    }

export function driveLinksAvailable() {
      return Array.isArray(DATA.driveLinks);
    }

export function visibleRowsById(rows) {
      return new Map(rows.map(row => [row.id, row]));
    }

export function resolveDriveLinkSegments(rows, coordinateForRow) {
      if (!driveLinksAvailable()) return null;
      const rowById = visibleRowsById(rows);
      return DATA.driveLinks.map(link => {
        const source = rowById.get(link.from);
        const target = rowById.get(link.to);
        if (!source || !target) return null;
        const start = coordinateForRow(source);
        const end = coordinateForRow(target);
        if (!start || !end) return null;
        if (![start.xCoord, start.yCoord, end.xCoord, end.yCoord].every(Number.isFinite)) return null;
        return { link, source, target, start, end };
      }).filter(Boolean);
    }

export function drawDriveLinkSegments(plot, segments, segmentAttrs) {
      segments.forEach(segment => {
        plot.appendChild(svgEl("path", {
          class: "base-drive-line drive-link-segment",
          d: linePath([
            [segment.start.xCoord, segment.start.yCoord],
            [segment.end.xCoord, segment.end.yCoord],
          ]),
          fill: "none",
          "data-drive-link": "true",
          "data-from": segment.link.from,
          "data-to": segment.link.to,
          "data-family-key": segment.link.familyKey || segment.source.familyKey,
          "data-thruster-count": segment.link.thrusterCount || segment.source.thrusterCount,
          ...segmentAttrs(segment),
        }));
      });
    }

export function pointAttrs(row, powerOptionId, fill, stroke = "none", strokeWidth = 0, extraClass = "", dataAttrs = {}) {
      const hovered = isHoveredPoint(row, powerOptionId);
      return {
        class: `data-point${extraClass ? ` ${extraClass}` : ""}`,
        "data-row-id": row.id,
        "data-power-option-id": powerOptionId || "",
        "data-default-stroke": stroke,
        "data-default-stroke-width": strokeWidth,
        fill,
        stroke: hovered ? "#fff" : stroke,
        "stroke-width": hovered ? 2.2 : strokeWidth,
        ...dataAttrs,
      };
    }

export function appendImpracticalPointMarker(plot, row, powerOptionId, xCoord, yCoord, radius, kind, visual) {
      if (!visual.impractical) return;
      plot.appendChild(svgEl("circle", {
        class: `impractical-point-ring${visual.paretoDominated ? " is-pareto-dominated" : ""}`,
        "data-row-id": row.id,
        "data-power-option-id": powerOptionId || "",
        "data-power-point-kind": kind,
        "data-impractical": "true",
        "data-pareto-dominated": visual.paretoDominated ? "true" : "false",
        cx: xCoord,
        cy: yCoord,
        r: radius,
      }));
    }

export function pointKey(rowId, powerOptionId = null) {
      return `${rowId}::${powerOptionId || ""}`;
    }

export function tooltipRef(rowOrId, powerOptionId = null) {
      const rowId = typeof rowOrId === "object" ? (rowOrId.rowId || rowOrId.id) : rowOrId;
      const optionId = typeof rowOrId === "object" && rowOrId.powerOptionId !== undefined && powerOptionId === null
        ? rowOrId.powerOptionId
        : powerOptionId;
      const normalizedOptionId = optionId || "";
      return { rowId, powerOptionId: normalizedOptionId, key: pointKey(rowId, normalizedOptionId) };
    }

export function dedupeTooltipRefs(items) {
      const refs = [];
      const seen = new Set();
      (items || []).forEach(item => {
        const ref = tooltipRef(item);
        if (!ref.rowId || seen.has(ref.key)) return;
        seen.add(ref.key);
        refs.push(ref);
      });
      return refs;
    }

export function resolveTooltipRow(ref, rowById, rows) {
      const direct = rowById.get(ref.rowId);
      if (direct) return direct;
      const original = allDriveRowsById.get(ref.rowId);
      if (!original) return null;
      return rows.find(row => row.baseKey === original.baseKey
        && row.thrusterCount === state.thrusters
        && row.familyKey === original.familyKey)
        || rows.find(row => row.baseKey === original.baseKey && row.thrusterCount === state.thrusters)
        || null;
    }

export function isPinnedTooltipKey(key) {
      return state.pinnedTooltipItems.some(item => item.key === key);
    }

export function pinnedTooltipRefs() {
      const lastPinned = dedupeTooltipRefs(state.lastTooltipItems).filter(item => isPinnedTooltipKey(item.key));
      const included = new Set(lastPinned.map(item => item.key));
      const missingPinned = dedupeTooltipRefs(state.pinnedTooltipItems).filter(item => !included.has(item.key));
      return [...lastPinned, ...missingPinned];
    }

export function mergePinnedTooltipRefs(items) {
      const pinned = pinnedTooltipRefs();
      const pinnedKeys = new Set(pinned.map(item => item.key));
      const transient = dedupeTooltipRefs(items).filter(item => !pinnedKeys.has(item.key));
      return [...pinned, ...transient];
    }

export function pinnedFocusTooltipRefs() {
      if (state.tooltipPinned) {
        return dedupeTooltipRefs([...state.lastTooltipItems, ...state.pinnedTooltipItems]);
      }
      return pinnedTooltipRefs();
    }

export function mergePinnedFocusTooltipRefs(items) {
      const pinned = pinnedFocusTooltipRefs();
      const pinnedKeys = new Set(pinned.map(item => item.key));
      const transient = dedupeTooltipRefs(items).filter(item => !pinnedKeys.has(item.key));
      return [...pinned, ...transient];
    }

export function syncPinnedTooltipOrder() {
      const pinnedKeys = new Set(state.pinnedTooltipItems.map(item => item.key));
      state.pinnedTooltipItems = dedupeTooltipRefs(state.lastTooltipItems).filter(item => pinnedKeys.has(item.key));
    }

export function sameTooltipRefs(left, right) {
      const a = dedupeTooltipRefs(left);
      const b = dedupeTooltipRefs(right);
      return a.length === b.length && a.every((item, index) => item.key === b[index].key);
    }

export function powerResearchFocusedDriveIds() {
      const refs = mergePinnedFocusTooltipRefs(state.hoverPoints);
      return new Set(refs.map(item => item.rowId).filter(Boolean));
    }

export function powerResearchFocusSignature() {
      return Array.from(powerResearchFocusedDriveIds()).sort().join("|");
    }

export function redrawPowerResearchFocusIfChanged(previousSignature) {
      if (!powerResearchActive() || !currentChartRows.length) return false;
      if (previousSignature === powerResearchFocusSignature()) return false;
      renderingCallbacks.redrawChartOnly();
      return true;
    }

export function isHoveredPoint(row, powerOptionId = null) {
      const key = pointKey(row.id, powerOptionId);
      return state.hoverPoints.some(item => item.key === key);
    }

export function setHoverPoints(items) {
      const previousSignature = powerResearchFocusSignature();
      state.hoverPoints = dedupeTooltipRefs(items);
      if (!redrawPowerResearchFocusIfChanged(previousSignature)) {
        updateHoverStyles();
      }
    }

export function registerHitTarget(row, powerOptionId, xCoord, yCoord, radius = 5) {
      if (!Number.isFinite(xCoord) || !Number.isFinite(yCoord) || !pointVisibleInPlot(xCoord, yCoord)) return;
      chartHitTargets.push({
        ...tooltipRef(row, powerOptionId),
        x: xCoord,
        y: yCoord,
        radius,
        order: chartHitTargets.length,
      });
    }

export function registerLadderHitTargets(row, optionPoints) {
      if (!Array.isArray(optionPoints) || optionPoints.length < 2) return;
      const baseOptionId = optionPoints[0].option ? optionPoints[0].option.id : null;
      for (let index = 0; index < optionPoints.length - 1; index += 1) {
        const start = optionPoints[index];
        const end = optionPoints[index + 1];
        if (!Number.isFinite(start.xCoord) || !Number.isFinite(start.yCoord)
          || !Number.isFinite(end.xCoord) || !Number.isFinite(end.yCoord)) continue;
        if (!segmentMayIntersectPlot(start, end)) continue;
        chartLadderHitTargets.push({
          ...tooltipRef(row, baseOptionId),
          x1: start.xCoord,
          y1: start.yCoord,
          x2: end.xCoord,
          y2: end.yCoord,
          order: chartLadderHitTargets.length,
        });
      }
    }

export function segmentMayIntersectPlot(start, end) {
      if (!chartViewport) return false;
      if (pointVisibleInPlot(start.xCoord, start.yCoord) || pointVisibleInPlot(end.xCoord, end.yCoord)) return true;
      const { margin, innerW, innerH } = chartViewport;
      const minX = Math.min(start.xCoord, end.xCoord);
      const maxX = Math.max(start.xCoord, end.xCoord);
      const minY = Math.min(start.yCoord, end.yCoord);
      const maxY = Math.max(start.yCoord, end.yCoord);
      return maxX >= margin.left
        && minX <= margin.left + innerW
        && maxY >= margin.top
        && minY <= margin.top + innerH;
    }

export function pointVisibleInPlot(xCoord, yCoord) {
      if (!chartViewport) return false;
      const { margin, innerW, innerH } = chartViewport;
      return xCoord >= margin.left
        && xCoord <= margin.left + innerW
        && yCoord >= margin.top
        && yCoord <= margin.top + innerH;
    }

export function updateHoverStyles() {
      const hoveredKeys = new Set(state.hoverPoints.map(item => item.key));
      chart.querySelectorAll(".data-point").forEach(point => {
        const hovered = hoveredKeys.has(pointKey(point.getAttribute("data-row-id"), point.getAttribute("data-power-option-id")));
        point.setAttribute("stroke", hovered ? "#fff" : (point.getAttribute("data-default-stroke") || "none"));
        point.setAttribute("stroke-width", hovered ? "2.2" : (point.getAttribute("data-default-stroke-width") || "0"));
      });
      drawPointStateOverlay();
    }

export function drawPointStateOverlay() {
      chart.querySelector(".point-state-overlay")?.remove();
      if (!chartHitTargets.length) return;
      const selectedKeys = new Set(dedupeTooltipRefs(state.lastTooltipItems).map(item => item.key));
      const explicitPinnedKeys = new Set(dedupeTooltipRefs(state.pinnedTooltipItems).map(item => item.key));
      const pinnedKeys = new Set([
        ...explicitPinnedKeys,
        ...(state.tooltipPinned ? selectedKeys : []),
      ]);
      const hoverKeys = new Set(dedupeTooltipRefs(state.hoverPoints).map(item => item.key));
      if (!pinnedKeys.size && !hoverKeys.size && !selectedKeys.size) return;

      const overlay = svgEl("g", { class: "point-state-overlay", "aria-hidden": "true" });
      const drawn = new Set();
      chartHitTargets.forEach(target => {
        if (drawn.has(target.key)) return;
        const pinned = pinnedKeys.has(target.key);
        const hovered = hoverKeys.has(target.key);
        const selected = selectedKeys.has(target.key);
        if (!pinned && !hovered && !selected) return;
        drawn.add(target.key);
        const stateClass = pinned ? "is-pinned" : (hovered ? "is-hovered" : "is-selected");
        const stateName = pinned ? "pinned" : (hovered ? "hovered" : "selected");
        overlay.appendChild(svgEl("circle", {
          class: `point-state-ring ${stateClass}`,
          "data-row-id": target.rowId,
          "data-power-option-id": target.powerOptionId || "",
          "data-overlay-state": stateName,
          cx: target.x,
          cy: target.y,
          r: Math.max(7.4, (Number(target.radius) || 5) + (pinned ? 3.2 : 2.4)),
        }));
      });
      if (overlay.childNodes.length) chart.appendChild(overlay);
    }

export function drawMetricLines(rows, x, y, plot) {
      const groups = groupedRows(rows);
      const linkSegments = resolveDriveLinkSegments(rows, row => {
        const value = metricDefs[state.metric].value(row);
        if (!Number.isFinite(value) || value <= 0) return null;
        return {
          xCoord: x(rowUnlockResearchValue(row)),
          yCoord: y(value),
        };
      });
      if (linkSegments) {
        drawDriveLinkSegments(plot, linkSegments, segment => ({
          stroke: segment.source.familyColor,
          "stroke-width": 2.2,
          "stroke-linejoin": "round",
          "stroke-linecap": "round",
          opacity: 0.82,
        }));
      }
      groups.forEach(group => {
        const color = group[0].familyColor;
        if (!linkSegments) {
          const path = linePath(group.map(row => [x(rowUnlockResearchValue(row)), y(metricDefs[state.metric].value(row))]));
          plot.appendChild(svgEl("path", { class: "base-drive-line family-fallback-line", d: path, fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0.82 }));
        }
        group.forEach(row => {
          const value = metricDefs[state.metric].value(row);
          if (!Number.isFinite(value) || value <= 0) return;
          const cx = x(rowUnlockResearchValue(row));
          const cy = y(value);
          const option = defaultTooltipOption(row);
          const powerOptionId = option ? option.id : null;
          registerHitTarget(row, powerOptionId, cx, cy, 5.5);
          const circle = svgEl("circle", { ...pointAttrs(row, powerOptionId, color), cx, cy, r: 5.5 });
          plot.appendChild(circle);
        });
      });
    }

export function baseChartResearchValues(rows) {
      const values = isBandMetric()
        ? rows.map(row => {
          const option = chartMassOptions(row)[0];
          return option ? optionAdditionalResearchValue(row, option) : rowUnlockResearchValue(row);
        })
        : rows.map(row => rowUnlockResearchValue(row));
      return values.filter(value => Number.isFinite(value) && value > 0);
    }

export function chartResearchValues(rows) {
      const values = isBandMetric()
        ? rows.flatMap(row => {
          const base = rowUnlockResearchValue(row);
          if (!powerResearchActive()) return [base];
          return [
            base,
            ...chartMassOptions(row).map(option => optionAdditionalResearchValue(row, option)),
          ];
        })
        : rows.map(row => rowUnlockResearchValue(row));
      return values.filter(value => Number.isFinite(value) && value > 0);
    }

export function optionAdditionalResearchValue(row, option = null) {
      if (!option) return rowUnlockResearchValue(row);
      const combined = Number(option.combinedCumulativeResearch);
      if (Number.isFinite(combined) && combined > 0) return combined;
      const plantResearch = Number(option.cumulativeResearch);
      return Math.max(rowUnlockResearchValue(row), Number.isFinite(plantResearch) ? plantResearch : 0);
    }

export function optionPowerResearchDelta(row, option = null) {
      if (!option || option.selfContained) return 0;
      const base = Number(row.cumulativeResearch) || 0;
      const combined = Number(option.combinedCumulativeResearch);
      if (Number.isFinite(combined)) return Math.max(0, combined - base);
      const plantResearch = Number(option.cumulativeResearch);
      return Math.max(0, (Number.isFinite(plantResearch) ? plantResearch : base) - base);
    }

export function optionResearchValue(row, option = null) {
      if (powerResearchActive() && option) {
        return optionAdditionalResearchValue(row, option);
      }
      return rowUnlockResearchValue(row);
    }

export function optionX(row, option, x) {
      return x(optionResearchValue(row, option));
    }

export function drawTotalMassBands(rows, x, y, plot) {
      const pointData = bandPointData(rows);
      const secondaryDomain = secondaryEncodingDomain(pointData);
      const paretoKeys = state.paretoHighlight ? paretoPointKeys(pointData) : new Set();
      const focusedDriveIds = powerResearchFocusedDriveIds();
      if (powerResearchComparisonMode()) {
        drawPowerBestAvailableComparison(rows, x, y, plot, secondaryDomain, paretoKeys, focusedDriveIds);
        return;
      }
      const linkSegments = resolveDriveLinkSegments(rows, row => {
        const option = chartMassOptions(row)[0];
        if (!option) return null;
        return {
          option,
          xCoord: optionX(row, option, x),
          yCoord: y(optionMetricValue(option)),
        };
      });
      if (linkSegments) {
        drawDriveLinkSegments(plot, linkSegments, segment => {
          const color = segment.source.familyBandColor || segment.source.familyColor;
          const colorOklch = segment.source.familyBandColorOklch || color;
          return {
            stroke: color,
            style: paintStyle("stroke", color, colorOklch),
            "stroke-width": 1.7,
            opacity: 0.58,
          };
        });
      }
      const groups = groupedRows(rows);
      groups.forEach(group => {
        const color = group[0].familyBandColor || group[0].familyColor;
        const colorOklch = group[0].familyBandColorOklch || color;
        const fillStyle = paintStyle("fill", color, colorOklch);
        const strokeStyle = paintStyle("stroke", color, colorOklch);
        const basePoints = group.map(row => {
          const option = chartMassOptions(row)[0];
          if (!option) return null;
          const xCoord = optionX(row, option, x);
          const yCoord = y(optionMetricValue(option));
          return Number.isFinite(xCoord) && Number.isFinite(yCoord) ? { row, option, xCoord, yCoord } : null;
        }).filter(Boolean);
        if (!linkSegments && basePoints.length >= 2) {
          plot.appendChild(svgEl("path", {
            class: "base-drive-line family-fallback-line",
            d: linePath(basePoints.map(point => [point.xCoord, point.yCoord])),
            fill: "none",
            stroke: color,
            style: strokeStyle,
            "stroke-width": 1.7,
            opacity: 0.58,
          }));
        }
        group.forEach(row => {
          drawPowerLadder(row, x, y, plot, color, fillStyle, strokeStyle, secondaryDomain, paretoKeys, focusedDriveIds, { pointsOnly: false });
        });
        group.forEach(row => {
          drawPowerLadder(row, x, y, plot, color, fillStyle, strokeStyle, secondaryDomain, paretoKeys, focusedDriveIds, { pointsOnly: true });
        });
      });
    }

export function powerResearchComparisonMode() {
      return state.powerResearchView === "best";
    }

export function drawPowerBestAvailableComparison(rows, x, y, plot, secondaryDomain, paretoKeys, focusedDriveIds) {
      const linkSegments = resolveDriveLinkSegments(rows, row => firstCompatiblePowerPoint(row, x, y));
      if (linkSegments) {
        drawDriveLinkSegments(plot, linkSegments, segment => {
          const color = segment.source.familyBandColor || segment.source.familyColor;
          const colorOklch = segment.source.familyBandColorOklch || color;
          return {
            stroke: color,
            style: paintStyle("stroke", color, colorOklch),
            "stroke-width": 1.35,
            "stroke-dasharray": "3 5",
            opacity: 0.44,
          };
        });
      }
      const groups = groupedRows(rows);
      groups.forEach(group => {
        const color = group[0].familyBandColor || group[0].familyColor;
        const colorOklch = group[0].familyBandColorOklch || color;
        const fillStyle = paintStyle("fill", color, colorOklch);
        const strokeStyle = paintStyle("stroke", color, colorOklch);
        const basePoints = group.map(row => firstCompatiblePowerPoint(row, x, y)).filter(Boolean);
        if (!linkSegments && basePoints.length >= 2) {
          plot.appendChild(svgEl("path", {
            class: "base-drive-line family-fallback-line",
            d: linePath(basePoints.map(point => [point.xCoord, point.yCoord])),
            fill: "none",
            stroke: color,
            style: strokeStyle,
            "stroke-width": 1.35,
            "stroke-dasharray": "3 5",
            opacity: 0.44,
          }));
        }
        group.forEach(row => {
          drawBestAvailablePowerPath(row, x, y, plot, color, fillStyle, strokeStyle, secondaryDomain, paretoKeys, focusedDriveIds);
        });
        basePoints.forEach(point => {
          drawFirstCompatiblePowerPoint(point.row, point.option, point.xCoord, point.yCoord, plot, color, fillStyle, secondaryDomain, paretoKeys);
        });
      });
    }

export function firstCompatiblePowerPoint(row, x, y) {
      const option = sortedChartPowerOptions(row)[0];
      if (!option) return null;
      const xCoord = x(optionAdditionalResearchValue(row, option));
      const yCoord = y(optionMetricValue(option));
      return Number.isFinite(xCoord) && Number.isFinite(yCoord) ? { row, option, xCoord, yCoord } : null;
    }

export function drawFirstCompatiblePowerPoint(row, option, xCoord, yCoord, plot, color, fillStyle, secondaryDomain, paretoKeys) {
      const visual = bandPointVisualState(row, option, secondaryDomain, paretoKeys, "power-base-point");
      registerHitTarget(row, option.id, xCoord, yCoord, 5.5);
      plot.appendChild(svgEl("circle", {
        ...pointAttrs(
          row,
          option.id,
          color,
          visual.impractical ? "var(--danger)" : "none",
          visual.impractical ? 1.5 : 0,
          visual.className,
          visual.dataAttrs,
        ),
        cx: xCoord,
        cy: yCoord,
        r: 5.5,
        style: `${fillStyle}${visual.style}`,
        opacity: clamp(visual.opacity, 0.12, 1),
        "data-power-point-kind": "base",
      }));
      appendImpracticalPointMarker(plot, row, option.id, xCoord, yCoord, 7.1, "base", visual);
    }

export function drawBestAvailablePowerPath(row, x, y, plot, color, fillStyle, strokeStyle, secondaryDomain, paretoKeys, focusedDriveIds) {
      const steps = bestAvailablePowerSteps(row);
      if (!steps.length) return;
      const focused = focusedDriveIds.has(row.id);
      const points = steps.map(step => {
        const xCoord = x(step.research);
        const yCoord = y(step.value);
        return { ...step, xCoord, yCoord };
      }).filter(point => Number.isFinite(point.xCoord) && Number.isFinite(point.yCoord));
      if (!points.length) return;
      if (points.length >= 2) {
        plot.appendChild(svgEl("path", {
          class: `power-best-line${focused ? " is-focused" : " is-subdued"}`,
          d: linePath(points.map(point => [point.xCoord, point.yCoord])),
          fill: "none",
          stroke: color,
          style: strokeStyle,
          "stroke-width": focused ? 1.8 : 1.35,
          "stroke-linejoin": "round",
          "stroke-linecap": "round",
          opacity: focused ? 0.9 : 0.62,
          "data-row-id": row.id,
        }));
      }
      points.forEach((point, index) => {
        if (index === 0) return;
        const { option, xCoord, yCoord } = point;
        const visual = bandPointVisualState(row, option, secondaryDomain, paretoKeys, `power-extra-point power-best-point${focused ? " is-focused" : " is-subdued"}`);
        plot.appendChild(svgEl("circle", {
          ...pointAttrs(
            row,
            option.id,
            "var(--panel)",
            visual.impractical ? "var(--danger)" : color,
            visual.impractical ? 1.5 : 1.65,
            visual.className,
            visual.dataAttrs,
          ),
          cx: xCoord,
          cy: yCoord,
          r: 3.7,
          style: visual.style,
          opacity: clamp(visual.opacity * (focused ? 1 : 0.58), 0.12, 1),
          "data-power-point-kind": "best",
        }));
        appendImpracticalPointMarker(plot, row, option.id, xCoord, yCoord, 5.2, "best", visual);
        registerHitTarget(row, option.id, xCoord, yCoord, 4.4);
      });
    }

export function sortedChartPowerOptions(row, metric = state.metric, availabilityPredicate = () => true) {
      // TODO(save-aware): Issue #7 should pass save-derived project availability here so Best Available can exclude power plants unavailable in the loaded campaign.
      return chartMassOptions(row, metric)
        .filter(option => availabilityPredicate(row, option))
        .filter(option => {
          const research = optionAdditionalResearchValue(row, option);
          const value = optionMetricValue(option, metric);
          return Number.isFinite(research) && research > 0 && Number.isFinite(value) && value > 0;
        })
        .sort((left, right) => optionAdditionalResearchValue(row, left) - optionAdditionalResearchValue(row, right)
          || (Number(left.sequenceIndex) || 0) - (Number(right.sequenceIndex) || 0)
          || String(left.id || "").localeCompare(String(right.id || "")));
    }

export function bestAvailablePowerSteps(row, metric = state.metric, availabilityPredicate = () => true) {
      const options = sortedChartPowerOptions(row, metric, availabilityPredicate);
      if (!options.length) return [];
      const steps = [];
      let best = null;
      for (let index = 0; index < options.length;) {
        const research = optionAdditionalResearchValue(row, options[index]);
        let groupEnd = index + 1;
        while (groupEnd < options.length && Math.abs(optionAdditionalResearchValue(row, options[groupEnd]) - research) <= 1e-9) {
          groupEnd += 1;
        }
        for (let groupIndex = index; groupIndex < groupEnd; groupIndex += 1) {
          const option = options[groupIndex];
          if (!best || betterPowerMetricValue(optionMetricValue(option, metric), optionMetricValue(best, metric), metric)) {
            best = option;
          }
        }
        if (best && (!steps.length || steps[steps.length - 1].option.id !== best.id)) {
          steps.push({
            research,
            option: best,
            value: optionMetricValue(best, metric),
          });
        }
        index = groupEnd;
      }
      return steps;
    }

export function betterPowerMetricValue(candidate, current, metric = state.metric) {
      if (!Number.isFinite(candidate)) return false;
      if (!Number.isFinite(current)) return true;
      if (metric === "twr") return candidate > current * (1 + 1e-9);
      return candidate < current * (1 - 1e-9);
    }

export function drawPowerLadder(row, x, y, plot, color, fillStyle, strokeStyle, secondaryDomain, paretoKeys, focusedDriveIds, options = {}) {
      const powerOptions = chartMassOptions(row);
      if (!powerOptions.length) return;
      const focused = focusedDriveIds.has(row.id);
      const showExtras = shouldShowExtraPowerOptions(row, focused);
      const optionPoints = powerOptions.map((option, index) => {
        const xCoord = optionX(row, option, x);
        const yCoord = y(optionMetricValue(option));
        return {
          option,
          index,
          xCoord,
          yCoord,
          visible: index === 0 || showExtras,
        };
      }).filter(point => point.visible && Number.isFinite(point.xCoord) && Number.isFinite(point.yCoord))
        .sort((a, b) => a.xCoord - b.xCoord || a.yCoord - b.yCoord);
      if (!optionPoints.length) return;
      if (!options.pointsOnly) {
        if (showExtras && optionPoints.length > 1) {
          registerLadderHitTargets(row, optionPoints);
          plot.appendChild(svgEl("path", {
            class: `power-ladder-line${focused ? " is-focused" : " is-subdued"}`,
            d: linePath(optionPoints.map(point => [point.xCoord, point.yCoord])),
            fill: "none",
            stroke: color,
            style: strokeStyle,
            "stroke-width": focused ? 1.65 : 1.05,
            "stroke-dasharray": "5 5",
            opacity: focused ? 0.78 : 0.26,
            "data-row-id": row.id,
          }));
        }
        return;
      }
      optionPoints.forEach(point => {
        const { option, index, xCoord, yCoord } = point;
        const isBase = index === 0;
        const visual = bandPointVisualState(
          row,
          option,
          secondaryDomain,
          paretoKeys,
          isBase ? "power-base-point" : `power-extra-point${focused ? " is-focused" : " is-subdued"}`,
        );
        const subduedOpacity = !isBase && state.powerResearchView === "all" && !focused ? 0.38 : 1;
        registerHitTarget(row, option.id, xCoord, yCoord, isBase ? 5.5 : 4.4);
        const circle = svgEl("circle", {
          ...pointAttrs(
            row,
            option.id,
            isBase ? color : "var(--panel)",
            visual.impractical ? "var(--danger)" : color,
            visual.impractical ? 1.5 : (isBase ? 1 : 1.65),
            visual.className,
            visual.dataAttrs,
          ),
          cx: xCoord,
          cy: yCoord,
          r: isBase ? 5.5 : 3.7,
          style: `${isBase ? fillStyle : ""}${visual.style}`,
          opacity: clamp(visual.opacity * subduedOpacity, 0.12, 1),
          "data-power-point-kind": isBase ? "base" : "extra",
        });
        plot.appendChild(circle);
        appendImpracticalPointMarker(plot, row, option.id, xCoord, yCoord, isBase ? 7.1 : 5.2, isBase ? "base" : "extra", visual);
      });
    }

export function shouldShowExtraPowerOptions(row, focused) {
      if (!powerResearchActive()) return false;
      if (state.powerResearchView === "all") return true;
      return focused;
    }

export function bandPointData(rows) {
      return rows.flatMap(row => chartSummaryMassOptions(row).map(option => ({
        row,
        option,
        key: pointKey(row.id, option.id),
        research: optionResearchValue(row, option),
        totalMassTons: option.totalMassTons,
        twr: option.twr,
      }))).filter(item => Number.isFinite(item.research)
        && Number.isFinite(item.totalMassTons)
        && Number.isFinite(item.twr)
        && item.totalMassTons > 0
        && item.twr > 0);
    }

export function secondaryEncodingEnabled() {
      return ((state.metric === "totalMassTons" || state.metric === "fuelMassTons") && state.showTwrInfo)
        || (state.metric === "twr" && state.showMassInfo);
    }

export function secondaryEncodingDomain(points) {
      if (!secondaryEncodingEnabled()) return null;
      const scores = points.map(item => secondaryScore(item.option)).filter(Number.isFinite);
      if (!scores.length) return null;
      return { min: Math.min(...scores), max: Math.max(...scores) };
    }

export function secondaryScore(option) {
      if (state.metric === "totalMassTons" || state.metric === "fuelMassTons") {
        return Math.log10(Math.max(option.twr, 1e-12));
      }
      if (state.metric === "twr") {
        return -Math.log10(Math.max(option.totalMassTons, 1e-9));
      }
      return NaN;
    }

export function bandPointVisual(option, secondaryDomain, pareto) {
      let normalized = 0.72;
      if (secondaryDomain) {
        const span = Math.max(secondaryDomain.max - secondaryDomain.min, 1e-9);
        normalized = clamp((secondaryScore(option) - secondaryDomain.min) / span, 0, 1);
      }
      const encodedOpacity = secondaryDomain ? 0.42 + normalized * 0.58 : 0.88;
      const paretoOpacity = state.paretoHighlight && !pareto ? 0.28 : 1;
      const brightness = secondaryDomain ? 0.68 + normalized * 0.72 : 1;
      return {
        opacity: clamp(encodedOpacity * paretoOpacity, 0.12, 1),
        style: `filter:brightness(${brightness.toFixed(2)});`,
      };
    }

export function bandPointVisualState(row, option, secondaryDomain, paretoKeys, extraClass = "") {
      const key = pointKey(row.id, option.id);
      const paretoDominated = !!state.paretoHighlight && !paretoKeys.has(key);
      const impractical = isImpracticalOption(option);
      const visual = bandPointVisual(option, secondaryDomain, !paretoDominated);
      const classes = [
        extraClass,
        paretoDominated ? "is-pareto-dominated" : "",
        impractical ? "is-impractical" : "",
        secondaryDomain ? "has-secondary-encoding" : "",
      ].filter(Boolean).join(" ");
      return {
        ...visual,
        key,
        paretoDominated,
        impractical,
        className: classes,
        dataAttrs: {
          "data-pareto-dominated": paretoDominated ? "true" : "false",
          "data-impractical": impractical ? "true" : "false",
          "data-secondary-encoding": secondaryDomain ? "true" : "false",
        },
      };
    }

export function paretoPointKeys(points) {
      const result = new Set();
      points.forEach(candidate => {
        const dominated = points.some(other => other.key !== candidate.key
          && other.research <= candidate.research
          && other.totalMassTons <= candidate.totalMassTons
          && other.twr >= candidate.twr
          && (other.research < candidate.research
            || other.totalMassTons < candidate.totalMassTons
            || other.twr > candidate.twr));
        if (!dominated) result.add(candidate.key);
      });
      return result;
    }


export function defaultTooltipOption(row) {
      const options = chartMassOptions(row, state.metric);
      return options[0] || massOptions(row)[0] || null;
    }

export function linePath(points) {
      return points.map((point, index) => `${index === 0 ? "M" : "L"}${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(" ");
    }

export function svgEl(name, attrs) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", name);
      Object.entries(attrs || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) el.setAttribute(key, String(value));
      });
      return el;
    }

