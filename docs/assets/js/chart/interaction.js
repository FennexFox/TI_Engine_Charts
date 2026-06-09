import { chartSummaryMassOptions, clamp, computeDriveDiagnostics, filteredRows } from "../calc/filtering.js";
import { localLabel } from "../presets/library.js";
import { CHART_CLICK_TOLERANCE_PX, CHART_HIT_RADIUS_PX, CHART_LADDER_HIT_RADIUS_PX, DATA, UI_LANG, chart, localText, metricDefs, metricHint, metricLabel, normalizePowerResearchView, powerResearchActive, powerResearchViewLabel, state, updateLeftPanelCardSummaries } from "../state/core.js";
import { updateChartControls } from "../ui/controls.js";
import { backgroundStyle, clearTooltip, pinTooltipItems, refreshTooltip, renderTable, unpinTooltip } from "../ui/tooltip_table.js";
import { axisSpaceValue, buildAxisTickPlan, makeScale, normalizeAxisDomain, valueFromAxisSpace } from "./axis.js";
import { chartHitTargets, chartLadderHitTargets, chartViewport, currentChartRows, setChartHitTargets, setChartLadderHitTargets, setChartViewport, setCurrentChartRows, setCurrentDiagnostics } from "./context.js";
import { chartResearchValues, dedupeTooltipRefs, drawGridAndAxes, drawMetricLines, drawTotalMassBands, isBandMetric, mergePinnedTooltipRefs, optionMetricValue, pinnedTooltipRefs, sameTooltipRefs, secondaryEncodingEnabled, setHoverPoints, svgEl } from "./rendering.js";

export function render() {
      const diagnostics = computeDriveDiagnostics();
      setCurrentDiagnostics(diagnostics);
      const rows = diagnostics.visibleRows;
      const metric = metricDefs[state.metric];
      document.getElementById("visibleCount").textContent = rows.length;
      document.getElementById("metricHint").textContent = metricHint(state.metric);
      document.getElementById("metricColumn").textContent = metricLabel(state.metric);
      updateChartControls();
      renderFamilyDiagnostics(diagnostics);
      renderChartDiagnostic(diagnostics);
      renderLegend(rows);
      renderChart(rows);
      renderTable(rows);
      updateSortHeaders();
      updateLeftPanelCardSummaries();
      refreshTooltip(rows);
    }

export function redrawChartOnly() {
      const diagnostics = computeDriveDiagnostics();
      setCurrentDiagnostics(diagnostics);
      const rows = diagnostics.visibleRows;
      renderChart(rows);
      updateZoomButton();
      refreshTooltip(rows);
    }

export function currentZoomContext() {
      const categoryState = DATA.categories.map(category => `${category.key}:${state.categories[category.key] ? 1 : 0}`).join("|");
      const familyState = DATA.subfamilies.map(family => `${family.key}:${state.families[family.key] ? 1 : 0}`).join("|");
      return [
        state.metric,
        state.fuelEfficiencyUnit,
        state.thrusters,
        state.dryMassTons,
        state.targetDvKps,
        state.radiatorId,
        state.showImpracticalCandidates ? 1 : 0,
        normalizePowerResearchView(state.powerResearchView),
        state.logX ? 1 : 0,
        state.logY ? 1 : 0,
        state.searchTerm,
        categoryState,
        familyState,
      ].join(";");
    }

export function updateZoomButton() {
      const resetZoom = document.getElementById("resetZoom");
      if (resetZoom) resetZoom.disabled = !state.zoom;
    }

export function updateSortHeaders() {
      document.querySelectorAll("[data-sort]").forEach(button => {
        const active = button.dataset.sort === state.sortKey;
        button.dataset.active = active ? "true" : "false";
        button.dataset.arrow = active ? (state.sortDirection === "asc" ? "▲" : "▼") : "";
        button.setAttribute("aria-sort", active ? (state.sortDirection === "asc" ? "ascending" : "descending") : "none");
      });
    }

export function renderFamilyDiagnostics(diagnostics) {
      const byKey = new Map(diagnostics.families.map(family => [family.key, family]));
      document.querySelectorAll(".family-row").forEach(row => {
        const stats = byKey.get(row.dataset.familyKey);
        const count = row.querySelector(".family-count");
        if (!count || !stats) return;
        count.textContent = UI_LANG === "en"
          ? `${stats.visible} / ${stats.total} shown`
          : `${stats.visible} / ${stats.total} 표시`;
      });
      const warningsRoot = document.getElementById("familyWarnings");
      if (!warningsRoot) return;
      warningsRoot.innerHTML = "";
      diagnostics.zeroFamilies.forEach(family => {
        const item = document.createElement("div");
        item.className = "family-warning";
        item.textContent = familyWarningText(family);
        warningsRoot.appendChild(item);
      });
    }

