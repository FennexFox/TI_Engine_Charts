import { setupDryMassCalculator } from "./dry_mass_calculator.js";
import { filteredRows, syncFilterInputs } from "../calc/filtering.js";
import { isBandMetric } from "../calc/metrics.js";
import { clamp } from "../shared/math.js";
import { localText } from "../shared/i18n.js";
import { chartViewport } from "../chart/context.js";
import { endChartPan, handleChartKeyDown, handleChartPointerDown, handleChartPointerLeave, handleChartPointerMove, handleChartWheel, redrawChartOnly, render, updateSortHeaders } from "../chart/interaction.js";
import { applyHelp, applyStartupChartPreset, exportedPreset, handleImportedPresetObject, helpText, localCategoryHelp, localLabel, openSerializedObjectExport, parsePresetPayload, readFromClipboard, setupPresetLibraryControls, showPresetStatus } from "../presets/library.js";
import { DATA, DEFAULT_MIN_TWR, applyStaticLanguage, categoryRoot, chart, familyRoot, normalizePowerResearchView, renderRadiatorOptions, setupLeftPanelCards, state, tooltip } from "../state/core.js";
import { enhanceSearchableSelect } from "./searchable_select.js";
import { backgroundStyle } from "./formatting.js";
import { updateChartControls, syncMinTwrInputs, syncMinDvInputs, updateModuleEffectsPanel } from "./control_state.js";
import { clearTooltip, moveTooltipItemByOffset, removeTooltipItem, renderTable, toggleTooltipItemPin } from "./tooltip_table.js";

const MISSION_DV_PRESET_CUSTOM = "custom";
const MISSION_DV_PRESET_GROUPS = [
  {
    id: "defense",
    label: { ko: "방어", en: "Defense" },
    presets: [
      { value: 2, label: { ko: "LEO / 비지구 궤도", en: "LEO / non-Earth orbit" }, optionLabel: { ko: "LEO 방어 / 비지구 궤도", en: "LEO Defense / non-Earth orbit" } },
      { value: 4, label: { ko: "MEO → LEO", en: "MEO → LEO" }, optionLabel: { ko: "MEO에서 LEO", en: "MEO to LEO" } },
      { value: 8, label: { ko: "전 지구권 방어", en: "All Earth Defense" }, optionLabel: { ko: "전 지구권 방어", en: "All Earth Defense" } },
    ],
  },
  {
    id: "assault",
    label: { ko: "강습 / 요격", en: "Assault / Intercept" },
    presets: [
      { value: 20, label: { ko: "신속착륙 요격", en: "Decel Intercept" }, optionLabel: { ko: "신속착륙 요격", en: "Deceleration Burn Intercept" } },
      { value: 30, label: { ko: "소행성 강습", en: "Asteroid Assault" }, optionLabel: { ko: "소행성 강습", en: "Asteroid Assault" } },
      { value: 50, label: { ko: "목성 강습", en: "Jupiter Assault" }, optionLabel: { ko: "목성 강습", en: "Jupiter Assault" } },
      { value: 150, label: { ko: "고속 소행성", en: "Fast Asteroid" }, optionLabel: { ko: "고속 소행성 강습", en: "Fast Asteroid Assault" } },
      { value: 200, label: { ko: "카이퍼 벨트", en: "Kuiper Belt" }, optionLabel: { ko: "카이퍼 벨트 강습", en: "Kuiper Belt Assault" } },
      { value: 500, label: { ko: "고속 카이퍼", en: "Fast Kuiper" }, optionLabel: { ko: "고속 카이퍼 벨트", en: "Fast Kuiper Belt" } },
    ],
  },
];
const MISSION_DV_PRESETS = MISSION_DV_PRESET_GROUPS.flatMap(group => group.presets);

function localizedMissionText(value) {
  return localText(value?.ko || "", value?.en || "");
}

function missionDvOptionLabel(preset) {
  return `${localizedMissionText(preset.optionLabel || preset.label)} - ${preset.value} km/s`;
}

function missionDvStatusText(value = state.targetDvKps) {
  const preset = MISSION_DV_PRESETS.find(item => item.value === Number(value));
  if (!preset) return localText("사용자 지정 목표 dV", "Custom target dV");
  return `${localizedMissionText(preset.optionLabel || preset.label)} · ${preset.value} km/s`;
}

function targetDvPresetValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return MISSION_DV_PRESET_CUSTOM;
  const preset = MISSION_DV_PRESETS.find(item => item.value === numeric);
  return preset ? String(preset.value) : MISSION_DV_PRESET_CUSTOM;
}

