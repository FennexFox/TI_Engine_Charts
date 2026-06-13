import { chartSummaryMassOptions, computeDriveDiagnostics, filteredRows } from "../calc/filtering.js";
import { isBandMetric, optionMetricValue } from "../calc/metrics.js";
import { clamp } from "../shared/math.js";
import { localLabel, syncUiFromState } from "../presets/library.js";
import { CHART_CLICK_TOLERANCE_PX, CHART_HIT_RADIUS_PX, CHART_LADDER_HIT_RADIUS_PX, CONNECTION_LINE_MODES, DATA, DEFAULT_MIN_TWR, UI_LANG, chart, connectionLineModeLabel, localText, metricDefs, metricHint, metricLabel, normalizeConnectionLineMode, normalizePowerResearchView, powerResearchActive, powerResearchViewLabel, state, updateLeftPanelCardSummaries } from "../state/core.js";
import { updateChartControls } from "../ui/control_state.js";
import { backgroundStyle, clearTooltip, pinTooltipItems, refreshTooltip, renderTable, unpinTooltip, unpinTooltipItemByKey } from "../ui/tooltip_table.js";
import { axisSpaceValue, buildAxisTickPlan, makeScale, normalizeAxisDomain, valueFromAxisSpace } from "./axis.js";
import { chartHitTargets, chartLadderHitTargets, chartViewport, currentChartRows, setChartHitTargets, setChartLadderHitTargets, setChartViewport, setCurrentChartRows, setCurrentDiagnostics } from "./context.js";
import { baseChartResearchValues, chartResearchValues, dedupeTooltipRefs, drawGridAndAxes, drawMetricLines, drawPointStateOverlay, drawTotalMassBands, isPinnedTooltipKey, mergePinnedFocusTooltipRefs, mergePinnedTooltipRefs, pinnedFocusTooltipRefs, pinnedTooltipRefs, sameTooltipRefs, secondaryEncodingEnabled, setHoverPoints, svgEl } from "./rendering.js";

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
      updateFilterActionBanner(diagnostics);
      renderLegend(rows);
      renderConnectionLineControls();
      renderChartGuide();
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
        normalizeConnectionLineMode(state.connectionLineMode),
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

export function updateFilterActionBanner(diagnostics) {
      const banner = document.getElementById("filterActionBanner");
      if (!banner) return;
      const title = document.getElementById("filterActionBannerTitle");
      const detail = document.getElementById("filterActionBannerDetail");
      const actionsRoot = document.getElementById("filterActionBannerActions");
      const model = filterActionBannerModel(diagnostics);
      if (!model) {
        banner.hidden = true;
        if (title) title.textContent = "";
        if (detail) detail.textContent = "";
        if (actionsRoot) actionsRoot.innerHTML = "";
        return;
      }
      banner.hidden = false;
      if (title) title.textContent = model.title;
      if (detail) detail.textContent = model.detail;
      if (!actionsRoot) return;
      actionsRoot.innerHTML = "";
      model.actions.forEach(actionKey => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "compact-command";
        button.textContent = filterActionLabel(actionKey);
        button.addEventListener("click", () => {
          applyFilterAction(actionKey);
        });
        actionsRoot.appendChild(button);
      });
    }

