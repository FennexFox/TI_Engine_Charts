import { chartMassOptions, chartSummaryMassOptions, effectiveDriveValues, isImpracticalOption, massOptions, rowCategoryLabel, rowFamilyLabel, rowProjectLabel, rowUnlockResearchValue } from "../calc/filtering.js";
import { isBandMetric, optionMetricValue } from "../calc/metrics.js";
import { clamp } from "../shared/math.js";
import { currentChartRows, currentDiagnostics } from "../chart/context.js";
import { dedupeTooltipRefs, defaultTooltipOption, isPinnedTooltipKey, mergePinnedTooltipRefs, optionAdditionalResearchValue, optionPowerResearchDelta, pinnedTooltipRefs, pointKey, powerResearchFocusSignature, redrawPowerResearchFocusIfChanged, resolveTooltipRow, setHoverPoints, syncPinnedTooltipOrder, tooltipRef, updateHoverStyles } from "../chart/rendering.js";
import { localLabel } from "../presets/library.js";
import { UI_LANG, metricDefs, state, tooltip } from "../state/core.js";
import { backgroundStyle, escapeHtml, formatAxisTick, formatCompact, formatNumber, formatPercent, formatTick, formatTwr, formatTwrDynamicUnit, paintStyle, trim } from "./formatting.js";
export { backgroundStyle, escapeHtml, formatAxisTick, formatCompact, formatNumber, formatPercent, formatTick, formatTwr, formatTwrDynamicUnit, paintStyle, trim } from "./formatting.js";


export function tooltipPanelHtml(items) {
      const pinnedText = UI_LANG === "en" ? "Pinned" : "고정됨";
      const pinnedCardText = UI_LANG === "en" ? "pinned cards" : "고정 카드";
      const countText = UI_LANG === "en" ? `${items.length} selected` : `선택 항목 ${items.length}개`;
      const statusParts = [];
      if (state.tooltipPinned) statusParts.push(`<span class="tooltip-pin">${pinnedText}</span>`);
      const pinnedCount = items.filter(item => isPinnedTooltipKey(item.key)).length;
      if (pinnedCount) statusParts.push(`<span class="tooltip-pin">${pinnedCount} ${pinnedCardText}</span>`);
      if (items.length > 1) statusParts.push(countText);
      const count = statusParts.length ? `<div class="tooltip-count">${statusParts.join("")}</div>` : "";
      return `
        <button class="tooltip-close" type="button" aria-label="선택 해제">&times;</button>
        ${count}
        <div class="tooltip-items">
          ${items.map((item, index) => tooltipHtml(item.row, item.option, item.key, index, items.length)).join("")}
        </div>
      `;
    }

export function pinTooltipItems(items) {
      const refs = dedupeTooltipRefs(items);
      if (!refs.length) {
        clearTooltip();
        return;
      }
      state.tooltipPinned = true;
      state.dismissedTooltipKeys.clear();
      const nextRefs = dedupeTooltipRefs([...state.lastTooltipItems, ...refs]);
      state.hoverHitSignature = nextRefs.map(item => item.key).join("|");
      state.lastTooltipItems = nextRefs;
      setHoverPoints(nextRefs);
      refreshTooltip(currentChartRows);
    }

export function unpinTooltip() {
      state.tooltipPinned = false;
      state.hoverHitSignature = "";
      state.dismissedTooltipKeys.clear();
      refreshTooltip(currentChartRows);
    }

export function tooltipHtml(row, option = null, key = "", index = 0, itemCount = 1) {
      const metrics = tooltipMetricsHtml(row, option);
      const selected = option ? tooltipBreakdownHtml(row, option) : "";
      const powerSteps = isBandMetric() ? tooltipPowerStepsHtml(row, option) : "";
      const powerName = option ? option.displayName : (UI_LANG === "en" ? "No power plant candidate" : "전원 후보 없음");
      const pinned = isPinnedTooltipKey(key);
      const pinLabel = UI_LANG === "en" ? (pinned ? "Unpin this card" : "Pin this card") : (pinned ? "이 카드 고정 해제" : "이 카드 고정");
      return `
        <section class="tooltip-item${pinned ? " is-pinned" : ""}" data-tooltip-key="${escapeHtml(key)}">
          <div class="tooltip-item-order" aria-label="순서 변경">
            <button class="tooltip-item-move" type="button" data-tooltip-key="${escapeHtml(key)}" data-direction="up" aria-label="위로 이동"${index === 0 ? " disabled" : ""}>▲</button>
            <button class="tooltip-item-move" type="button" data-tooltip-key="${escapeHtml(key)}" data-direction="down" aria-label="아래로 이동"${index >= itemCount - 1 ? " disabled" : ""}>▼</button>
          </div>
          <div class="tooltip-item-actions">
            <button class="tooltip-item-close" type="button" data-tooltip-key="${escapeHtml(key)}" aria-label="항목 삭제">&times;</button>
            <button class="tooltip-item-pin" type="button" data-tooltip-key="${escapeHtml(key)}" aria-label="${escapeHtml(pinLabel)}" aria-pressed="${pinned ? "true" : "false"}">📌</button>
          </div>
          <h2>${escapeHtml(row.displayName)}<span class="tooltip-title-power">${escapeHtml(powerName)}</span></h2>
          <div class="muted">${escapeHtml(rowCategoryLabel(row))} / ${escapeHtml(rowFamilyLabel(row))} · ${escapeHtml(rowProjectLabel(row))}</div>
          ${metrics}
          ${selected}
          ${powerSteps}
        </section>
      `;
    }