function renderMissionDvNativeOptions(select) {
  if (!select) return;
  const selectedValue = select.value || targetDvPresetValue(state.targetDvKps);
  select.innerHTML = "";
  const custom = document.createElement("option");
  custom.value = MISSION_DV_PRESET_CUSTOM;
  custom.textContent = localText("사용자 지정", "Custom");
  select.appendChild(custom);
  MISSION_DV_PRESETS.forEach(preset => {
    const option = document.createElement("option");
    option.value = String(preset.value);
    option.textContent = missionDvOptionLabel(preset);
    select.appendChild(option);
  });
  select.value = [...select.options].some(option => option.value === selectedValue)
    ? selectedValue
    : targetDvPresetValue(state.targetDvKps);
}

function renderMissionDvMenu() {
  const list = document.getElementById("missionDvPresetList");
  const buttonText = document.getElementById("missionDvPresetButtonText");
  const button = document.getElementById("missionDvPresetButton");
  if (buttonText) buttonText.textContent = localText("미션 프리셋", "Mission preset");
  if (button) button.setAttribute("aria-label", localText("임무 dV 프리셋 열기", "Open mission dV preset menu"));
  if (!list) return;
  list.innerHTML = "";

  const custom = document.createElement("button");
  custom.type = "button";
  custom.className = "mission-dv-option mission-dv-custom-option";
  custom.dataset.missionDvValue = MISSION_DV_PRESET_CUSTOM;
  custom.setAttribute("role", "radio");
  custom.innerHTML = `<span class="mission-dv-option-name">${localText("사용자 지정 목표 dV", "Custom target dV")}</span>`;
  list.appendChild(custom);

  MISSION_DV_PRESET_GROUPS.forEach(group => {
    const heading = document.createElement("div");
    heading.className = "mission-dv-group-label";
    heading.textContent = localizedMissionText(group.label);
    list.appendChild(heading);
    group.presets.forEach(preset => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mission-dv-option";
      button.dataset.missionDvValue = String(preset.value);
      button.setAttribute("role", "radio");
      button.innerHTML = [
        `<span class="mission-dv-option-name">${localizedMissionText(preset.label)}</span>`,
        `<span class="mission-dv-option-value">${preset.value}</span>`,
      ].join("");
      list.appendChild(button);
    });
  });
}

export function syncMissionDvPresetControl() {
  const missionDvPreset = document.getElementById("missionDvPreset");
  const selectedValue = targetDvPresetValue(state.targetDvKps);
  renderMissionDvNativeOptions(missionDvPreset);
  renderMissionDvMenu();
  if (missionDvPreset) missionDvPreset.value = selectedValue;
  const status = document.getElementById("missionDvPresetStatus");
  if (status) status.textContent = missionDvStatusText(state.targetDvKps);
  document.querySelectorAll("[data-mission-dv-value]").forEach(button => {
    const isSelected = button.dataset.missionDvValue === selectedValue;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-checked", isSelected ? "true" : "false");
  });
}

function syncTargetDvInputsFromState() {
  const targetDv = document.getElementById("targetDv");
  const targetDvNumber = document.getElementById("targetDvNumber");
  if (targetDv) targetDv.value = String(clamp(state.targetDvKps, Number(targetDv.min), Number(targetDv.max)));
  if (targetDvNumber) targetDvNumber.value = String(Math.round(state.targetDvKps));
  syncMissionDvPresetControl();
}

function setTargetDvKps(value) {
  const numeric = Number(value);
  state.targetDvKps = clamp(Number.isFinite(numeric) ? numeric : 0, 0, 100000);
  syncTargetDvInputsFromState();
}

function applyMissionDvPresetValue(value) {
  if (value === MISSION_DV_PRESET_CUSTOM) {
    syncMissionDvPresetControl();
    return false;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    syncMissionDvPresetControl();
    return false;
  }
  setTargetDvKps(numeric);
  return true;
}