export function filterActionBannerModel(diagnostics) {
      const searchSummary = diagnostics.searchSummary || {};
      if (searchSummary.active && searchSummary.totalMatches > 0 && searchSummary.visibleMatches === 0) {
        const reason = searchSummary.dominantReason || "other";
        return {
          title: localText("검색 결과가 있지만 현재 설정 때문에 숨겨져 있습니다.", "Matches found, but hidden by current settings."),
          detail: searchHiddenDetail(searchSummary, reason, { allHidden: true }),
          actions: hiddenReasonActions(reason, { includeClearSearch: true }),
        };
      }
      if (searchSummary.active && searchSummary.hiddenMatches > 0) {
        const reason = searchSummary.dominantReason || "other";
        return {
          title: localText("일부 검색 결과가 현재 설정 때문에 숨겨져 있습니다.", "Some matching drives are hidden by current settings."),
          detail: searchHiddenDetail(searchSummary, reason, { allHidden: false }),
          actions: hiddenReasonActions(reason, { includeClearSearch: true }),
        };
      }
      const hiddenSummary = diagnostics.hiddenSummary || {};
      if (!searchSummary.active && shouldShowGenericHiddenBanner(hiddenSummary)) {
        const reason = hiddenSummary.dominantReason || "other";
        const actions = hiddenReasonActions(reason);
        if (!actions.length) return null;
        return {
          title: localText("일부 드라이브가 현재 설정 때문에 숨겨져 있습니다.", "Some drives are hidden by current settings."),
          detail: localText(
            `${driveCountTextKo(hiddenSummary.totalHidden)}가 현재 설정 때문에 숨겨져 있습니다. 주요 원인: ${hiddenReasonLabel(reason)}.`,
            `${driveCountTextEn(hiddenSummary.totalHidden)} are hidden by current settings. Main reason: ${hiddenReasonLabel(reason)}.`,
          ),
          actions,
        };
      }
      return null;
    }

function searchHiddenDetail(searchSummary, reason, { allHidden }) {
      const term = searchSummary.term || "";
      const reasonLabel = hiddenReasonLabel(reason);
      const sampleText = searchSummary.sampleNames && searchSummary.sampleNames.length
        ? localText(` 예: ${searchSummary.sampleNames.join(", ")}.`, ` Matches include: ${searchSummary.sampleNames.join(", ")}.`)
        : "";
      if (allHidden) {
        return localText(
          `"${term}" 검색 결과 ${searchSummary.totalMatches}개가 있지만 현재 설정 때문에 모두 숨겨져 있습니다. 주요 원인: ${reasonLabel}.${sampleText}`,
          `${driveCountTextEn(searchSummary.totalMatches)} match "${term}" but all are hidden by current settings. Main reason: ${reasonLabel}.${sampleText}`,
        );
      }
      return localText(
        `"${term}" 검색 결과 중 ${searchSummary.hiddenMatches}개가 현재 설정 때문에 숨겨져 있습니다. 주요 원인: ${reasonLabel}.${sampleText}`,
        `${driveCountTextEn(searchSummary.hiddenMatches)} matching "${term}" are hidden by current settings. Main reason: ${reasonLabel}.${sampleText}`,
      );
    }

function driveCountTextEn(count) {
      return `${count} drive${count === 1 ? "" : "s"}`;
    }

function driveCountTextKo(count) {
      return `${count}개 드라이브`;
    }

function shouldShowGenericHiddenBanner(hiddenSummary) {
      if (!hiddenSummary || hiddenSummary.totalHidden <= 0) return false;
      const reason = hiddenSummary.dominantReason || "other";
      if (reason === "minTwr") return state.minTwr > defaultBannerMinTwr() * (1 + 1e-9);
      if (reason === "minDv") return state.minDvKps > 0;
      if (reason === "targetDvOrMassRatio") return numberDiffersFromDefault(state.targetDvKps, defaultBannerTargetDv());
      if (reason === "familyFilter") return driveFiltersDifferFromDefaults();
      if (reason === "thrusterCountFilter") return numberDiffersFromDefault(state.thrusters, defaultBannerThrusterCount());
      return false;
    }

function defaultBannerSettings() {
      return (DATA.presetLibrary
        && Array.isArray(DATA.presetLibrary.chartPresets)
        && DATA.presetLibrary.chartPresets[0]
        && DATA.presetLibrary.chartPresets[0].settings)
        || {};
    }

function defaultBannerNumber(key, fallback) {
      const value = Number(defaultBannerSettings()[key]);
      return Number.isFinite(value) ? value : fallback;
    }