export function tooltipMetricsHtml(row, option = null) {
      const powerResearch = Math.max(
        0,
        option ? optionPowerResearchDelta(row, option) : (row.powerResearchCost || 0),
      );
      const driveResearch = Math.max(0, row.cumulativeResearch - row.ownResearchCost);
      const projectResearch = Math.max(0, row.ownResearchCost);
      const unlockResearch = Math.max(0, driveResearch + projectResearch + powerResearch);
      const researchTotal = Math.max(driveResearch + projectResearch + powerResearch, 1e-9);
      const twrValue = option ? option.twr : (defaultTooltipOption(row)?.twr ?? NaN);
      const effective = effectiveDriveValues(row);
      const baseThrustN = option && Number.isFinite(Number(option.baseThrustN)) ? Number(option.baseThrustN) : row.thrustN;
      const effectiveThrustN = option && Number.isFinite(Number(option.effectiveThrustN)) ? Number(option.effectiveThrustN) : effective.thrustN;
      const baseEvKps = option && Number.isFinite(Number(option.baseExhaustVelocityKps)) ? Number(option.baseExhaustVelocityKps) : row.exhaustVelocityKps;
      const effectiveEvKps = option && Number.isFinite(Number(option.effectiveExhaustVelocityKps)) ? Number(option.effectiveExhaustVelocityKps) : effective.exhaustVelocityKps;
      const basePowerRequirementGW = option && Number.isFinite(Number(option.basePowerRequirementGW)) ? Number(option.basePowerRequirementGW) : (effective.basePowerRequirementGW ?? row.powerRequirementGW);
      const modifiedPowerRequirementGW = option && Number.isFinite(Number(option.modifiedPowerRequirementGW)) ? Number(option.modifiedPowerRequirementGW) : (effective.powerRequirementGW ?? row.powerRequirementGW);
      const thrustText = modifiedMetricText(effectiveThrustN / 1e6, baseThrustN / 1e6, " MN");
      const evText = modifiedMetricText(effectiveEvKps, baseEvKps, " km/s");
      const powerText = modifiedMetricText(modifiedPowerRequirementGW, basePowerRequirementGW, " GW");
      const moduleEffects = moduleEffectTooltipHtml(option, effective);
      const researchRows = [
        [UI_LANG === "en" ? "Unlock research" : "개방 연구력", formatResearch(unlockResearch), true],
        [UI_LANG === "en" ? "Drive research" : "드라이브 연구", formatResearch(driveResearch), false],
        [UI_LANG === "en" ? "Project research" : "프로젝트 연구", formatResearch(projectResearch), false],
        [UI_LANG === "en" ? "Power research" : "전원 연구", formatResearch(powerResearch), false],
      ];
      const performanceRows = [
        [UI_LANG === "en" ? "Thrust" : "추력", thrustText],
        [UI_LANG === "en" ? "TWR" : "TWR", formatTwr(twrValue, " g")],
        [UI_LANG === "en" ? "Exhaust velocity" : "EV", evText],
        [UI_LANG === "en" ? "Efficiency" : "효율", formatPercent(row.efficiency)],
        [UI_LANG === "en" ? "Power requirement" : "출력 요구량", powerText],
      ];
      return `
        <details class="tooltip-section" open>
          <summary>${UI_LANG === "en" ? "Performance detail" : "성능 상세"}</summary>
          <div class="tooltip-section-body">
            <div class="tooltip-metrics">
              ${performanceRows.map(([label, value]) => `
                <div class="tooltip-metric">
                  <div class="tooltip-metric-label">${escapeHtml(label)}</div>
                  <div class="tooltip-metric-value">${escapeHtml(value)}</div>
                </div>
              `).join("")}
            </div>
          </div>
        </details>
        ${moduleEffects}
        <details class="tooltip-section" open>
          <summary>${UI_LANG === "en" ? "Research detail" : "연구 상세"}</summary>
          <div class="tooltip-section-body">
            <div class="tooltip-metric is-emphasis">
              <div class="tooltip-metric-label">${escapeHtml(UI_LANG === "en" ? "Unlock research total" : "개방 연구력 합계")}</div>
              <div class="tooltip-metric-value">${escapeHtml(formatResearch(unlockResearch))}</div>
            </div>
            <div class="tooltip-ratio" aria-hidden="true">
              <span class="research-drive" style="width:${clamp(driveResearch / researchTotal * 100, 0, 100).toFixed(2)}%" title="${escapeHtml(UI_LANG === "en" ? "Drive research" : "드라이브 연구")}: ${escapeHtml(formatResearch(driveResearch))}"></span>
              <span class="research-project" style="width:${clamp(projectResearch / researchTotal * 100, 0, 100).toFixed(2)}%" title="${escapeHtml(UI_LANG === "en" ? "Project research" : "프로젝트 연구")}: ${escapeHtml(formatResearch(projectResearch))}"></span>
              <span class="research-power" style="width:${clamp(powerResearch / researchTotal * 100, 0, 100).toFixed(2)}%" title="${escapeHtml(UI_LANG === "en" ? "Power research" : "전원 연구")}: ${escapeHtml(formatResearch(powerResearch))}"></span>
            </div>
            <div class="tooltip-metrics">
              ${researchRows.slice(1).map(([label, value]) => `
                <div class="tooltip-metric">
                  <div class="tooltip-metric-label">${escapeHtml(label)}</div>
                  <div class="tooltip-metric-value">${escapeHtml(value)}</div>
                </div>
              `).join("")}
            </div>
          </div>
        </details>
      `;
    }