function setupMissionDvPresetControl() {
  const missionDvPreset = document.getElementById("missionDvPreset");
  const menu = document.getElementById("missionDvPresetMenu");
  const list = document.getElementById("missionDvPresetList");
  syncMissionDvPresetControl();
  if (missionDvPreset && !missionDvPreset.dataset.missionDvHandler) {
    missionDvPreset.dataset.missionDvHandler = "true";
    missionDvPreset.addEventListener("change", () => {
      if (applyMissionDvPresetValue(missionDvPreset.value)) render();
    });
  }
  if (list && !list.dataset.missionDvHandler) {
    list.dataset.missionDvHandler = "true";
    list.addEventListener("click", event => {
      const option = event.target.closest("[data-mission-dv-value]");
      if (!option) return;
      event.preventDefault();
      if (menu) menu.open = false;
      if (applyMissionDvPresetValue(option.dataset.missionDvValue)) render();
    });
  }
  if (menu && !menu.dataset.missionDvOutsideClickHandler) {
    menu.dataset.missionDvOutsideClickHandler = "true";
    document.addEventListener("click", event => {
      if (!menu.open || menu.contains(event.target)) return;
      menu.open = false;
    });
    menu.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      menu.open = false;
      document.getElementById("missionDvPresetButton")?.focus();
    });
  }
}

function setupChartFloatingPanels() {
      const panels = Array.from(document.querySelectorAll(".chart-floating-details, #chartGuideDetails"));
      panels.forEach(panel => {
        panel.addEventListener("toggle", () => {
          if (!panel.open) return;
          panels.forEach(other => {
            if (other !== panel) other.open = false;
          });
        });
      });
    }

function setupDetailPanelHeightSync() {
      const plotFrame = document.querySelector(".chart-plot-frame");
      const detailPanel = document.querySelector(".detail-panel");
      if (!plotFrame || !detailPanel) return;

      let scheduled = false;
      const sync = () => {
        scheduled = false;
        const height = plotFrame.getBoundingClientRect().height;
        if (height > 0) {
          detailPanel.style.setProperty("--detail-panel-target-height", `${Math.round(height)}px`);
        }
      };
      const scheduleSync = () => {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(sync);
      };

      sync();
      window.addEventListener("resize", scheduleSync);
      window.addEventListener("load", scheduleSync, { once: true });
      if (typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(scheduleSync);
        observer.observe(plotFrame);
      }
    }