function defaultBannerMinTwr() {
      return Math.max(DEFAULT_MIN_TWR, defaultBannerNumber("minTwr", DEFAULT_MIN_TWR));
    }

function defaultBannerTargetDv() {
      return defaultBannerNumber("targetDvKps", DATA.defaults.targetDvKps);
    }

function defaultBannerThrusterCount() {
      return defaultBannerNumber("thrusters", DATA.defaults.thrusterCount);
    }

function numberDiffersFromDefault(value, defaultValue) {
      const current = Number(value);
      const expected = Number(defaultValue);
      if (!Number.isFinite(current) || !Number.isFinite(expected)) return current !== expected;
      return Math.abs(current - expected) > Math.max(Math.abs(expected), 1) * 1e-9;
    }

function driveFiltersDifferFromDefaults() {
      return DATA.categories.some(category => !!state.categories[category.key] !== defaultBannerCategoryVisible(category))
        || DATA.subfamilies.some(family => !!state.families[family.key] !== defaultBannerFamilyVisible(family));
    }

function defaultBannerCategoryVisible(category) {
      const categories = defaultBannerSettings().categories;
      if (categories && typeof categories[category.key] === "boolean") return categories[category.key];
      return !!category.defaultVisible;
    }

function defaultBannerFamilyVisible(family) {
      const families = defaultBannerSettings().families;
      if (families && typeof families[family.key] === "boolean") return families[family.key];
      return true;
    }

function hiddenReasonActions(reason, { includeClearSearch = false } = {}) {
      const actions = [];
      const add = actionKey => {
        if (!actions.includes(actionKey)) actions.push(actionKey);
      };
      if (reason === "minTwr") {
        if (state.minTwr > DEFAULT_MIN_TWR) add("resetAcceleration");
        if (!state.showImpracticalCandidates) add("showImpractical");
      } else if (reason === "minDv") {
        if (state.minDvKps > 0) add("resetMinDv");
        if (!state.showImpracticalCandidates) add("showImpractical");
      } else if (reason === "targetDvOrMassRatio") {
        if (!state.showImpracticalCandidates) add("showImpractical");
      } else if (reason === "familyFilter") {
        if (driveFiltersDifferFromDefaults()) add("resetDriveFilters");
      } else if (reason === "thrusterCountFilter") {
        if (Number(state.thrusters) !== Number(DATA.defaults.thrusterCount)) add("resetThrusterCount");
      }
      if (includeClearSearch) add("clearSearch");
      return actions;
    }

function filterActionLabel(actionKey) {
      const labels = {
        resetAcceleration: localText("가속도 기준 초기화", "Reset acceleration threshold"),
        showImpractical: localText("비현실 후보 표시", "Show impractical candidates"),
        resetMinDv: localText("최소 dV 초기화", "Reset minimum dV"),
        resetDriveFilters: localText("드라이브 필터 초기화", "Reset drive filters"),
        resetThrusterCount: localText("엔진 수 초기화", "Reset engine count"),
        clearSearch: localText("검색 지우기", "Clear search"),
      };
      return labels[actionKey] || actionKey;
    }

function applyFilterAction(actionKey) {
      if (actionKey === "resetAcceleration") {
        state.minTwr = DEFAULT_MIN_TWR;
      } else if (actionKey === "showImpractical") {
        state.showImpracticalCandidates = true;
      } else if (actionKey === "resetMinDv") {
        state.minDvKps = 0;
      } else if (actionKey === "resetDriveFilters") {
        DATA.categories.forEach(category => {
          state.categories[category.key] = defaultBannerCategoryVisible(category);
        });
        DATA.subfamilies.forEach(family => {
          state.families[family.key] = defaultBannerFamilyVisible(family);
        });
      } else if (actionKey === "resetThrusterCount") {
        state.thrusters = DATA.defaults.thrusterCount;
      } else if (actionKey === "clearSearch") {
        state.searchTerm = "";
      }
      syncUiFromState();
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
        return localText("현재 dV / 최소 가속도 설정", "current dV / minimum acceleration settings");
      }
      return hiddenReasonLabel(reasonKey);
    }