export function modifiedMetricText(effectiveValue, baseValue, suffix) {
      const effective = formatNumber(effectiveValue, suffix);
      if (!Number.isFinite(effectiveValue) || !Number.isFinite(baseValue)) return effective;
      const scale = Math.max(Math.abs(baseValue), 1);
      if (Math.abs(effectiveValue - baseValue) <= scale * 1e-9) return effective;
      return `${effective} (${UI_LANG === "en" ? "base" : "기본"} ${formatNumber(baseValue, suffix)})`;
    }

export function effectTypeLabel(type) {
      if (type === "thrustMultiplier") return UI_LANG === "en" ? "Thrust" : "추력";
      if (type === "exhaustVelocityMultiplier") return UI_LANG === "en" ? "EV/Isp" : "EV/Isp";
      if (type === "wasteHeatMultiplier") return UI_LANG === "en" ? "Waste heat" : "폐열";
      return type || "";
    }

function isHeatRuleCategory(category) {
      const normalized = String(category || "").toLowerCase();
      return normalized === "heat"
        || normalized === "wasteheat"
        || normalized === "thermal"
        || normalized === "radiator";
    }

export function moduleEffectTooltipHtml(option, effective) {
      const evaluation = effective && effective.moduleEffectEvaluation;
      const activeEffects = option && Array.isArray(option.activeModuleEffects)
        ? option.activeModuleEffects
        : evaluation && Array.isArray(evaluation.activeEffects)
          ? evaluation.activeEffects
          : [];
      const diagnostics = option && option.moduleEffectDiagnostics
        ? option.moduleEffectDiagnostics
        : evaluation && evaluation.diagnostics
          ? evaluation.diagnostics
          : null;
      if (!activeEffects.length && !diagnostics) return "";

      const chips = activeEffects.map(effect => {
        const multiplier = Number(effect.multiplier);
        const value = Number.isFinite(multiplier) ? `x${Number(multiplier.toPrecision(3))}` : "";
        const moduleName = effect.moduleName || effect.moduleId || "";
        return `<span class="effect-chip is-active">${escapeHtml(`${moduleName} · ${effectTypeLabel(effect.type)} ${value}`.trim())}</span>`;
      });
      const auxiliaryPowerGW = option && Number.isFinite(Number(option.moduleAuxiliaryPowerGW))
        ? Number(option.moduleAuxiliaryPowerGW)
        : effective && Number.isFinite(Number(effective.moduleAuxiliaryPowerGW))
          ? Number(effective.moduleAuxiliaryPowerGW)
          : 0;
      if (auxiliaryPowerGW > 0) {
        chips.push(`<span class="effect-chip is-active">${escapeHtml(`${UI_LANG === "en" ? "Aux power" : "보조 전력"} +${formatNumber(auxiliaryPowerGW, " GW")}`)}</span>`);
      }
      const warnings = [];
      if (diagnostics) {
        (diagnostics.unmetRequirements || []).forEach(item => {
          warnings.push(`${item.moduleName || item.moduleId}: ${UI_LANG === "en" ? "unmet prerequisite" : "미충족 조건"} ${item.requirement}`);
        });
        (diagnostics.unsupportedRules || []).forEach(item => {
          if (item.category === "powerDemand") return;
          if (isHeatRuleCategory(item.category)) return;
          warnings.push(`${item.moduleName || item.moduleId}: ${UI_LANG === "en" ? "unsupported rule" : "미지원 규칙"} ${item.rule}`);
        });
        (diagnostics.unsupportedEffects || []).forEach(item => {
          warnings.push(`${item.moduleName || item.moduleId}: ${UI_LANG === "en" ? "unsupported effect" : "미지원 효과"} ${item.type || item.sourceRule}`);
        });
        (diagnostics.powerWarnings || []).forEach(item => {
          warnings.push(`${item.moduleName || item.moduleId}: ${UI_LANG === "en" ? "power rule not modeled" : "전력 규칙 미모델링"} ${item.rule}`);
        });
        (diagnostics.heatWarnings || []).forEach(item => {
          warnings.push(`${item.moduleName || item.moduleId}: ${UI_LANG === "en" ? "heat rule not modeled" : "폐열 규칙 미모델링"} ${item.rule}`);
        });
      }
      if (!chips.length && !warnings.length) return "";
      return `
        <details class="tooltip-section tooltip-module-effects" open>
          <summary>${UI_LANG === "en" ? "Module effects" : "모듈 효과"}</summary>
          <div class="tooltip-section-body">
            ${chips.length ? `<div class="effect-chip-list">${chips.join("")}</div>` : ""}
            ${warnings.length ? `<div class="module-effects-warnings">${warnings.map(item => `<div class="module-effects-warning">${escapeHtml(item)}</div>`).join("")}</div>` : ""}
          </div>
        </details>
      `;
    }