export function setupControls({ setLanguage = () => {}, refreshLocalizedControls = () => {} } = {}) {
      const metric = document.getElementById("metric");
      const thrusters = document.getElementById("thrusters");
      const thrustersNumber = document.getElementById("thrustersNumber");
      const fuelUnitBlock = document.getElementById("chartFuelUnit");
      const dryMass = document.getElementById("dryMass");
      const dryMassNumber = document.getElementById("dryMassNumber");
      const targetDv = document.getElementById("targetDv");
      const targetDvNumber = document.getElementById("targetDvNumber");
      const radiator = document.getElementById("radiator");
      const logX = document.getElementById("logX");
      const logY = document.getElementById("logY");
      const chartLogX = document.getElementById("chartLogX");
      const chartLogY = document.getElementById("chartLogY");
      const showTwrInfo = document.getElementById("showTwrInfo");
      const showMassInfo = document.getElementById("showMassInfo");
      const paretoHighlight = document.getElementById("paretoHighlight");
      const showImpracticalCandidates = document.getElementById("showImpracticalCandidates");
      const moduleEffectsEnabled = document.getElementById("moduleEffectsEnabled");
      const powerResearchViewControl = document.getElementById("powerResearchViewControl");
      const powerResearchViewSelect = document.getElementById("powerResearchView");
      const minTwrExp = document.getElementById("minTwrExp");
      const minTwrNumber = document.getElementById("minTwrNumber");
      const minDv = document.getElementById("minDv");
      const minDvNumber = document.getElementById("minDvNumber");
      const presetExport = document.getElementById("presetExport");
      const presetImport = document.getElementById("presetImport");
      const nameSearch = document.getElementById("nameSearch");

      function chartDomainsMatch(a, b) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== 2 || b.length !== 2) return false;
        const scale = Math.max(Math.abs(b[1] - b[0]), Math.abs(b[0]), Math.abs(b[1]), 1);
        return Math.abs(a[0] - b[0]) <= scale * 1e-9
          && Math.abs(a[1] - b[1]) <= scale * 1e-9;
      }

      function resetChartViewport() {
        state.zoom = null;
        state.zoomContext = "";
        state.preserveViewportOnce = false;
      }

      function preserveCurrentViewportOnlyIfZoomed() {
        if (!chartViewport || !chartViewport.xDomain || !chartViewport.yDomain) {
          resetChartViewport();
          return;
        }
        const isDefaultViewport = chartDomainsMatch(chartViewport.xDomain, chartViewport.baseXDomain)
          && chartDomainsMatch(chartViewport.yDomain, chartViewport.baseYDomain);
        if (isDefaultViewport) {
          resetChartViewport();
          return;
        }
        state.zoom = {
          xDomain: chartViewport.xDomain.slice(),
          yDomain: chartViewport.yDomain.slice(),
        };
        state.zoomContext = "";
        state.preserveViewportOnce = true;
      }

      applyStartupChartPreset();
      const languageSelect = document.getElementById("uiLanguageSelect");
      if (languageSelect) {
        languageSelect.addEventListener("change", () => setLanguage(languageSelect.value));
      }
      applyStaticLanguage();
      setupChartFloatingPanels();
      setupDetailPanelHeightSync();
      setupLeftPanelCards();
      applyHelp(showTwrInfo.closest(".check-row"), helpText("showTwrInfo"));
      applyHelp(showMassInfo.closest(".check-row"), helpText("showMassInfo"));
      applyHelp(paretoHighlight.closest(".check-row"), helpText("paretoHighlight"));
      if (showImpracticalCandidates) applyHelp(showImpracticalCandidates.closest(".check-row"), helpText("showImpracticalCandidates"));
      applyHelp(document.querySelector("#minTwrControl .label"), helpText("minTwr"));
      applyHelp(document.querySelector("#minDvControl .label"), helpText("minDv"));
      const shipEngineCountHelp = document.getElementById("shipEngineCountHelp");
      applyHelp(shipEngineCountHelp, helpText("thrusters"));
      if (shipEngineCountHelp) {
        shipEngineCountHelp.setAttribute("aria-label", localText("엔진 수 도움말", "Engine count help"));
      }

      metric.value = state.metric;
      enhanceSearchableSelect(metric);
      thrusters.value = String(clamp(state.thrusters, Number(thrusters.min), Number(thrusters.max)));
      thrustersNumber.value = String(Math.round(state.thrusters));
      dryMass.value = String(clamp(state.dryMassTons, Number(dryMass.min), Number(dryMass.max)));
      dryMassNumber.value = String(Math.round(state.dryMassTons));
      setupMissionDvPresetControl();
      syncTargetDvInputsFromState();

      tooltip.addEventListener("click", event => {
        const moveButton = event.target.closest(".tooltip-item-move");
        if (moveButton) {
          moveTooltipItemByOffset(
            moveButton.getAttribute("data-tooltip-key"),
            moveButton.getAttribute("data-direction") === "up" ? -1 : 1,
          );
          return;
        }
        const itemClose = event.target.closest(".tooltip-item-close");
        if (itemClose) {
          removeTooltipItem(itemClose.getAttribute("data-tooltip-key"));
          return;
        }
        const itemPin = event.target.closest(".tooltip-item-pin");
        if (itemPin) {
          toggleTooltipItemPin(itemPin.getAttribute("data-tooltip-key"));
          return;
        }
        if (event.target.closest(".tooltip-close")) {
          clearTooltip({ keepPinned: true });
        }
      });

      renderRadiatorOptions(radiator);
      if (!state.radiatorId && DATA.radiators[0]) {
        state.radiatorId = DATA.radiators[0].id;
        radiator.value = state.radiatorId;
      }
      enhanceSearchableSelect(radiator);
      setupPresetLibraryControls();

      DATA.categories.forEach(category => {
        const label = document.createElement("label");
        label.className = "category-row";
        label.dataset.categoryKey = category.key;
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!state.categories[category.key];
        input.addEventListener("change", () => {
          state.categories[category.key] = input.checked;
          syncFilterInputs();
          resetChartViewport();
          render();
        });
        applyHelp(label, localCategoryHelp(category));
        label.tabIndex = 0;
        const swatch = document.createElement("span");
        swatch.className = "family-swatch";
        swatch.setAttribute("style", backgroundStyle(category.color, category.colorOklch || category.color));
        const text = document.createElement("span");
        text.className = "category-name";
        text.textContent = localLabel(category);
        label.append(input, swatch, text);
        categoryRoot.appendChild(label);
      });

      DATA.subfamilies.forEach(family => {
        const label = document.createElement("label");
        label.className = "family-row";
        label.dataset.familyKey = family.key;
        label.dataset.categoryKey = family.categoryKey;
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!state.families[family.key];
        input.addEventListener("change", () => {
          state.families[family.key] = input.checked;
          resetChartViewport();
          render();
        });
        const swatch = document.createElement("span");
        swatch.className = "family-swatch";
        swatch.setAttribute("style", backgroundStyle(family.color, family.colorOklch || family.color));
        const text = document.createElement("span");
        text.className = "family-name";
        text.textContent = localLabel(family);
        const count = document.createElement("span");
        count.className = "family-count";
        count.dataset.familyCount = family.key;
        count.textContent = "0 / 0";
        label.append(input, swatch, text, count);
        familyRoot.appendChild(label);
      });

      metric.addEventListener("change", () => {
        state.metric = metric.value;
        fuelUnitBlock.style.display = state.metric === "fuelEfficiency" ? "" : "none";
        render();
      });
      thrusters.addEventListener("change", () => {
        state.thrusters = Number(thrusters.value);
        thrustersNumber.value = String(state.thrusters);
        render();
      });
      thrusters.addEventListener("input", () => {
        state.thrusters = Number(thrusters.value);
        thrustersNumber.value = String(state.thrusters);
        render();
      });
      thrustersNumber.addEventListener("input", () => {
        const value = Math.round(clamp(Number(thrustersNumber.value) || 1, 1, 6));
        state.thrusters = value;
        thrusters.value = String(value);
        render();
      });
      document.querySelectorAll('input[name="fuelUnit"]').forEach(input => {
        input.addEventListener("change", () => {
          state.fuelEfficiencyUnit = input.value;
          render();
        });
      });
      if (moduleEffectsEnabled) {
        moduleEffectsEnabled.addEventListener("change", () => {
          state.moduleEffectsEnabled = !!moduleEffectsEnabled.checked;
          updateModuleEffectsPanel();
          render();
        });
      }
      document.querySelectorAll("[data-sort]").forEach(button => {
        button.addEventListener("click", () => {
          const key = button.dataset.sort;
          if (state.sortKey === key) {
            state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
          } else {
            state.sortKey = key;
            state.sortDirection = ["drive", "family", "reactor"].includes(key) ? "asc" : "desc";
          }
          renderTable(filteredRows());
          updateSortHeaders();
        });
      });
      dryMass.addEventListener("input", () => {
        state.dryMassTons = Number(dryMass.value);
        dryMassNumber.value = String(Math.round(state.dryMassTons));
        render();
      });
      dryMassNumber.addEventListener("input", () => {
        const raw = Number(dryMassNumber.value);
        const value = clamp(Number.isFinite(raw) ? raw : 0, 0, 1000000);
        state.dryMassTons = value;
        dryMass.value = String(clamp(value, Number(dryMass.min), Number(dryMass.max)));
        render();
      });
      targetDv.addEventListener("input", () => {
        setTargetDvKps(targetDv.value);
        render();
      });
      targetDvNumber.addEventListener("input", () => {
        const raw = Number(targetDvNumber.value);
        const value = clamp(Number.isFinite(raw) ? raw : 0, 0, 100000);
        setTargetDvKps(value);
        render();
      });
      radiator.addEventListener("change", () => {
        state.radiatorId = radiator.value;
        render();
      });
      const setLogX = checked => {
        state.logX = !!checked;
        if (logX) logX.checked = state.logX;
        if (chartLogX) chartLogX.checked = state.logX;
        render();
      };
      const setLogY = checked => {
        state.logY = !!checked;
        if (logY) logY.checked = state.logY;
        if (chartLogY) chartLogY.checked = state.logY;
        render();
      };
      logX?.addEventListener("change", () => setLogX(logX.checked));
      logY?.addEventListener("change", () => setLogY(logY.checked));
      chartLogX?.addEventListener("change", () => setLogX(chartLogX.checked));
      chartLogY?.addEventListener("change", () => setLogY(chartLogY.checked));
      showTwrInfo.addEventListener("change", () => {
        state.showTwrInfo = showTwrInfo.checked;
        render();
      });
      showMassInfo.addEventListener("change", () => {
        state.showMassInfo = showMassInfo.checked;
        render();
      });
      paretoHighlight.addEventListener("change", () => {
        state.paretoHighlight = paretoHighlight.checked;
        render();
      });
      if (showImpracticalCandidates) {
        showImpracticalCandidates?.addEventListener("change", () => {
          state.showImpracticalCandidates = showImpracticalCandidates.checked;
          render();
        });
      }
      if (powerResearchViewSelect) {
        powerResearchViewSelect.value = normalizePowerResearchView(state.powerResearchView);
        powerResearchViewSelect.addEventListener("change", () => {
          preserveCurrentViewportOnlyIfZoomed();
          state.powerResearchView = normalizePowerResearchView(powerResearchViewSelect.value);
          render();
        });
      }
      minTwrExp.addEventListener("input", () => {
        const exponent = Number(minTwrExp.value);
        state.minTwr = Math.pow(10, exponent);
        syncMinTwrInputs();
        render();
      });
      minTwrNumber.addEventListener("input", () => {
        state.minTwr = clamp(Number(minTwrNumber.value) || DEFAULT_MIN_TWR, DEFAULT_MIN_TWR, 10);
        syncMinTwrInputs();
        render();
      });
      minDv.addEventListener("input", () => {
        state.minDvKps = clamp(Number(minDv.value) || 0, 0, 100000);
        syncMinDvInputs();
        render();
      });
      minDvNumber.addEventListener("input", () => {
        state.minDvKps = clamp(Number(minDvNumber.value) || 0, 0, 100000);
        syncMinDvInputs();
        render();
      });
      presetExport.addEventListener("click", async () => {
        openSerializedObjectExport(
          exportedPreset(),
          localText("현재 차트 설정을 클립보드에 복사했습니다.", "Current chart settings copied to clipboard."),
          localText("클립보드 복사에 실패했습니다.", "Failed to copy to clipboard."),
          showPresetStatus,
          localText("현재 차트 설정 내보내기", "Export current chart settings"),
          localText("현재 차트 상태를 JSON 또는 압축 문자열로 내보냅니다.", "Export the current chart state as JSON or a compressed string."),
        );
      });
      presetImport.addEventListener("click", async () => {
        const clip = (await readFromClipboard()).trim();
        const promptText = localText(
          "설정 문자열을 붙여넣으세요 (압축 문자열 지원)",
          "Paste preset string (compressed payload supported)",
        );
        const payload = window.prompt(promptText, clip || "");
        if (payload === null) {
          showPresetStatus(localText("가져오기를 취소했습니다.", "Preset import canceled."));
          return;
        }
        if (!payload.trim()) {
          showPresetStatus(localText("가져올 설정 문자열이 없습니다.", "No preset string to import."), true);
          return;
        }
        try {
          const parsed = await parsePresetPayload(payload);
          const result = await handleImportedPresetObject(parsed, { preferredKind: "chart" });
          showPresetStatus(result.message, !result.ok);
        } catch {
          showPresetStatus(localText("설정 문자열을 해석할 수 없습니다.", "Failed to parse preset payload."), true);
        }
      });
      nameSearch.addEventListener("input", () => {
        state.searchTerm = nameSearch.value.trim().toLocaleLowerCase();
        render();
      });
      document.getElementById("allFamilies").addEventListener("click", () => {
        DATA.subfamilies.forEach(f => {
          if (state.categories[f.categoryKey]) state.families[f.key] = true;
        });
        syncFilterInputs();
        render();
      });
      document.getElementById("clearFamilies").addEventListener("click", () => {
        DATA.subfamilies.forEach(f => {
          if (state.categories[f.categoryKey]) state.families[f.key] = false;
        });
        syncFilterInputs();
        render();
      });
      setupDryMassCalculator({ render });
      refreshSourceNote();
      refreshLocalizedControls();
      syncFilterInputs();
      setupChartInteraction();
      updateChartControls();
      updateSortHeaders();
    }