export function hiddenReasonLabel(reason) {
      const labels = {
        minTwr: localText("최소 가속도 기준", "minimum acceleration threshold"),
        minDv: localText("최소 dV 기준", "minimum dV threshold"),
        targetDvOrMassRatio: localText("목표 dV / 질량비 시나리오", "target dV / mass-ratio scenario"),
        familyFilter: localText("드라이브 계열 필터", "drive family filters"),
        thrusterCountFilter: localText("엔진 수 필터", "engine count filter"),
        researchFilter: localText("연구 개방 조건", "research unlock constraints"),
        axisRange: localText("차트 축 범위", "chart axis range"),
        invalidPowerPlant: localText("호환 전원 조건", "compatible power plant constraints"),
        invalidComputation: localText("계산 불가 결과", "invalid calculation result"),
        searchFilter: localText("검색어", "search term"),
        other: localText("현재 설정", "current settings"),
      };
      return labels[reason] || labels.other;
    }

export function renderLegend(_rows) {
      const legend = document.getElementById("legend");
      if (!legend) return;
      legend.innerHTML = "";
      legend.hidden = true;
    }

function connectionLineModeDescription(mode) {
      const descriptions = {
        off: {
          ko: "연결선을 숨깁니다.",
          en: "Hide connection lines.",
        },
        strict: {
          ko: "드라이브 연구 선후관계가 확인되는 연결선만 표시합니다.",
          en: "Show only prerequisite-backed drive research links.",
        },
        lineage: {
          ko: "드라이브 연구 연결선에 더해 반응로/전원 계통 진행선을 표시합니다.",
          en: "Show drive research links plus reactor/power-lineage progression.",
        },
        all: {
          ko: "넓은 계열 보조선까지 포함해 가능한 진행선을 모두 표시합니다.",
          en: "Show all available progression lines, including broader family fallback lines.",
        },
      };
      const description = descriptions[normalizeConnectionLineMode(mode)] || descriptions.lineage;
      return localText(description.ko, description.en);
    }

function connectionLineModeHelpText(mode) {
      const value = normalizeConnectionLineMode(mode);
      if (value === "off") {
        return localText("연결선을 숨깁니다.", "Hide connection lines.");
      }
      if (value === "strict") {
        return localText(
          "드라이브 연구 선후관계가 확인되는 연결선만 표시합니다.",
          "Show only prerequisite-backed drive research links.",
        );
      }
      if (value === "all") {
        return localText(
          "전기/펄스 추진기 계열 보조선까지 포함해 가능한 진행선을 모두 표시합니다.",
          "Show all available progression lines, including electric and pulse-drive family aids.",
        );
      }
      return localText(
        "드라이브 연구 연결선에 더해 반응로/전원 계통 진행선을 표시합니다.",
        "Show drive research links plus reactor/power-lineage progression.",
      );
    }

export function renderConnectionLineControls() {
      const root = document.getElementById("connectionLineControls");
      if (!root) return;
      root.innerHTML = "";
      root.setAttribute("aria-label", localText("연결선 표시", "Connection line mode"));

      const modeLabel = document.createElement("div");
      modeLabel.className = "connection-line-mode-label";
      modeLabel.textContent = localText("연결선", "Connection lines");
      const modeGroup = document.createElement("div");
      modeGroup.className = "segmented compact connection-line-mode";
      modeGroup.setAttribute("role", "radiogroup");
      modeGroup.setAttribute("aria-label", localText("연결선 표시", "Connection line mode"));
      CONNECTION_LINE_MODES.forEach(mode => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        const labelText = connectionLineModeLabel(mode);
        const helpText = connectionLineModeDescription(mode);
        input.type = "radio";
        input.name = "connectionLineMode";
        input.value = mode;
        input.checked = normalizeConnectionLineMode(state.connectionLineMode) === mode;
        input.title = helpText;
        label.title = helpText;
        label.setAttribute("aria-label", `${labelText}: ${helpText}`);
        input.addEventListener("change", () => {
          if (!input.checked) return;
          state.connectionLineMode = normalizeConnectionLineMode(input.value);
          state.preserveViewportOnce = true;
          render();
        });
        label.append(input, document.createTextNode(labelText));
        modeGroup.appendChild(label);
      });
      root.append(modeLabel, modeGroup);
    }