export function tooltipBreakdownHtml(row, option) {
      const totalLabel = UI_LANG === "en" ? "Total mass" : "총질량";
      const radiatorText = modifiedMetricText(
        Number(option.radiatorMassTons),
        Number(option.baseRadiatorMassTons),
        " t",
      );
      const wasteHeatText = modifiedMetricText(
        Number(option.modifiedWasteHeatGW ?? option.wasteHeatGW),
        Number(option.baseWasteHeatGW),
        " GW",
      );
      const wasteHeatMultiplier = Number(option.wasteHeatMultiplier);
      const heatMultiplierText = Number.isFinite(wasteHeatMultiplier) && Math.abs(wasteHeatMultiplier - 1) > 1e-9
        ? ` · ${UI_LANG === "en" ? "heat multiplier" : "폐열 배율"} x${Number(wasteHeatMultiplier.toPrecision(3))}`
        : "";
      const components = [
        [UI_LANG === "en" ? "Hull" : "선체", option.baseDryTons, "stack-hull", formatNumber(option.baseDryTons, " t")],
        [UI_LANG === "en" ? "Drive" : "드라이브", row.driveMassTons, "stack-drive", formatNumber(row.driveMassTons, " t")],
        [UI_LANG === "en" ? "Power plant" : "전원", option.powerPlantMassTons, "stack-reactor", formatNumber(option.powerPlantMassTons, " t")],
        [UI_LANG === "en" ? "Radiator" : "라디에이터", option.radiatorMassTons, "stack-radiator", radiatorText],
        [UI_LANG === "en" ? "Propellant" : "추진체", option.propellantTons, "stack-propellant", formatNumber(option.propellantTons, " t")],
      ];
      const total = Math.max(option.totalMassTons, 1e-9);
      const impracticalNote = isImpracticalOption(option)
        ? `<div class="warning">${UI_LANG === "en" ? "Shown as an impractical candidate under the current scenario." : "현재 시나리오에서 비현실적 후보로 표시 중입니다."}</div>`
        : "";
      const componentRows = components.map(([label, value, className, displayValue]) => `
            <span>${label}</span><strong>${displayValue}</strong>
      `).join("");
      const componentSegments = components.map(([label, value, className]) => {
        const share = clamp(value / total * 100, 0, 100);
        return `<span class="${className}" style="width:${share.toFixed(2)}%" title="${label}: ${formatNumber(value, " t")}"></span>`;
      }).join("");
      return `
        <details class="tooltip-section tooltip-breakdown" open>
          <summary>${UI_LANG === "en" ? "Mass breakdown" : "총질량 breakdown"}</summary>
          <div class="tooltip-section-body">
            <div><strong>${totalLabel}</strong>: ${formatNumber(option.totalMassTons, " t")}</div>
            ${impracticalNote}
            <div class="tooltip-breakdown-grid">
              ${componentRows}
            </div>
            <div class="tooltip-stack" aria-hidden="true">
              ${componentSegments}
            </div>
            <div class="muted">${UI_LANG === "en" ? "Waste heat" : "폐열"}: ${wasteHeatText}${heatMultiplierText}</div>
          </div>
        </details>
      `;
    }