export function refreshSourceNote() {
      const gameVersionParts = [
        `${localText("게임 버전", "Game version")}: ${DATA.source.gameVersion || "unknown"}`,
      ];
      if (DATA.source.steamBuildId) gameVersionParts.push(`Steam build ${DATA.source.steamBuildId}`);
      document.getElementById("sourceNote").textContent = `${localText("소스", "Source")}: ${DATA.source.driveTemplate}; ${DATA.source.radiatorTemplate}; ${DATA.source.shipCatalog}; ${gameVersionParts.join("; ")}`;
    }

export function setupChartInteraction() {
      const resetZoom = document.getElementById("resetZoom");
      resetZoom.addEventListener("click", () => {
        state.zoom = null;
        state.zoomContext = "";
        redrawChartOnly();
      });
      chart.addEventListener("wheel", handleChartWheel, { passive: false });
      chart.addEventListener("pointerdown", handleChartPointerDown);
      chart.addEventListener("pointermove", handleChartPointerMove);
      chart.addEventListener("pointerup", endChartPan);
      chart.addEventListener("pointercancel", endChartPan);
      chart.addEventListener("pointerleave", handleChartPointerLeave);
      chart.addEventListener("dblclick", event => {
        event.preventDefault();
        state.zoom = null;
        state.zoomContext = "";
        redrawChartOnly();
      });
      document.addEventListener("keydown", handleChartKeyDown);
    }
