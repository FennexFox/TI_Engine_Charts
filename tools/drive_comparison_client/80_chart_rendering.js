    function drawGridAndAxes(ctx) {
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
        ? localText("누적 연구력 (전원 사다리 포함)", "Cumulative research (power ladder included)")
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

    function groupedRows(rows) {
      const groups = new Map();
      rows.forEach(row => {
        if (!groups.has(row.familyKey)) groups.set(row.familyKey, []);
        groups.get(row.familyKey).push(row);
      });
      groups.forEach(group => group.sort((a, b) => rowUnlockResearchValue(a) - rowUnlockResearchValue(b) || a.baseDisplayName.localeCompare(b.baseDisplayName)));
      return groups;
    }

    function pointAttrs(row, powerOptionId, fill, stroke = "none", strokeWidth = 0, extraClass = "") {
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
      };
    }

    function pointKey(rowId, powerOptionId = null) {
      return `${rowId}::${powerOptionId || ""}`;
    }

    function tooltipRef(rowOrId, powerOptionId = null) {
      const rowId = typeof rowOrId === "object" ? (rowOrId.rowId || rowOrId.id) : rowOrId;
      const optionId = typeof rowOrId === "object" && rowOrId.powerOptionId !== undefined && powerOptionId === null
        ? rowOrId.powerOptionId
        : powerOptionId;
      const normalizedOptionId = optionId || "";
      return { rowId, powerOptionId: normalizedOptionId, key: pointKey(rowId, normalizedOptionId) };
    }

    function dedupeTooltipRefs(items) {
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

    function resolveTooltipRow(ref, rowById, rows) {
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

    function isPinnedTooltipKey(key) {
      return state.pinnedTooltipItems.some(item => item.key === key);
    }

    function pinnedTooltipRefs() {
      const lastPinned = dedupeTooltipRefs(state.lastTooltipItems).filter(item => isPinnedTooltipKey(item.key));
      const included = new Set(lastPinned.map(item => item.key));
      const missingPinned = dedupeTooltipRefs(state.pinnedTooltipItems).filter(item => !included.has(item.key));
      return [...lastPinned, ...missingPinned];
    }

    function mergePinnedTooltipRefs(items) {
      const pinned = pinnedTooltipRefs();
      const pinnedKeys = new Set(pinned.map(item => item.key));
      const transient = dedupeTooltipRefs(items).filter(item => !pinnedKeys.has(item.key));
      return [...pinned, ...transient];
    }

    function syncPinnedTooltipOrder() {
      const pinnedKeys = new Set(state.pinnedTooltipItems.map(item => item.key));
      state.pinnedTooltipItems = dedupeTooltipRefs(state.lastTooltipItems).filter(item => pinnedKeys.has(item.key));
    }

    function sameTooltipRefs(left, right) {
      const a = dedupeTooltipRefs(left);
      const b = dedupeTooltipRefs(right);
      return a.length === b.length && a.every((item, index) => item.key === b[index].key);
    }

    function powerResearchFocusedDriveIds() {
      const refs = [
        ...dedupeTooltipRefs(state.hoverPoints),
        ...dedupeTooltipRefs(state.pinnedTooltipItems),
        ...(state.tooltipPinned ? dedupeTooltipRefs(state.lastTooltipItems) : []),
      ];
      return new Set(refs.map(item => item.rowId).filter(Boolean));
    }

    function powerResearchFocusSignature() {
      return Array.from(powerResearchFocusedDriveIds()).sort().join("|");
    }

    function redrawPowerResearchFocusIfChanged(previousSignature) {
      if (!powerResearchActive() || !currentChartRows.length) return false;
      if (previousSignature === powerResearchFocusSignature()) return false;
      redrawChartOnly();
      return true;
    }

    function isHoveredPoint(row, powerOptionId = null) {
      const key = pointKey(row.id, powerOptionId);
      return state.hoverPoints.some(item => item.key === key);
    }

    function setHoverPoints(items) {
      const previousSignature = powerResearchFocusSignature();
      state.hoverPoints = dedupeTooltipRefs(items);
      if (!redrawPowerResearchFocusIfChanged(previousSignature)) {
        updateHoverStyles();
      }
    }

    function registerHitTarget(row, powerOptionId, xCoord, yCoord, radius = 5) {
      if (!Number.isFinite(xCoord) || !Number.isFinite(yCoord) || !pointVisibleInPlot(xCoord, yCoord)) return;
      chartHitTargets.push({
        ...tooltipRef(row, powerOptionId),
        x: xCoord,
        y: yCoord,
        radius,
        order: chartHitTargets.length,
      });
    }

    function registerLadderHitTargets(row, optionPoints) {
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

    function segmentMayIntersectPlot(start, end) {
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

    function pointVisibleInPlot(xCoord, yCoord) {
      if (!chartViewport) return false;
      const { margin, innerW, innerH } = chartViewport;
      return xCoord >= margin.left
        && xCoord <= margin.left + innerW
        && yCoord >= margin.top
        && yCoord <= margin.top + innerH;
    }

    function updateHoverStyles() {
      const hoveredKeys = new Set(state.hoverPoints.map(item => item.key));
      chart.querySelectorAll(".data-point").forEach(point => {
        const hovered = hoveredKeys.has(pointKey(point.getAttribute("data-row-id"), point.getAttribute("data-power-option-id")));
        point.setAttribute("stroke", hovered ? "#fff" : (point.getAttribute("data-default-stroke") || "none"));
        point.setAttribute("stroke-width", hovered ? "2.2" : (point.getAttribute("data-default-stroke-width") || "0"));
      });
    }

    function drawMetricLines(rows, x, y, plot) {
      const groups = groupedRows(rows);
      groups.forEach(group => {
        const color = group[0].familyColor;
        const path = linePath(group.map(row => [x(rowUnlockResearchValue(row)), y(metricDefs[state.metric].value(row))]));
        plot.appendChild(svgEl("path", { d: path, fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0.82 }));
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

    function chartResearchValues(rows) {
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

    function optionAdditionalResearchValue(row, option = null) {
      if (!option) return rowUnlockResearchValue(row);
      const combined = Number(option.combinedCumulativeResearch);
      if (Number.isFinite(combined) && combined > 0) return combined;
      const plantResearch = Number(option.cumulativeResearch);
      return Math.max(rowUnlockResearchValue(row), Number.isFinite(plantResearch) ? plantResearch : 0);
    }

    function optionPowerResearchDelta(row, option = null) {
      if (!option || option.selfContained) return 0;
      const base = Number(row.cumulativeResearch) || 0;
      const combined = Number(option.combinedCumulativeResearch);
      if (Number.isFinite(combined)) return Math.max(0, combined - base);
      const plantResearch = Number(option.cumulativeResearch);
      return Math.max(0, (Number.isFinite(plantResearch) ? plantResearch : base) - base);
    }

    function optionResearchValue(row, option = null) {
      if (powerResearchActive() && option) {
        return optionAdditionalResearchValue(row, option);
      }
      return rowUnlockResearchValue(row);
    }

    function optionX(row, option, x) {
      return x(optionResearchValue(row, option));
    }

    function drawTotalMassBands(rows, x, y, plot) {
      const pointData = bandPointData(rows);
      const secondaryDomain = secondaryEncodingDomain(pointData);
      const paretoKeys = state.paretoHighlight ? paretoPointKeys(pointData) : new Set();
      const focusedDriveIds = powerResearchFocusedDriveIds();
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
        if (basePoints.length >= 2) {
          plot.appendChild(svgEl("path", {
            class: "base-drive-line",
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

    function drawPowerLadder(row, x, y, plot, color, fillStyle, strokeStyle, secondaryDomain, paretoKeys, focusedDriveIds, options = {}) {
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
        const key = pointKey(row.id, option.id);
        const visual = bandPointVisual(option, secondaryDomain, paretoKeys.has(key));
        const impractical = isImpracticalOption(option);
        const baseOpacity = impractical ? Math.max(visual.opacity * 0.78, 0.38) : visual.opacity;
        const subduedOpacity = !isBase && state.powerResearchView === "all" && !focused ? 0.38 : 1;
        registerHitTarget(row, option.id, xCoord, yCoord, isBase ? 5.5 : 4.4);
        const circle = svgEl("circle", {
          ...pointAttrs(
            row,
            option.id,
            isBase ? color : "var(--panel)",
            impractical ? "var(--danger)" : color,
            impractical ? 2 : (isBase ? 1 : 1.65),
            isBase ? "power-base-point" : `power-extra-point${focused ? " is-focused" : " is-subdued"}`,
          ),
          cx: xCoord,
          cy: yCoord,
          r: isBase ? 5.5 : 3.7,
          style: `${isBase ? fillStyle : ""}${visual.style}`,
          opacity: clamp(baseOpacity * subduedOpacity, 0.12, 1),
          "data-power-point-kind": isBase ? "base" : "extra",
          "data-impractical": impractical ? "true" : "false",
        });
        plot.appendChild(circle);
      });
    }

    function shouldShowExtraPowerOptions(row, focused) {
      if (!powerResearchActive()) return false;
      if (state.powerResearchView === "all") return true;
      return focused;
    }

    function bandPointData(rows) {
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

    function secondaryEncodingEnabled() {
      return ((state.metric === "totalMassTons" || state.metric === "fuelMassTons") && state.showTwrInfo)
        || (state.metric === "twr" && state.showMassInfo);
    }

    function secondaryEncodingDomain(points) {
      if (!secondaryEncodingEnabled()) return null;
      const scores = points.map(item => secondaryScore(item.option)).filter(Number.isFinite);
      if (!scores.length) return null;
      return { min: Math.min(...scores), max: Math.max(...scores) };
    }

    function secondaryScore(option) {
      if (state.metric === "totalMassTons" || state.metric === "fuelMassTons") {
        return Math.log10(Math.max(option.twr, 1e-12));
      }
      if (state.metric === "twr") {
        return -Math.log10(Math.max(option.totalMassTons, 1e-9));
      }
      return NaN;
    }

    function bandPointVisual(option, secondaryDomain, pareto) {
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

    function paretoPointKeys(points) {
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

    function isBandMetric(metric = state.metric) {
      return metric === "totalMassTons" || metric === "fuelMassTons" || metric === "twr";
    }

    function optionMetricValue(option, metric = state.metric) {
      if (metric === "twr") return option.twr;
      if (metric === "fuelMassTons") return option.propellantTons;
      return option.totalMassTons;
    }

    function defaultTooltipOption(row) {
      const options = chartMassOptions(row, state.metric);
      return options[0] || massOptions(row)[0] || null;
    }

    function linePath(points) {
      return points.map((point, index) => `${index === 0 ? "M" : "L"}${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(" ");
    }

    function svgEl(name, attrs) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", name);
      Object.entries(attrs || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) el.setAttribute(key, String(value));
      });
      return el;
    }