export function tooltipPowerStepsHtml(row, selectedOption = null) {
      const options = chartMassOptions(row);
      if (!options.length) return "";
      const baseCombined = optionAdditionalResearchValue(row, options[0]);
      const selectedId = selectedOption ? selectedOption.id : options[0].id;
      const headers = UI_LANG === "en"
        ? ["Power plant", "+Research", "Combined", "Wet mass", "TWR", "Plant", "Radiator"]
        : ["전원", "+연구", "합산", "습질량", "TWR", "전원", "방열기"];
      const rows = options.map(option => {
        const combined = optionAdditionalResearchValue(row, option);
        const delta = Math.max(0, combined - baseCombined);
        const selected = option.id === selectedId;
        return `
          <tr${selected ? " class=\"is-selected\"" : ""}>
            <td>${escapeHtml(option.displayName || option.id || "-")}</td>
            <td class="numeric">${escapeHtml(formatResearch(delta))}</td>
            <td class="numeric">${escapeHtml(formatResearch(combined))}</td>
            <td class="numeric">${escapeHtml(formatNumber(option.totalMassTons, " t"))}</td>
            <td class="numeric">${escapeHtml(formatTwr(option.twr, " g"))}</td>
            <td class="numeric">${escapeHtml(formatNumber(option.powerPlantMassTons, " t"))}</td>
            <td class="numeric">${escapeHtml(formatNumber(option.radiatorMassTons, " t"))}</td>
          </tr>
        `;
      }).join("");
      return `
        <details class="tooltip-section tooltip-power-steps" open>
          <summary>${UI_LANG === "en" ? "Power steps" : "전원 단계"}</summary>
          <div class="tooltip-section-body">
            <div class="power-steps-table-wrap">
              <table class="power-steps-table">
                <thead>
                  <tr>${headers.map(label => `<th>${escapeHtml(label)}</th>`).join("")}</tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </details>
      `;
    }

export function resolveTooltipItems(rows) {
      const rowById = new Map(rows.map(row => [row.id, row]));
      const resolved = [];
      const seen = new Set();
      state.lastTooltipItems.forEach(item => {
        const ref = tooltipRef(item);
        const row = resolveTooltipRow(ref, rowById, rows);
        if (!row) return;
        const options = chartMassOptions(row, state.metric);
        const option = options.find(candidate => candidate.id === ref.powerOptionId) || defaultTooltipOption(row);
        if (!option) return;
        const powerOptionId = option.id || "";
        const key = pointKey(row.id, powerOptionId);
        if (seen.has(key)) return;
        seen.add(key);
        resolved.push({ row, option, rowId: row.id, powerOptionId, key, sourceKey: ref.key });
      });
      return resolved;
    }

export function refreshTooltip(rows = currentChartRows) {
      const previousSignature = powerResearchFocusSignature();
      if (!state.lastTooltipItems.length) {
        renderEmptyTooltip();
        redrawPowerResearchFocusIfChanged(previousSignature);
        return;
      }
      const resolved = resolveTooltipItems(rows);
      if (!resolved.length) {
        clearTooltip();
        return;
      }
      const pinnedKeys = new Set(state.pinnedTooltipItems.map(item => item.key));
      const hoverKeys = new Set(state.hoverPoints.map(item => item.key));
      state.lastTooltipItems = resolved.map(item => tooltipRef(item.rowId, item.powerOptionId));
      state.pinnedTooltipItems = resolved
        .filter(item => pinnedKeys.has(item.sourceKey) || pinnedKeys.has(item.key))
        .map(item => tooltipRef(item.rowId, item.powerOptionId));
      const nextPinnedKeys = new Set(state.pinnedTooltipItems.map(item => item.key));
      state.hoverPoints = resolved
        .filter(item => hoverKeys.has(item.sourceKey) || hoverKeys.has(item.key) || nextPinnedKeys.has(item.key))
        .map(item => tooltipRef(item.rowId, item.powerOptionId));
      tooltip.innerHTML = tooltipPanelHtml(resolved);
      tooltip.classList.remove("tooltip-empty");
      tooltip.classList.remove("has-diagnostic");
      tooltip.classList.remove("has-panel");
      if (!redrawPowerResearchFocusIfChanged(previousSignature)) {
        updateHoverStyles();
      }
    }

export function moveTooltipItemByOffset(key, offset) {
      if (!key || !offset) return;
      const refs = dedupeTooltipRefs(state.lastTooltipItems);
      const index = refs.findIndex(item => item.key === key);
      if (index < 0) return;
      const nextIndex = clamp(index + offset, 0, refs.length - 1);
      if (nextIndex === index) return;
      const [moving] = refs.splice(index, 1);
      refs.splice(nextIndex, 0, moving);
      state.lastTooltipItems = refs;
      syncPinnedTooltipOrder();
      const hoveredKeys = new Set(state.hoverPoints.map(item => item.key));
      if (hoveredKeys.size) {
        state.hoverPoints = refs.filter(item => hoveredKeys.has(item.key));
      }
      refreshTooltip(currentChartRows);
    }

export function toggleTooltipItemPin(key) {
      if (!key) return;
      const refs = dedupeTooltipRefs(state.lastTooltipItems);
      const ref = refs.find(item => item.key === key);
      if (!ref) return;
      if (isPinnedTooltipKey(key)) {
        state.pinnedTooltipItems = state.pinnedTooltipItems.filter(item => item.key !== key);
      } else {
        state.pinnedTooltipItems = dedupeTooltipRefs([...state.pinnedTooltipItems, ref]);
      }
      state.lastTooltipItems = mergePinnedTooltipRefs(refs);
      setHoverPoints(mergePinnedTooltipRefs(state.hoverPoints));
      refreshTooltip(currentChartRows);
    }