export function renderChartGuide() {
      const details = document.getElementById("chartGuide");
      const guide = document.getElementById("chartGuideContent") || details;
      if (!guide) return;
      guide.innerHTML = "";
      if (details) details.setAttribute("aria-label", localText("차트 안내", "Chart guide"));
      const summary = document.getElementById("chartGuideSummary");
      if (summary) summary.textContent = localText("차트 안내", "Chart Guide");

      const paretoHelpText = localText(
        "다른 표시 후보가 연구를 더 필요로 하지 않고, 선택한 차트 지표도 같거나 더 좋으며, 두 축 중 적어도 하나에서는 더 좋은 후보입니다.",
        "A candidate is Pareto-dominated when another visible option needs no more research, is at least as good on the selected chart metric, and is better on at least one plotted axis."
      );

      const appendItem = (symbolClass, text, helpText = "") => {
        const item = document.createElement("span");
        item.className = "chart-guide-item";
        const symbol = document.createElement("span");
        symbol.className = `chart-guide-symbol ${symbolClass}`;
        item.append(symbol, document.createTextNode(text));
        if (helpText) {
          const help = document.createElement("span");
          help.className = "chart-guide-help";
          help.textContent = "?";
          help.tabIndex = 0;
          help.setAttribute("role", "note");
          help.setAttribute("aria-label", helpText);
          help.dataset.help = helpText;
          item.appendChild(help);
        }
        guide.appendChild(item);
      };

      appendItem("is-line", localText("선: 드라이브 진행 경로", "Lines: drive progression"));
      if (secondaryEncodingEnabled()) {
        appendItem(
          "is-secondary",
          localText("투명도: 낮은 TWR / 큰 질량", "Transparency: low TWR / high mass"),
        );
      }
      appendItem("is-pareto", localText("×: Pareto 지배", "×: Pareto-dominated"), paretoHelpText);
      appendItem("is-warning", localText("경고 링: 낮은 TWR/극단 질량비", "Warning ring: low TWR/extreme mass"));
      appendItem("is-pin", localText("윤곽선: 호버/선택/고정, 재클릭 해제", "Outline: hover/select/pin; click again unpins"));
    }

export function valueDomain(rows) {
      if (isBandMetric()) {
        const values = rows.flatMap(row => chartSummaryMassOptions(row).map(option => optionMetricValue(option)));
        return paddedDomain(values, state.logY);
      }
      const values = rows.map(metricDefs[state.metric].value).filter(v => Number.isFinite(v) && v > 0);
      return paddedDomain(values, state.logY);
    }