export function renderChartDiagnostic(diagnostics) {
      const banner = document.getElementById("chartDiagnostic");
      if (!banner) return;
      if (!diagnostics.zeroFamilies.length) {
        banner.hidden = true;
        banner.textContent = "";
        return;
      }
      const count = diagnostics.zeroFamilies.length;
      banner.hidden = false;
      banner.textContent = UI_LANG === "en"
        ? `${count} selected drive ${count === 1 ? "family has" : "families have"} no visible candidates under the current scenario.`
        : `선택된 드라이브 계열 ${count}개는 현재 시나리오에서 표시 후보가 없습니다.`;
    }

export function familyWarningText(family) {
      const label = localLabel(family);
      const phrase = hiddenReasonPhrase(family.dominantReason, family.hiddenReasons);
      return UI_LANG === "en"
        ? `${label}: ${family.hidden} drives hidden by ${phrase}.`
        : `${label}: ${family.hidden}개 드라이브가 ${phrase} 때문에 숨겨졌습니다.`;
    }

export function hiddenReasonPhrase(reason, hiddenReasons = {}) {
      const reasonKey = reason || "other";
      if (reasonKey === "minTwr" && hiddenReasons.targetDvOrMassRatio) {
        return UI_LANG === "en" ? "current dV / minimum TWR settings" : "현재 dV / 최소 TWR 설정";
      }
      const phrases = {
        minTwr: UI_LANG === "en" ? "the current minimum TWR filter" : "현재 최소 TWR 필터",
        minDv: UI_LANG === "en" ? "the current minimum dV filter" : "현재 최소 dV 필터",
        targetDvOrMassRatio: UI_LANG === "en" ? "the current target dV / mass-ratio scenario" : "현재 목표 dV / 질량비 시나리오",
        researchFilter: UI_LANG === "en" ? "research unlock constraints" : "연구 개방 조건",
        invalidPowerPlant: UI_LANG === "en" ? "missing compatible power candidates" : "호환 전원 후보 부족",
        invalidComputation: UI_LANG === "en" ? "non-finite mass or TWR calculations" : "계산 불능 질량 또는 TWR",
        axisRange: UI_LANG === "en" ? "the current axis range or metric" : "현재 축 범위 또는 지표",
        other: UI_LANG === "en" ? "other current filters" : "기타 현재 필터",
        familyFilter: UI_LANG === "en" ? "family/category filters" : "대분류/계열 필터",
      };
      return phrases[reasonKey] || phrases.other;
    }

export function renderLegend(rows) {
      const used = new Set(rows.map(row => row.familyKey));
      const legend = document.getElementById("legend");
      legend.innerHTML = "";
      DATA.categories.forEach(category => {
        const subfamilies = DATA.subfamilies.filter(f => f.categoryKey === category.key && used.has(f.key));
        if (!subfamilies.length) return;
        const group = document.createElement("span");
        group.className = "legend-group";
        const heading = document.createElement("span");
        heading.className = "legend-heading";
        heading.textContent = localLabel(category);
        group.appendChild(heading);
        subfamilies.forEach(f => {
          const item = document.createElement("span");
          item.className = "legend-item";
          const swatch = document.createElement("span");
          swatch.className = "legend-swatch";
          if (isBandMetric()) {
            swatch.setAttribute("style", backgroundStyle(f.bandColor || f.color, f.bandColorOklch || f.bandColor || f.color));
          } else {
            swatch.setAttribute("style", backgroundStyle(f.color, f.colorOklch || f.color));
          }
          item.append(swatch, document.createTextNode(localLabel(f)));
          group.appendChild(item);
        });
        legend.appendChild(group);
      });
      if (isBandMetric()) {
        const item = document.createElement("span");
        item.className = "legend-item";
        const powerViewDescription = state.powerResearchView === "best"
          ? localText("최적 가용 전원", "best available power")
          : localText("전원 사다리", "power ladders");
        item.textContent = powerResearchActive()
          ? `${metricLabel(state.metric)} ${powerViewDescription}`
          : `${metricLabel(state.metric)} ${localText("기본 전원", "base power")}`;
        legend.appendChild(item);
        const powerResearch = document.createElement("span");
        powerResearch.className = "legend-item";
        powerResearch.textContent = powerResearchActive()
          ? `${localText("전원 보기", "Power view")}: ${powerResearchViewLabel()}`
          : localText("X축: 최초 전원 포함 연구력", "X axis: first power-inclusive research");
        legend.appendChild(powerResearch);
        if (secondaryEncodingEnabled()) {
          const secondary = document.createElement("span");
          secondary.className = "legend-item";
          secondary.textContent = (state.metric === "totalMassTons" || state.metric === "fuelMassTons")
            ? localText("점 밝기: TWR 높을수록 밝음", "Point brightness: brighter means higher TWR")
            : localText("점 밝기: 총질량 낮을수록 밝음", "Point brightness: brighter means lower total mass");
          legend.appendChild(secondary);
        }
        if (state.paretoHighlight) {
          const pareto = document.createElement("span");
          pareto.className = "legend-item";
          pareto.textContent = localText("흐린 점: Pareto 지배 후보", "Dim points: Pareto-dominated candidates");
          legend.appendChild(pareto);
        }
      }
    }