export function removeTooltipItem(key) {
      if (!key) return;
      const previousSignature = powerResearchFocusSignature();
      state.dismissedTooltipKeys.add(key);
      state.lastTooltipItems = state.lastTooltipItems.filter(item => tooltipRef(item).key !== key);
      state.hoverPoints = state.hoverPoints.filter(item => item.key !== key);
      state.pinnedTooltipItems = state.pinnedTooltipItems.filter(item => item.key !== key);
      if (state.lastTooltipItems.length) {
        refreshTooltip(currentChartRows);
      } else {
        clearTooltip();
      }
      if (!redrawPowerResearchFocusIfChanged(previousSignature)) {
        updateHoverStyles();
      }
    }

export function renderEmptyTooltip() {
      const family = currentDiagnostics && currentDiagnostics.zeroFamilies.length
        ? currentDiagnostics.zeroFamilies[0]
        : null;
      if (family) {
        tooltip.innerHTML = scenarioPanelHtml(family, currentDiagnostics.zeroFamilies.length);
        tooltip.classList.add("has-diagnostic");
        tooltip.classList.remove("has-panel");
      } else {
        tooltip.innerHTML = usagePanelHtml();
        tooltip.classList.remove("has-diagnostic");
        tooltip.classList.add("has-panel");
      }
      tooltip.classList.add("tooltip-empty");
    }

export function clearTooltip(options = {}) {
      const previousSignature = powerResearchFocusSignature();
      const keepPinned = !!options.keepPinned;
      const pinnedRefs = keepPinned ? pinnedTooltipRefs() : [];
      state.lastTooltipItems = pinnedRefs;
      state.hoverPoints = pinnedRefs;
      state.tooltipPinned = false;
      if (!keepPinned) state.pinnedTooltipItems = [];
      state.dismissedTooltipKeys.clear();
      state.hoverHitSignature = pinnedRefs.map(item => item.key).join("|");
      if (pinnedRefs.length) {
        refreshTooltip(currentChartRows);
      } else {
        renderEmptyTooltip();
      }
      if (!redrawPowerResearchFocusIfChanged(previousSignature)) {
        updateHoverStyles();
      }
    }

export function usagePanelHtml() {
      if (UI_LANG === "en") {
        return `
          <div class="usage-panel">
            <h2>How to use detail cards</h2>
            <p>Hover over a chart point to show its total-mass/TWR card here. Click a point to keep the current card set while you inspect other parts of the chart.</p>
            <ul>
              <li>Use Pin on an individual card to keep that drive visible while hovering over distant candidates.</li>
              <li>Use the arrow buttons to reorder cards, and the x button to remove cards that are no longer useful.</li>
              <li>For total-mass and TWR charts, compare the mass breakdown, wet-mass TWR, and power plant line together before choosing a research path.</li>
            </ul>
          </div>
        `;
      }
      return `
        <div class="usage-panel">
          <h2>상세 카드 사용법</h2>
          <p>차트의 데이터포인트에 마우스를 올리면 해당 추진기와 전원 조합의 총질량/TWR 카드가 이 영역에 표시됩니다. 데이터포인트를 클릭하면 현재 카드 묶음을 유지한 채 다른 지점을 살펴볼 수 있습니다.</p>
          <ul>
            <li>개별 카드의 핀 버튼을 누르면 서로 멀리 떨어진 후보를 계속 남겨 두고 비교할 수 있습니다.</li>
            <li>화살표 버튼으로 카드 순서를 바꾸고, x 버튼으로 더 이상 필요 없는 카드를 삭제할 수 있습니다.</li>
            <li>총질량/TWR 그래프에서는 질량 breakdown, 습질량 TWR, 전원 계열을 함께 보면서 어떤 연구 계통에 투자할지 판단하세요.</li>
          </ul>
        </div>
      `;
    }

export function scenarioPanelHtml(family, zeroFamilyCount) {
      const title = UI_LANG === "en" ? "Why are some drives hidden?" : "왜 일부 드라이브가 숨겨졌나요?";
      const body = scenarioExplanationText(family);
      const suggestions = scenarioSuggestions();
      const more = zeroFamilyCount > 1
        ? (UI_LANG === "en"
          ? `<p>${zeroFamilyCount - 1} additional selected ${zeroFamilyCount - 1 === 1 ? "family is" : "families are"} also hidden under this scenario.</p>`
          : `<p>이 외에도 선택된 계열 ${zeroFamilyCount - 1}개가 현재 시나리오에서 숨겨져 있습니다.</p>`)
        : "";
      return `
        <div class="scenario-panel">
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(body)}</p>
          ${more}
          <div>
            <div class="muted">${escapeHtml(UI_LANG === "en" ? "Suggestions" : "제안")}</div>
            <ul>
              ${suggestions.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </div>
        </div>
      `;
    }