export function baseValueDomain(rows) {
      if (isBandMetric()) {
        const values = rows
          .map(row => chartSummaryMassOptions(row)[0])
          .filter(Boolean)
          .map(option => optionMetricValue(option))
          .filter(value => Number.isFinite(value) && value > 0);
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
      state.hoverPoints = powerResearchActive()
        ? mergePinnedFocusTooltipRefs(state.hoverPoints)
        : pinnedFocusTooltipRefs();
      chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
      chart.setAttribute("preserveAspectRatio", "xMidYMid meet");
      chart.innerHTML = "";

      const baseXDomain = paddedDomain(baseChartResearchValues(rows), state.logX);
      const baseYDomain = baseValueDomain(rows);
      const xConstraintDomain = paddedDomain(chartResearchValues(rows), state.logX);
      const yConstraintDomain = valueDomain(rows);
      const zoomContext = currentZoomContext();
      const preserveViewport = !!(state.preserveViewportOnce && state.zoom);
      if (state.zoom && !preserveViewport && state.zoomContext && state.zoomContext !== zoomContext) {
        state.zoom = null;
      }
      const xDomain = preserveViewport
        ? state.zoom.xDomain.slice()
        : (state.zoom ? constrainDomain(state.zoom.xDomain, xConstraintDomain, state.logX) : baseXDomain);
      const yDomain = preserveViewport
        ? state.zoom.yDomain.slice()
        : (state.zoom ? constrainDomain(state.zoom.yDomain, yConstraintDomain, state.logY) : baseYDomain);
      if (state.zoom) {
        state.zoom = { xDomain, yDomain };
        state.zoomContext = zoomContext;
      } else {
        state.zoomContext = "";
      }
      state.preserveViewportOnce = false;
      const x = makeScale(xDomain, [margin.left, margin.left + innerW], state.logX);
      const y = makeScale(yDomain, [margin.top + innerH, margin.top], state.logY);
      setChartViewport({ width, height, margin, innerW, innerH, xDomain, yDomain, baseXDomain, baseYDomain, xConstraintDomain, yConstraintDomain });

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
      drawPointStateOverlay();
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
      state.hoverHitSignature = "";
      state.dismissedTooltipKeys.clear();
      const pinned = state.tooltipPinned ? pinnedFocusTooltipRefs() : pinnedTooltipRefs();
      if (state.tooltipPinned) {
        setHoverPoints(pinned);
        return;
      }
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
      const nextX = constrainDomain(xDomain, chartViewport.xConstraintDomain || chartViewport.baseXDomain, state.logX);
      const nextY = constrainDomain(yDomain, chartViewport.yConstraintDomain || chartViewport.baseYDomain, state.logY);
      state.zoom = sameDomain(nextX, chartViewport.baseXDomain, state.logX) && sameDomain(nextY, chartViewport.baseYDomain, state.logY)
        ? null
        : { xDomain: nextX, yDomain: nextY };
      state.zoomContext = state.zoom ? currentZoomContext() : "";
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
      if (!chartViewport || !chartHitTargets.length) return;
      if (state.tooltipPinned) {
        updatePinnedTooltipHoverFocus(event);
        return;
      }
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

export function updatePinnedTooltipHoverFocus(event) {
      const pinned = pinnedFocusTooltipRefs();
      const point = svgPointFromEvent(event);
      const applyRefs = refs => {
        setHoverPoints(refs);
        if (!sameTooltipRefs(refs, state.lastTooltipItems)) {
          state.lastTooltipItems = refs;
          refreshTooltip(currentChartRows);
        }
      };
      if (!pointInPlot(point)) {
        state.hoverHitSignature = "";
        state.dismissedTooltipKeys.clear();
        applyRefs(pinned);
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
          applyRefs(mergePinnedFocusTooltipRefs(resolveLadderHoverRefs(ladderHits)));
          return;
        }
        state.hoverHitSignature = "";
        state.dismissedTooltipKeys.clear();
        applyRefs(pinned);
        return;
      }

      const signature = hits.map(hit => hit.key).join("|");
      if (signature !== state.hoverHitSignature) {
        state.hoverHitSignature = signature;
        state.dismissedTooltipKeys.clear();
      }
      applyRefs(mergePinnedFocusTooltipRefs(hits.filter(hit => !state.dismissedTooltipKeys.has(hit.key))));
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
      const primary = visibleHits[0];
      const pinnedSnapshotKeys = new Set(dedupeTooltipRefs(state.tooltipPinnedItems).map(item => item.key));
      if (isPinnedTooltipKey(primary.key)) {
        unpinTooltipItemByKey(primary.key);
        return;
      }
      if (state.tooltipPinned && pinnedSnapshotKeys.has(primary.key)) {
        unpinTooltip();
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