export function valueDomain(rows) {
      if (isBandMetric()) {
        const values = rows.flatMap(row => chartSummaryMassOptions(row).map(option => optionMetricValue(option)));
        return paddedDomain(values, state.logY);
      }
      const values = rows.map(metricDefs[state.metric].value).filter(v => Number.isFinite(v) && v > 0);
      return paddedDomain(values, state.logY);
    }

export function paddedDomain(values, logScale) {
      if (!values.length) return [1, 10];
      let min = Math.min(...values);
      let max = Math.max(...values);
      if (logScale) {
        min = Math.max(min / 1.35, 1e-9);
        max *= 1.35;
      } else {
        const pad = (max - min || max || 1) * 0.08;
        min = Math.max(0, min - pad);
        max += pad;
      }
      return [min, max];
    }

export function renderChart(rows) {
      const width = 1120;
      const height = 660;
      const margin = { top: 34, right: 32, bottom: 72, left: 86 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      setCurrentChartRows(rows);
      setChartHitTargets([]);
      setChartLadderHitTargets([]);
      state.hoverPoints = state.tooltipPinned
        ? dedupeTooltipRefs(state.lastTooltipItems)
        : (powerResearchActive() ? mergePinnedTooltipRefs(state.hoverPoints) : pinnedTooltipRefs());
      chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
      chart.setAttribute("preserveAspectRatio", "xMidYMid meet");
      chart.innerHTML = "";

      const xValues = chartResearchValues(rows);
      const baseXDomain = paddedDomain(xValues, state.logX);
      const baseYDomain = valueDomain(rows);
      const preserveViewport = !!(state.preserveViewportOnce && state.zoom);
      const xDomain = preserveViewport
        ? state.zoom.xDomain.slice()
        : (state.zoom ? constrainDomain(state.zoom.xDomain, baseXDomain, state.logX) : baseXDomain);
      const yDomain = preserveViewport
        ? state.zoom.yDomain.slice()
        : (state.zoom ? constrainDomain(state.zoom.yDomain, baseYDomain, state.logY) : baseYDomain);
      if (state.zoom) {
        state.zoom = { xDomain, yDomain };
      }
      state.preserveViewportOnce = false;
      const x = makeScale(xDomain, [margin.left, margin.left + innerW], state.logX);
      const y = makeScale(yDomain, [margin.top + innerH, margin.top], state.logY);
      setChartViewport({ width, height, margin, innerW, innerH, xDomain, yDomain, baseXDomain, baseYDomain });

      drawGridAndAxes({ width, height, margin, innerW, innerH, x, y, xDomain, yDomain });
      const clipId = "plotClip";
      const defs = svgEl("defs", {});
      const clipPath = svgEl("clipPath", { id: clipId });
      clipPath.appendChild(svgEl("rect", { x: margin.left, y: margin.top, width: innerW, height: innerH }));
      defs.appendChild(clipPath);
      chart.appendChild(defs);
      const plot = svgEl("g", { "clip-path": `url(#${clipId})` });
      chart.appendChild(plot);

      if (isBandMetric()) {
        drawTotalMassBands(rows, x, y, plot);
      } else {
        drawMetricLines(rows, x, y, plot);
      }
      updateZoomButton();
    }

export function handleChartWheel(event) {
      if (!chartViewport) return;
      const point = svgPointFromEvent(event);
      const axisMode = resolveWheelZoomAxisMode(point, event);
      if (!axisMode) return;
      event.preventDefault();
      const focal = clampPointToPlot(point);
      const zoomFactor = Math.exp(Math.sign(event.deltaY) * 0.22);
      const xValue = invertScale(focal.x, chartViewport.xDomain, [chartViewport.margin.left, chartViewport.margin.left + chartViewport.innerW], state.logX);
      const yValue = invertScale(focal.y, chartViewport.yDomain, [chartViewport.margin.top + chartViewport.innerH, chartViewport.margin.top], state.logY);
      const nextXDomain = axisMode.includes("x")
        ? zoomDomainAround(chartViewport.xDomain, xValue, zoomFactor, state.logX)
        : chartViewport.xDomain.slice();
      const nextYDomain = axisMode.includes("y")
        ? zoomDomainAround(chartViewport.yDomain, yValue, zoomFactor, state.logY)
        : chartViewport.yDomain.slice();
      setZoomDomains(
        nextXDomain,
        nextYDomain,
      );
    }

export function handleChartPointerDown(event) {
      if (!chartViewport || event.button !== 0) return;
      const point = svgPointFromEvent(event);
      if (!pointInPlot(point)) return;
      state.pan = {
        pointerId: event.pointerId,
        startPoint: point,
        startClientX: event.clientX,
        startClientY: event.clientY,
        hasMoved: false,
        xDomain: chartViewport.xDomain.slice(),
        yDomain: chartViewport.yDomain.slice(),
      };
      chart.classList.add("is-panning");
      try {
        chart.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic pointer events used by tests do not always have an active pointer capture target.
      }
      event.preventDefault();
    }

export function handleChartPointerMove(event) {
      if (!state.pan) {
        updateHoverFromPointer(event);
        return;
      }
      if (!chartViewport || event.pointerId !== state.pan.pointerId) return;
      const movementPx = Math.hypot(event.clientX - state.pan.startClientX, event.clientY - state.pan.startClientY);
      if (movementPx > CHART_CLICK_TOLERANCE_PX) {
        state.pan.hasMoved = true;
      }
      if (!state.pan.hasMoved) return;
      const point = svgPointFromEvent(event);
      const dx = point.x - state.pan.startPoint.x;
      const dy = point.y - state.pan.startPoint.y;
      setZoomDomains(
        panDomainByPixels(state.pan.xDomain, dx, [chartViewport.margin.left, chartViewport.margin.left + chartViewport.innerW], state.logX),
        panDomainByPixels(state.pan.yDomain, dy, [chartViewport.margin.top + chartViewport.innerH, chartViewport.margin.top], state.logY),
      );
      event.preventDefault();
    }

export function handleChartPointerLeave() {
      if (state.tooltipPinned) return;
      state.hoverHitSignature = "";
      state.dismissedTooltipKeys.clear();
      const pinned = pinnedTooltipRefs();
      if (!pinned.length) {
        clearTooltip({ keepPinned: true });
        return;
      }
      setHoverPoints(pinned);
      if (!sameTooltipRefs(pinned, state.lastTooltipItems)) {
        state.lastTooltipItems = pinned;
        refreshTooltip(currentChartRows);
      }
    }

export function endChartPan(event) {
      if (!state.pan || event.pointerId !== state.pan.pointerId) return;
      const movementPx = Math.hypot(event.clientX - state.pan.startClientX, event.clientY - state.pan.startClientY);
      const shouldPinClick = !state.pan.hasMoved && movementPx <= CHART_CLICK_TOLERANCE_PX;
      const clickPoint = shouldPinClick ? svgPointFromEvent(event) : null;
      if (chart.hasPointerCapture(event.pointerId)) chart.releasePointerCapture(event.pointerId);
      state.pan = null;
      chart.classList.remove("is-panning");
      if (shouldPinClick) {
        handleChartClick(clickPoint);
        event.preventDefault();
      }
    }

export function setZoomDomains(xDomain, yDomain) {
      if (!chartViewport) return;
      const nextX = constrainDomain(xDomain, chartViewport.baseXDomain, state.logX);
      const nextY = constrainDomain(yDomain, chartViewport.baseYDomain, state.logY);
      state.zoom = sameDomain(nextX, chartViewport.baseXDomain, state.logX) && sameDomain(nextY, chartViewport.baseYDomain, state.logY)
        ? null
        : { xDomain: nextX, yDomain: nextY };
      const rows = filteredRows();
      renderChart(rows);
      refreshTooltip(rows);
    }

export function svgPointFromEvent(event) {
      const transform = svgViewportTransform();
      return {
        x: (event.clientX - transform.rect.left - transform.offsetX) / transform.scale,
        y: (event.clientY - transform.rect.top - transform.offsetY) / transform.scale,
      };
    }

export function svgViewportTransform() {
      const rect = chart.getBoundingClientRect();
      const viewWidth = Math.max(chartViewport.width, 1);
      const viewHeight = Math.max(chartViewport.height, 1);
      const scale = Math.min(Math.max(rect.width, 1) / viewWidth, Math.max(rect.height, 1) / viewHeight);
      const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
      const drawnWidth = viewWidth * safeScale;
      const drawnHeight = viewHeight * safeScale;
      return {
        rect,
        scale: safeScale,
        offsetX: (rect.width - drawnWidth) / 2,
        offsetY: (rect.height - drawnHeight) / 2,
      };
    }

export function pointInPlot(point) {
      const { margin, innerW, innerH } = chartViewport;
      return point.x >= margin.left
        && point.x <= margin.left + innerW
        && point.y >= margin.top
        && point.y <= margin.top + innerH;
    }

export function pointInXAxisZone(point) {
      const { margin, innerW, innerH, height } = chartViewport;
      return point.x >= margin.left
        && point.x <= margin.left + innerW
        && point.y >= margin.top + innerH - 12
        && point.y <= Math.min(height, margin.top + innerH + Math.max(24, margin.bottom));
    }

export function pointInYAxisZone(point) {
      const { margin, innerH } = chartViewport;
      return point.x >= Math.max(0, margin.left - Math.max(24, margin.left))
        && point.x <= margin.left + 12
        && point.y >= margin.top
        && point.y <= margin.top + innerH;
    }

export function resolveWheelZoomAxisMode(point, event) {
      if (pointInPlot(point)) {
        if (event.shiftKey && !event.altKey) return "y";
        if (event.altKey && !event.shiftKey) return "x";
        return "xy";
      }
      if (pointInXAxisZone(point)) return "x";
      if (pointInYAxisZone(point)) return "y";
      return "";
    }

export function clampPointToPlot(point) {
      const { margin, innerW, innerH } = chartViewport;
      return {
        x: clamp(point.x, margin.left, margin.left + innerW),
        y: clamp(point.y, margin.top, margin.top + innerH),
      };
    }

export function updateHoverFromPointer(event) {
      if (state.tooltipPinned) return;
      if (!chartViewport || !chartHitTargets.length) return;
      const point = svgPointFromEvent(event);
      if (!pointInPlot(point)) {
        state.hoverHitSignature = "";
        state.dismissedTooltipKeys.clear();
        const pinned = pinnedTooltipRefs();
        if (!pinned.length) {
          clearTooltip({ keepPinned: true });
          return;
        }
        setHoverPoints(pinned);
        if (!sameTooltipRefs(pinned, state.lastTooltipItems)) {
          state.lastTooltipItems = pinned;
          refreshTooltip(currentChartRows);
        }
        return;
      }
      const hits = hitTargetsAt(point);
      if (!hits.length) {
        const ladderHits = ladderHitTargetsAt(point);
        if (ladderHits.length) {
          const signature = ladderHits.map(hit => `ladder:${hit.key}`).join("|");
          if (signature !== state.hoverHitSignature) {
            state.hoverHitSignature = signature;
            state.dismissedTooltipKeys.clear();
          }
          const nextRefs = mergePinnedTooltipRefs(resolveLadderHoverRefs(ladderHits));
          setHoverPoints(nextRefs);
          if (nextRefs.length && !sameTooltipRefs(nextRefs, state.lastTooltipItems)) {
            state.lastTooltipItems = nextRefs;
            refreshTooltip(currentChartRows);
          }
          return;
        }
        state.hoverHitSignature = "";
        state.dismissedTooltipKeys.clear();
        const pinned = pinnedTooltipRefs();
        if (!pinned.length) {
          clearTooltip({ keepPinned: true });
          return;
        }
        setHoverPoints(pinned);
        if (!sameTooltipRefs(pinned, state.lastTooltipItems)) {
          state.lastTooltipItems = pinned;
          refreshTooltip(currentChartRows);
        }
        return;
      }
      const signature = hits.map(hit => hit.key).join("|");
      if (signature !== state.hoverHitSignature) {
        state.hoverHitSignature = signature;
        state.dismissedTooltipKeys.clear();
      }
      const visibleHits = hits.filter(hit => !state.dismissedTooltipKeys.has(hit.key));
      const nextRefs = mergePinnedTooltipRefs(visibleHits);
      setHoverPoints(nextRefs);
      if (nextRefs.length && !sameTooltipRefs(nextRefs, state.lastTooltipItems)) {
        state.lastTooltipItems = nextRefs;
        refreshTooltip(currentChartRows);
      }
    }

export function handleChartClick(point) {
      if (!chartViewport || !pointInPlot(point)) {
        clearTooltip({ keepPinned: true });
        return;
      }
      const hits = hitTargetsAt(point);
      const visibleHits = state.tooltipPinned
        ? hits
        : hits.filter(hit => !state.dismissedTooltipKeys.has(hit.key));
      if (!visibleHits.length) {
        clearTooltip({ keepPinned: true });
        return;
      }
      pinTooltipItems(visibleHits);
    }

export function handleChartKeyDown(event) {
      if (isEditableTarget(event.target)) return;
      if (event.key === "Escape" && (state.tooltipPinned || state.lastTooltipItems.length)) {
        clearTooltip({ keepPinned: true });
        event.preventDefault();
        return;
      }
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if ((key === "p" || event.code === "Space") && state.lastTooltipItems.length) {
        if (state.tooltipPinned) {
          unpinTooltip();
        } else {
          pinTooltipItems(state.hoverPoints.length ? state.hoverPoints : state.lastTooltipItems);
        }
        event.preventDefault();
      }
    }

export function isEditableTarget(target) {
      if (!target) return false;
      const tagName = target.tagName ? target.tagName.toLowerCase() : "";
      return target.isContentEditable || ["input", "select", "textarea", "button"].includes(tagName);
    }

export function hitTargetsAt(point) {
      const transform = svgViewportTransform();
      return chartHitTargets
        .map(target => ({
          ...target,
          distance: Math.hypot(target.x - point.x, target.y - point.y) * transform.scale,
        }))
        .filter(target => target.distance <= CHART_HIT_RADIUS_PX)
        .sort((a, b) => a.distance - b.distance || a.order - b.order);
    }

export function ladderHitTargetsAt(point) {
      if (!powerResearchActive() || !chartLadderHitTargets.length) return [];
      const transform = svgViewportTransform();
      return chartLadderHitTargets
        .map(target => ({
          ...target,
          distance: distanceToSegment(point, target) * transform.scale,
        }))
        .filter(target => target.distance <= CHART_LADDER_HIT_RADIUS_PX)
        .sort((a, b) => a.distance - b.distance || a.order - b.order);
    }

export function resolveLadderHoverRefs(ladderHits) {
      const recentRefs = dedupeTooltipRefs([...state.hoverPoints, ...state.lastTooltipItems]);
      return dedupeTooltipRefs(ladderHits.map(hit => {
        const recentSameDrive = recentRefs.find(item => item.rowId === hit.rowId);
        return recentSameDrive || hit;
      }));
    }

export function distanceToSegment(point, segment) {
      const dx = segment.x2 - segment.x1;
      const dy = segment.y2 - segment.y1;
      const lengthSq = dx * dx + dy * dy;
      if (!lengthSq) return Math.hypot(point.x - segment.x1, point.y - segment.y1);
      const t = clamp(((point.x - segment.x1) * dx + (point.y - segment.y1) * dy) / lengthSq, 0, 1);
      const projectedX = segment.x1 + t * dx;
      const projectedY = segment.y1 + t * dy;
      return Math.hypot(point.x - projectedX, point.y - projectedY);
    }

export function invertScale(pixel, domain, range, logScale) {
      const ratio = (pixel - range[0]) / (range[1] - range[0]);
      const [d0, d1] = normalizeAxisDomain(domain[0], domain[1], logScale);
      if (logScale) {
        const s0 = axisSpaceValue(d0, true);
        const s1 = axisSpaceValue(d1, true);
        return valueFromAxisSpace(s0 + ratio * (s1 - s0), true);
      }
      return d0 + ratio * (d1 - d0);
    }

export function zoomDomainAround(domain, focalValue, factor, logScale) {
      if (!Number.isFinite(focalValue) || factor <= 0) return domain;
      if (logScale) {
        const d0 = Math.log10(Math.max(domain[0], 1e-9));
        const d1 = Math.log10(Math.max(domain[1], 1e-9));
        const focal = Math.log10(Math.max(focalValue, 1e-9));
        return [
          Math.pow(10, focal - (focal - d0) * factor),
          Math.pow(10, focal + (d1 - focal) * factor),
        ];
      }
      return [
        focalValue - (focalValue - domain[0]) * factor,
        focalValue + (domain[1] - focalValue) * factor,
      ];
    }

export function panDomainByPixels(domain, pixelDelta, range, logScale) {
      const first = invertScale(range[0] - pixelDelta, domain, range, logScale);
      const second = invertScale(range[1] - pixelDelta, domain, range, logScale);
      return [Math.min(first, second), Math.max(first, second)];
    }

export function constrainDomain(domain, baseDomain, logScale) {
      if (!domain || !baseDomain) return baseDomain;
      const toSpace = value => logScale ? Math.log10(Math.max(value, 1e-9)) : value;
      const fromSpace = value => logScale ? Math.pow(10, value) : value;
      let start = Math.min(toSpace(domain[0]), toSpace(domain[1]));
      let end = Math.max(toSpace(domain[0]), toSpace(domain[1]));
      const baseStart = Math.min(toSpace(baseDomain[0]), toSpace(baseDomain[1]));
      const baseEnd = Math.max(toSpace(baseDomain[0]), toSpace(baseDomain[1]));
      const baseSpan = Math.max(baseEnd - baseStart, 1e-9);
      let span = Math.max(end - start, baseSpan / 1_000_000, 1e-12);
      if (span >= baseSpan) return baseDomain.slice();
      const midpoint = (start + end) / 2;
      start = midpoint - span / 2;
      end = midpoint + span / 2;
      if (start < baseStart) {
        end += baseStart - start;
        start = baseStart;
      }
      if (end > baseEnd) {
        start -= end - baseEnd;
        end = baseEnd;
      }
      return [fromSpace(start), fromSpace(end)];
    }

export function sameDomain(a, b, logScale) {
      if (!a || !b) return false;
      const toSpace = value => logScale ? Math.log10(Math.max(value, 1e-9)) : value;
      const b0 = toSpace(b[0]);
      const b1 = toSpace(b[1]);
      const tolerance = Math.max(Math.abs(b1 - b0), 1) * 1e-8;
      return Math.abs(toSpace(a[0]) - b0) <= tolerance && Math.abs(toSpace(a[1]) - b1) <= tolerance;
    }

export function axisDebugTickSummary(domain, pixelSpan, logScale, options) {
      const ticks = buildAxisTickPlan(domain[0], domain[1], pixelSpan, logScale, options);
      const labeled = ticks.filter(item => item.label);
      return {
        domain: domain.slice(),
        logScale,
        tickCount: ticks.length,
        labeledTickCount: labeled.length,
        firstTick: ticks.length ? ticks[0].value : null,
        lastTick: ticks.length ? ticks[ticks.length - 1].value : null,
        firstLabel: labeled.length ? labeled[0].value : null,
        lastLabel: labeled.length ? labeled[labeled.length - 1].value : null,
        ticks,
      };
    }

export function axisSnapshot() {
      if (!chartViewport) return null;
      const x = axisDebugTickSummary(chartViewport.xDomain, chartViewport.innerW, state.logX, {
        gridPixelGap: state.logX ? 72 : 78,
        labelPixelGap: 112,
        maxTicks: state.logX ? 96 : 48,
        minTicks: 4,
      });
      const y = axisDebugTickSummary(chartViewport.yDomain, chartViewport.innerH, state.logY, {
        gridPixelGap: state.logY ? 58 : 54,
        labelPixelGap: 46,
        maxTicks: state.logY ? 96 : 48,
        minTicks: 4,
      });
      return {
        metric: state.metric,
        logX: state.logX,
        logY: state.logY,
        zoomed: !!state.zoom,
        x,
        y,
      };
    }