export function scenarioExplanationText(family) {
      const familyName = localLabel(family);
      const dryMass = formatNumber(state.dryMassTons, " t");
      const targetDv = formatNumber(state.targetDvKps, UI_LANG === "en" ? " km/s" : " km/s");
      const reason = family.dominantReason;
      if (reason === "minTwr") {
        return UI_LANG === "en"
          ? `At ${dryMass} dry mass and ${targetDv} target dV, ${familyName} drives exist, but none meet the current minimum TWR filter. In this scenario their propellant mass can become very large, lowering wet-mass TWR.`
          : `건조질량 ${dryMass}, 목표 dV ${targetDv} 조건에서 ${familyName} 드라이브는 존재하지만 현재 최소 TWR 필터를 만족하지 못합니다. 이 시나리오에서는 추진체 질량이 매우 커져 습질량 TWR이 낮아질 수 있습니다.`;
      }
      if (reason === "targetDvOrMassRatio") {
        return UI_LANG === "en"
          ? `At ${dryMass} dry mass and ${targetDv} target dV, ${familyName} drives exist, but the required mass ratio is extreme for the current scenario.`
          : `건조질량 ${dryMass}, 목표 dV ${targetDv} 조건에서 ${familyName} 드라이브는 존재하지만 현재 시나리오의 요구 질량비가 극단적으로 큽니다.`;
      }
      if (reason === "invalidPowerPlant") {
        return UI_LANG === "en"
          ? `${familyName} drives exist, but no compatible power candidate can be evaluated under the current scenario.`
          : `${familyName} 드라이브는 존재하지만 현재 시나리오에서 평가 가능한 호환 전원 후보가 없습니다.`;
      }
      if (reason === "researchFilter") {
        return UI_LANG === "en"
          ? `${familyName} drives exist, but their research unlock values are not usable under the current data filters.`
          : `${familyName} 드라이브는 존재하지만 현재 데이터 필터에서 연구 개방값을 사용할 수 없습니다.`;
      }
      if (reason === "invalidComputation") {
        return UI_LANG === "en"
          ? `${familyName} drives exist, but the current scenario does not produce finite mass or TWR values for them.`
          : `${familyName} 드라이브는 존재하지만 현재 시나리오에서 유한한 질량 또는 TWR 값을 계산할 수 없습니다.`;
      }
      return UI_LANG === "en"
        ? `${familyName} drives exist, but none are visible under the current axis, scenario, and filter settings.`
        : `${familyName} 드라이브는 존재하지만 현재 축, 시나리오, 필터 설정에서는 표시되는 후보가 없습니다.`;
    }

export function scenarioSuggestions() {
      const suggestions = UI_LANG === "en"
        ? ["Lower target dV", "Lower or disable the minimum TWR filter", "Use a lower-dV scenario for this drive family"]
        : ["목표 dV 낮추기", "최소 TWR 필터 낮추기 또는 해제하기", "이 드라이브 계열에 맞는 낮은 dV 시나리오 사용하기"];
      suggestions.push(UI_LANG === "en" ? "Enable Show impractical candidates" : "비현실적 후보 표시 켜기");
      return suggestions;
    }

export function formatResearch(value) {
      if (!Number.isFinite(value)) return "-";
      return formatCompact(value, 1_000);
    }

export function renderTable(rows) {
      const tbody = document.getElementById("tableBody");
      tbody.innerHTML = "";
      const maxResearch = Math.max(...rows.map(rowUnlockResearchValue).filter(Number.isFinite), 1);
      const metricDomain = tableMetricDomain(rows);
      const sorted = sortRows(rows);
      sorted.forEach(row => {
        const tr = document.createElement("tr");
        const powerOptions = isBandMetric() ? chartSummaryMassOptions(row) : massOptions(row);
        const powerCell = powerOptions.length
          ? reactorBandLabel(powerOptions)
          : `<span class="warning">없음</span>`;
        tr.innerHTML = `
          <td><div class="drive-name">${escapeHtml(row.displayName)}</div><div class="project-name">${escapeHtml(rowProjectLabel(row))}</div></td>
          <td><span class="pill"><span class="family-swatch" style="${backgroundStyle(row.familyColor, row.familyColorOklch || row.familyColor)}"></span>${escapeHtml(rowCategoryLabel(row))} / ${escapeHtml(rowFamilyLabel(row))}</span></td>
          <td class="numeric">${researchCell(row, maxResearch)}</td>
          <td class="numeric">${metricCell(row, metricDomain)}</td>
          <td>${powerCell}</td>
        `;
        tbody.appendChild(tr);
      });
    }

export function sortRows(rows) {
      const direction = state.sortDirection === "asc" ? 1 : -1;
      return rows.slice().sort((a, b) => {
        const aValue = sortValue(a, state.sortKey);
        const bValue = sortValue(b, state.sortKey);
        let result;
        if (typeof aValue === "number" && typeof bValue === "number") {
          result = aValue - bValue;
        } else {
          result = String(aValue ?? "").localeCompare(String(bValue ?? ""), undefined, { numeric: true, sensitivity: "base" });
        }
        if (result === 0) {
          result = rowUnlockResearchValue(a) - rowUnlockResearchValue(b) || a.displayName.localeCompare(b.displayName);
        }
        return result * direction;
      });
    }

