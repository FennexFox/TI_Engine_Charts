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
      xTitle.textContent = `${state.usePowerResearch && isBandMetric()
        ? localText("누적 연구력 (최초+추가 전원 포함)", "Cumulative research (first + additional power included)")
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

    function pointAttrs(row, powerOptionId, fill, stroke = "none", strokeWidth = 0) {
      const hovered = isHoveredPoint(row, powerOptionId);
      return {
        class: "data-point",
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

    function isHoveredPoint(row, powerOptionId = null) {
      const key = pointKey(row.id, powerOptionId);
      return state.hoverPoints.some(item => item.key === key);
    }

    function setHoverPoints(items) {
      state.hoverPoints = dedupeTooltipRefs(items);
      updateHoverStyles();
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
          if (!state.usePowerResearch) return [base];
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
      if (isBandMetric() && state.usePowerResearch && option) {
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
      const groups = groupedRows(rows);
      groups.forEach(group => {
        const color = group[0].familyBandColor || group[0].familyColor;
        const colorOklch = group[0].familyBandColorOklch || color;
        const fillStyle = paintStyle("fill", color, colorOklch);
        const strokeStyle = paintStyle("stroke", color, colorOklch);
        const maxOptions = Math.max(...group.map(row => chartMassOptions(row).length), 0);
        if (state.usePowerResearch) {
          drawPowerResearchBandSurfaces(group, x, y, plot, color, fillStyle, strokeStyle);
        } else {
          for (let index = maxOptions - 2; index >= 0; index--) {
            const pairs = group
              .map(row => ({ row, options: chartMassOptions(row) }))
              .filter(item => item.options[index] && item.options[index + 1]);
            if (pairs.length < 2) continue;
            const upper = pairs.map(item => [optionX(item.row, item.options[index], x), y(optionMetricValue(item.options[index]))]);
            const lower = pairs.slice().reverse().map(item => [optionX(item.row, item.options[index + 1], x), y(optionMetricValue(item.options[index + 1]))]);
            const polygon = [...upper, ...lower];
            plot.appendChild(svgEl("path", {
              d: linePath(polygon) + "Z",
              fill: color,
              style: fillStyle,
              opacity: Math.max(0.06, 0.22 - index * 0.025),
              stroke: "none",
            }));
          }
          for (let index = 0; index < maxOptions; index++) {
            const points = group
              .map(row => ({ row, option: chartMassOptions(row)[index] }))
              .filter(item => item.option);
            if (points.length >= 2) {
              plot.appendChild(svgEl("path", {
                d: linePath(points.map(item => [optionX(item.row, item.option, x), y(optionMetricValue(item.option))])),
                fill: "none",
                stroke: color,
                style: strokeStyle,
                "stroke-width": index === 0 ? 2.1 : 1.2,
                "stroke-dasharray": index === 0 ? "" : "5 5",
                opacity: index === 0 ? 0.9 : 0.45,
              }));
            }
          }
        }
        group.forEach(row => {
          const options = chartMassOptions(row);
          if (!options.length) return;
          const optionPoints = options.map(option => ({
            option,
            xCoord: optionX(row, option, x),
            yCoord: y(optionMetricValue(option)),
          })).sort((a, b) => a.xCoord - b.xCoord || a.yCoord - b.yCoord);
          if (optionPoints.length > 1) {
            if (state.usePowerResearch) {
              plot.appendChild(svgEl("path", {
                d: linePath(optionPoints.map(point => [point.xCoord, point.yCoord])),
                fill: "none",
                stroke: color,
                style: strokeStyle,
                "stroke-width": 1.1,
                opacity: 0.28,
              }));
            } else {
              const gx = optionPoints[0].xCoord;
              const ys = optionPoints.map(point => point.yCoord);
              plot.appendChild(svgEl("line", { x1: gx, x2: gx, y1: Math.min(...ys), y2: Math.max(...ys), stroke: color, style: strokeStyle, "stroke-width": 1.2, opacity: 0.32 }));
            }
          }
          options.forEach((option, index) => {
            const gx = optionX(row, option, x);
            const cy = y(optionMetricValue(option));
            const key = pointKey(row.id, option.id);
            const visual = bandPointVisual(option, secondaryDomain, paretoKeys.has(key));
            const impractical = isImpracticalOption(option);
            registerHitTarget(row, option.id, gx, cy, index === 0 ? 5 : 3.4);
            const circle = svgEl("circle", {
              ...pointAttrs(row, option.id, index === 0 ? color : "var(--panel)", impractical ? "var(--danger)" : color, impractical ? 2 : 1.5),
              cx: gx,
              cy,
              r: index === 0 ? 5 : 3.4,
              style: `${index === 0 ? fillStyle : ""}${visual.style}`,
              opacity: impractical ? Math.max(visual.opacity * 0.78, 0.38) : visual.opacity,
              "data-impractical": impractical ? "true" : "false",
            });
            plot.appendChild(circle);
          });
        });
      });
    }

    function drawPowerResearchBandSurfaces(group, x, y, plot, color, fillStyle, strokeStyle) {
      const stepGroups = new Map();
      const pairGroups = new Map();
      const familyKey = group[0] ? group[0].familyKey : "";
      group.forEach(row => {
        const options = chartMassOptions(row);
        options.forEach((option, index) => {
          const step = powerStepIndex(option, index);
          if (!stepGroups.has(step)) stepGroups.set(step, []);
          stepGroups.get(step).push({ row, option, index: step });
          const next = options[index + 1];
          if (next) {
            const nextStep = powerStepIndex(next, index + 1);
            const pairKey = `${step}::${nextStep}`;
            if (!pairGroups.has(pairKey)) pairGroups.set(pairKey, []);
            pairGroups.get(pairKey).push({ row, upper: option, lower: next, index: step, lowerIndex: nextStep });
          }
        });
      });

      pairGroups.forEach((pairs, pairKey) => {
        if (pairs.length < 2) return;
        const ordered = pairs.slice().sort((a, b) => pairSortValue(a) - pairSortValue(b)
          || rowUnlockResearchValue(a.row) - rowUnlockResearchValue(b.row)
          || a.row.baseDisplayName.localeCompare(b.row.baseDisplayName));
        const upper = ordered.map(item => [optionX(item.row, item.upper, x), y(optionMetricValue(item.upper))]);
        const lower = ordered.slice().reverse().map(item => [optionX(item.row, item.lower, x), y(optionMetricValue(item.lower))]);
        const avgIndex = ordered.reduce((sum, item) => sum + item.index, 0) / ordered.length;
        plot.appendChild(svgEl("path", {
          d: linePath([...upper, ...lower]) + "Z",
          fill: color,
          style: fillStyle,
          opacity: Math.max(0.05, 0.18 - avgIndex * 0.02),
          stroke: "none",
          "data-band-family": familyKey,
          "data-band-pair-step": pairKey,
        }));
      });

      stepGroups.forEach((points, step) => {
        if (points.length < 2) return;
        const ordered = points.slice().sort((a, b) => optionResearchValue(a.row, a.option) - optionResearchValue(b.row, b.option)
          || rowUnlockResearchValue(a.row) - rowUnlockResearchValue(b.row)
          || a.row.baseDisplayName.localeCompare(b.row.baseDisplayName));
        const avgIndex = ordered.reduce((sum, item) => sum + item.index, 0) / ordered.length;
        plot.appendChild(svgEl("path", {
          d: linePath(ordered.map(item => [optionX(item.row, item.option, x), y(optionMetricValue(item.option))])),
          fill: "none",
          stroke: color,
          style: strokeStyle,
          "stroke-width": avgIndex < 0.5 ? 2.1 : 1.2,
          "stroke-dasharray": avgIndex < 0.5 ? "" : "5 5",
          opacity: avgIndex < 0.5 ? 0.9 : 0.45,
          "data-band-family": familyKey,
          "data-band-step": step,
        }));
      });
    }

    function powerStepIndex(option, fallbackIndex = 0) {
      const value = Number(option && option.sequenceIndex);
      return Number.isFinite(value) ? value : fallbackIndex;
    }

    function pairSortValue(item) {
      return (optionResearchValue(item.row, item.upper) + optionResearchValue(item.row, item.lower)) / 2;
    }

    function bandPointData(rows) {
      return rows.flatMap(row => chartMassOptions(row).map(option => ({
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