export function sortValue(row, key) {
      if (key === "drive") return row.displayName;
      if (key === "family") return `${rowCategoryLabel(row)} / ${rowFamilyLabel(row)}`;
      if (key === "research") return rowUnlockResearchValue(row);
      if (key === "metric") return metricDefs[state.metric].value(row);
      if (key === "reactor") {
        const options = massOptions(row);
        return options.length ? reactorBandText(options) : "";
      }
      return rowUnlockResearchValue(row);
    }

export function researchCell(row, maxResearch) {
      const research = rowUnlockResearchValue(row);
      const width = clamp(research / maxResearch * 100, 0, 100);
      return `
        <div class="cell-viz" title="${formatNumber(research, " research")}">
          <span class="cell-value">${formatResearch(research)}</span>
          <div class="sparkbar" aria-hidden="true"><span class="spark-fill" style="width:${width.toFixed(2)}%"></span></div>
        </div>
      `;
    }

export function tableMetricDomain(rows) {
      const values = rows.flatMap(row => {
        if (isBandMetric()) {
          return optionRange(row).values;
        }
        const value = metricDefs[state.metric].value(row);
        return Number.isFinite(value) && value > 0 ? [value] : [];
      });
      if (!values.length) return { min: 0, max: 1, log: false };
      const min = Math.min(...values);
      const max = Math.max(...values);
      const log = shouldUseSparkLog(values);
      return { min, max, log };
    }

export function shouldUseSparkLog(values) {
      const positive = values.filter(value => Number.isFinite(value) && value > 0);
      if (!positive.length) return false;
      const min = Math.min(...positive);
      const max = Math.max(...positive);
      if (state.metric === "totalMassTons" || state.metric === "fuelMassTons") return true;
      return min > 0 && max / min >= 50;
    }

export function metricCell(row, domain) {
      if (isBandMetric()) {
        return rangeMetricCell(row, domain);
      }
      const value = metricDefs[state.metric].value(row);
      if (!Number.isFinite(value)) return "-";
      const position = sparkPosition(value, domain);
      return `
        <div class="cell-viz" title="${metricDefs[state.metric].format(value)}${domain.log ? " · log sparkline" : ""}">
          <span class="cell-value">${metricDefs[state.metric].format(value)}</span>
          <div class="sparkbar" aria-hidden="true"><span class="spark-fill" style="width:${position.toFixed(2)}%"></span></div>
        </div>
      `;
    }

export function optionRange(row) {
      const options = isBandMetric() ? chartSummaryMassOptions(row) : massOptions(row);
      const values = options.map(option => optionMetricValue(option)).filter(Number.isFinite);
      if (!values.length) return { values: [], min: NaN, max: NaN };
      return { values, min: Math.min(...values), max: Math.max(...values) };
    }

export function rangeMetricCell(row, domain) {
      const range = optionRange(row);
      if (!range.values.length) return "-";
      const left = sparkPosition(range.min, domain);
      const right = sparkPosition(range.max, domain);
      const width = Math.max(right - left, 0.5);
      const formatter = metricDefs[state.metric].format;
      return `
        <div class="cell-viz" title="${formatter(range.min)} - ${formatter(range.max)}${domain.log ? " · log sparkline" : ""}">
          <span class="cell-value">${formatter(range.min)} - ${formatter(range.max)}</span>
          <div class="sparkrange" aria-hidden="true"><span class="sparkrange-fill" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%"></span></div>
        </div>
      `;
    }

export function sparkPosition(value, domain) {
      if (!Number.isFinite(value)) return 0;
      if (domain.log) {
        const min = Math.max(domain.min, 1e-9);
        const max = Math.max(domain.max, min * 1.01);
        const span = Math.max(Math.log10(max) - Math.log10(min), 1e-9);
        return clamp((Math.log10(Math.max(value, 1e-9)) - Math.log10(min)) / span * 100, 0, 100);
      }
      const span = Math.max(domain.max - domain.min, 1e-9);
      return clamp((value - domain.min) / span * 100, 0, 100);
    }

export function reactorBandLabel(options) {
      return escapeHtml(reactorBandText(options));
    }

export function reactorBandText(options) {
      if (!options.length) return "";
      const first = String(options[0].displayName || "");
      if (options.length === 1) return first;
      const last = String(options[options.length - 1].displayName || "");
      const firstRoman = splitRomanSuffix(first);
      const lastRoman = splitRomanSuffix(last);
      if (firstRoman && lastRoman && firstRoman.base === lastRoman.base) {
        return `${first} → ${lastRoman.roman}`;
      }
      return `${first} → ${last}`;
    }

export function splitRomanSuffix(value) {
      const match = String(value).match(/^(.*\S)\s+([IVXLCDM]+)$/);
      if (!match) return null;
      return { base: match[1], roman: match[2] };
    }



