import { syncFilterInputs } from "../calc/filtering.js";
import { clamp } from "../shared/math.js";
import { DATA, UI_LANG, localText, metricDefs, normalizePowerResearchView, state } from "../state/core.js";
import { enhanceSearchableSelect } from "../ui/searchable_select.js";
import { presetRuntimeApi } from "./runtime.js";
import {
  applyHelp,
  cloneJson,
  dedupePresetEntries,
  dryMassPresetDisplayName,
  helpText,
  localCategoryHelp,
  localLabel,
  presetEntryOptionLabel,
  presetTimestamp,
  sanitizePresetName,
  uniquePresetId,
  uniquePresetName,
} from "./common.js";
import {
  allChartPresetEntries,
  allDryMassPresetEntries,
  builtInChartPresetLibrary,
  builtInDryMassPresetLibrary,
  chartPresetDesignLibrarySnapshot,
  chartPresetExportObject,
  chartPresetLibrary,
  chartPresetLibraryExportObject,
  dryMassPresetExportObject,
  dryMassPresetLibrary,
  dryMassPresetLibraryExportObject,
  firstChartPresetEntry,
  firstDryMassPresetEntry,
  normalizeChartPresetEntry,
  normalizeDryMassPresetEntry,
  restoreDesignPresetLibrarySnapshot,
  saveChartPresetLibrary,
  saveDryMassPresetLibrary,
  setChartPresetLibrary,
  setDryMassPresetLibrary,
  setStartupChartPreset,
  startupChartPresetId,
} from "./repository.js";
import {
  copyToClipboard,
  formatExportPayloadObject,
  parsePresetPayload,
  readFromClipboard,
  serializePayloadObject,
} from "./codec.js";

export { registerPresetRuntimeApi } from "./runtime.js";
export {
  applyHelp,
  cloneJson,
  dedupePresetEntries,
  dryMassPresetDisplayName,
  helpText,
  localCategoryHelp,
  localLabel,
  presetEntryOptionLabel,
  presetTimestamp,
  sanitizePresetName,
  uniquePresetId,
  uniquePresetName,
} from "./common.js";
export {
  allChartPresetEntries,
  allDryMassPresetEntries,
  builtInChartPresetLibrary,
  builtInDryMassPresetLibrary,
  chartPresetDesignLibrarySnapshot,
  chartPresetExportObject,
  chartPresetLibrary,
  chartPresetLibraryExportObject,
  dryMassPresetExportObject,
  dryMassPresetLibrary,
  dryMassPresetLibraryExportObject,
  firstChartPresetEntry,
  firstDryMassPresetEntry,
  loadBuiltInChartPresetLibrary,
  loadBuiltInDryMassPresetLibrary,
  loadChartPresetLibrary,
  loadDryMassPresetLibrary,
  loadStartupChartPresetId,
  normalizeBuiltInChartPresetEntry,
  normalizeBuiltInDryMassPresetEntry,
  normalizeChartPresetEntry,
  normalizeDryMassPresetEntry,
  presetLibraryData,
  restoreDesignPresetLibrarySnapshot,
  saveChartPresetLibrary,
  saveDryMassPresetLibrary,
  setChartPresetLibrary,
  setDryMassPresetLibrary,
  setStartupChartPreset,
  startupChartPresetId,
} from "./repository.js";
export {
  base64ToBytes,
  bytesToBase64,
  copyToClipboard,
  formatExportPayloadObject,
  gzipBytes,
  gunzipBytes,
  parsePresetPayload,
  readFromClipboard,
  serializePayloadObject,
} from "./codec.js";
export function selectedChartPresetEntry() {
      const select = document.getElementById("chartPresetSelect");
      return allChartPresetEntries().find(item => item.id === (select && select.value)) || null;
    }

export function selectedDryMassPresetEntry() {
      const select = document.getElementById("dryMassPresetSelect");
      return allDryMassPresetEntries().find(item => item.id === (select && select.value)) || null;
    }


export function applyChartPresetEntry(entry, { showStatus = true } = {}) {
      if (!entry) return false;
      if (!applyPresetToState(entry.settings)) {
        if (showStatus) showPresetStatus(localText("프리셋을 적용하지 못했습니다.", "Failed to apply preset."), true);
        return false;
      }
      syncUiFromState();
      renderChartPresetControls(entry.id);
      if (showStatus) showPresetStatus(localText(`“${entry.name}” 차트 프리셋을 적용했습니다.`, `Applied chart preset “${entry.name}”.`));
      return true;
    }

export function applySelectedChartPreset(options = {}) {
      return applyChartPresetEntry(selectedChartPresetEntry(), options);
    }

export function applyDryMassPresetEntry(entry, { showStatus = true } = {}) {
      if (!entry) return false;
      if (!presetRuntimeApi.applyDryMassCalculatorPreset(entry.calculator)) {
        if (showStatus) showDryMassPresetStatus(localText("프리셋을 적용하지 못했습니다.", "Failed to apply preset."), true);
        return false;
      }
      presetRuntimeApi.renderDryMassCalcModal();
      if (showStatus) showDryMassPresetStatus(localText(`“${entry.name}” 설계 프리셋을 적용했습니다. 적용 버튼으로 차트에 반영하세요.`, `Applied design preset “${entry.name}”. Use an apply button to update the chart.`));
      return true;
    }

export function applySelectedDryMassPreset(options = {}) {
      return applyDryMassPresetEntry(selectedDryMassPresetEntry(), options);
    }

export function applyStartupChartPreset() {
      let entry = startupChartPresetId
        ? allChartPresetEntries().find(item => item.id === startupChartPresetId)
        : null;
      if (startupChartPresetId && !entry) setStartupChartPreset("");
      entry = entry || firstChartPresetEntry();
      return !!entry && applyPresetToState(entry.settings);
    }

export function setDisabled(id, disabled) {
      const button = document.getElementById(id);
      if (button) button.disabled = !!disabled;
    }


export function appendPresetOptionGroup(select, label, entries, startupId = "", labelFn = item => item.name) {
      if (!entries.length) return;
      const group = document.createElement("optgroup");
      group.label = label;
      entries.forEach(entry => {
        const option = document.createElement("option");
        option.value = entry.id;
        option.textContent = presetEntryOptionLabel(entry, startupId, labelFn);
        group.appendChild(option);
      });
      select.appendChild(group);
    }

export function renderChartPresetControls(preferredId = "") {
      const select = document.getElementById("chartPresetSelect");
      if (!select) return;
      const allEntries = allChartPresetEntries();
      const selectedId = preferredId || select.value || startupChartPresetId || (allEntries[0] && allEntries[0].id) || "";
      const hasPresets = allEntries.length > 0;
      if (startupChartPresetId && !allEntries.some(item => item.id === startupChartPresetId)) {
        setStartupChartPreset("");
      }
      select.innerHTML = "";
      if (!hasPresets) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = localText("차트 프리셋 없음", "No chart presets");
        select.appendChild(option);
      } else {
        appendPresetOptionGroup(select, localText("예시 프리셋", "Example presets"), builtInChartPresetLibrary, startupChartPresetId);
        appendPresetOptionGroup(select, localText("내 프리셋", "My presets"), chartPresetLibrary, startupChartPresetId);
        select.value = allEntries.some(item => item.id === selectedId)
          ? selectedId
          : allEntries[0].id;
      }
      select.disabled = !hasPresets;
      const entry = selectedChartPresetEntry();
      [
        "chartPresetSetStartup",
      ].forEach(id => setDisabled(id, !hasPresets));
      setDisabled("chartPresetSave", false);
      ["chartPresetRename", "chartPresetDelete"].forEach(id => setDisabled(id, !entry || !!entry.builtIn));
      setDisabled("chartPresetClearStartup", !startupChartPresetId);
    }

export function renderDryMassPresetControls(preferredId = "") {
      const select = document.getElementById("dryMassPresetSelect");
      if (!select) return;
      const allEntries = allDryMassPresetEntries();
      const selectedId = preferredId || select.value || (allEntries[0] && allEntries[0].id) || "";
      const hasPresets = allEntries.length > 0;
      select.innerHTML = "";
      if (!hasPresets) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = localText("설계 프리셋 없음", "No design presets");
        select.appendChild(option);
      } else {
        appendPresetOptionGroup(select, localText("예시 프리셋", "Example presets"), builtInDryMassPresetLibrary);
        appendPresetOptionGroup(select, localText("내 프리셋", "My presets"), dryMassPresetLibrary);
        const entriesById = new Map(allEntries.map(entry => [entry.id, entry]));
        const locale = UI_LANG === "en" ? "en" : "ko-KR";
        Array.from(select.querySelectorAll("option")).forEach(option => {
          const entry = entriesById.get(option.value);
          if (entry) option.textContent = dryMassPresetDisplayName(entry);
        });
        Array.from(select.querySelectorAll("optgroup")).forEach(group => {
          Array.from(group.children)
            .map((option, index) => ({ option, index }))
            .sort((left, right) => {
              const nameCompare = left.option.textContent.localeCompare(right.option.textContent, locale, {
                numeric: true,
                sensitivity: "base",
              });
              return nameCompare || left.index - right.index;
            })
            .forEach(item => group.appendChild(item.option));
        });
        select.value = allEntries.some(item => item.id === selectedId)
          ? selectedId
          : allEntries[0].id;
      }
      select.disabled = !hasPresets;
      const entry = selectedDryMassPresetEntry();
      setDisabled("dryMassPresetSave", false);
      setDisabled("dryMassPresetSaveAsNew", false);
      ["dryMassPresetRename", "dryMassPresetDelete"].forEach(id => setDisabled(id, !entry || !!entry.builtIn));
      enhanceSearchableSelect(select);
    }

export function renderPresetLibraryControls() {
      renderChartPresetControls();
      renderDryMassPresetControls();
    }

export function promptPresetName(message, defaultName, statusFn) {
      const name = window.prompt(message, defaultName || "");
      if (name === null) return null;
      const clean = sanitizePresetName(name, "");
      if (!clean) {
        statusFn(localText("프리셋 이름이 필요합니다.", "Preset name is required."), true);
        return null;
      }
      return clean;
    }

export function saveChartPresetFromSettings(name, settings, existingId = "") {
      const now = presetTimestamp();
      const existing = chartPresetLibrary.find(item => item.id === existingId);
      const entry = {
        id: existing ? existing.id : uniquePresetId("chart"),
        name: uniquePresetName(name, chartPresetLibrary, existing ? existing.id : ""),
        settings: cloneJson(settings),
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      };
      if (existing) {
        setChartPresetLibrary(chartPresetLibrary.map(item => item.id === existing.id ? entry : item));
      } else {
        setChartPresetLibrary([...chartPresetLibrary, entry]);
      }
      if (!saveChartPresetLibrary()) return null;
      renderChartPresetControls(entry.id);
      return entry;
    }

export function saveDryMassPresetFromCalculator(name, calculator, existingId = "") {
      const now = presetTimestamp();
      const existing = dryMassPresetLibrary.find(item => item.id === existingId);
      const entry = {
        id: existing ? existing.id : uniquePresetId("design"),
        name: uniquePresetName(name, dryMassPresetLibrary, existing ? existing.id : ""),
        calculator: cloneJson(calculator),
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      };
      if (existing && existing.displayName && typeof existing.displayName === "object" && name === existing.name) {
        entry.displayName = cloneJson(existing.displayName);
      }
      if (existing) {
        setDryMassPresetLibrary(dryMassPresetLibrary.map(item => item.id === existing.id ? entry : item));
      } else {
        setDryMassPresetLibrary([...dryMassPresetLibrary, entry]);
      }
      if (!saveDryMassPresetLibrary()) return null;
      renderDryMassPresetControls(entry.id);
      return entry;
    }

export function mergeChartPresetEntries(entries) {
      let changed = 0;
      entries.map((entry, index) => normalizeChartPresetEntry(entry, `Imported chart preset ${index + 1}`))
        .filter(Boolean)
        .forEach(entry => {
          const usedIds = new Set(allChartPresetEntries().map(item => item.id));
          const imported = { ...entry, builtIn: false };
          if (usedIds.has(imported.id)) imported.id = uniquePresetId("chart");
          imported.name = uniquePresetName(imported.name, chartPresetLibrary);
          chartPresetLibrary.push(imported);
          changed += 1;
        });
      if (!changed) return 0;
      saveChartPresetLibrary();
      renderChartPresetControls();
      return changed;
    }

export function mergeDryMassPresetEntriesDetailed(entries) {
      let changed = 0;
      let firstImportedId = "";
      entries.map((entry, index) => normalizeDryMassPresetEntry(entry, `Imported design preset ${index + 1}`))
        .filter(Boolean)
        .forEach(entry => {
          const usedIds = new Set(allDryMassPresetEntries().map(item => item.id));
          const imported = { ...entry, builtIn: false };
          if (usedIds.has(imported.id)) imported.id = uniquePresetId("design");
          imported.name = uniquePresetName(imported.name, dryMassPresetLibrary);
          dryMassPresetLibrary.push(imported);
          if (!firstImportedId) firstImportedId = imported.id;
          changed += 1;
        });
      if (!changed) return { count: 0, firstImportedId: "" };
      saveDryMassPresetLibrary();
      renderDryMassPresetControls(firstImportedId);
      return { count: changed, firstImportedId };
    }

export function mergeDryMassPresetEntries(entries) {
      return mergeDryMassPresetEntriesDetailed(entries).count;
    }

export function extractChartSettingsFromImport(raw) {
      if (!raw || typeof raw !== "object") return null;
      if (raw.format === "ti-engine-chart-named-preset/v1" && raw.settings && typeof raw.settings === "object") {
        return raw.settings;
      }
      if (raw.settings && typeof raw.settings === "object") {
        return raw.settings;
      }
      const hasChartField = [
        "metric",
        "thrusters",
        "dryMassTons",
        "targetDvKps",
        "radiatorId",
        "categories",
        "families",
        "dryMassCalculator",
        "dryMassCalc",
      ].some(key => Object.prototype.hasOwnProperty.call(raw, key));
      return hasChartField ? raw : null;
    }

export function extractDryMassCalculatorFromImport(raw) {
      if (!raw || typeof raw !== "object") return null;
      if ((raw.format === "ti-engine-chart-dry-mass-preset/v1" || raw.format === "ti-engine-chart-design-preset/v1") && raw.calculator && typeof raw.calculator === "object") {
        return raw.calculator;
      }
      if (raw.format === "ti-engine-chart-design-preset/v1" && raw.dryMassDesign && typeof raw.dryMassDesign === "object") {
        const calculator = cloneJson(raw.dryMassDesign);
        if (raw.simulationDefaults && typeof raw.simulationDefaults === "object") calculator.simulationDefaults = cloneJson(raw.simulationDefaults);
        return calculator;
      }
      const calculator = raw.calculator || raw.dryMassDesign || raw.design || raw.dryMassCalculator || raw.dryMassCalc;
      if (calculator && typeof calculator === "object") return calculator;
      const hasCalculatorField = ["classId", "slotModules", "weaponModules", "armor", "notes", "simulationDefaults"]
        .some(key => Object.prototype.hasOwnProperty.call(raw, key));
      return hasCalculatorField ? raw : null;
    }

export async function handleImportedPresetObject(raw, { preferredKind = "chart", promptToSaveCurrent = true } = {}) {
      if (!raw || typeof raw !== "object") {
        return { ok: false, message: localText("설정 형식을 인식하지 못했습니다.", "Unrecognized preset format.") };
      }

      if (raw.format === "ti-engine-chart-preset-library/v1" && Array.isArray(raw.presets)) {
        const count = mergeChartPresetEntries(raw.presets);
        if (typeof raw.startupPresetId === "string" && allChartPresetEntries().some(item => item.id === raw.startupPresetId)) {
          setStartupChartPreset(raw.startupPresetId);
          renderChartPresetControls(raw.startupPresetId);
        }
        if (count > 0) applySelectedChartPreset({ showStatus: false });
        return { ok: count > 0, message: count > 0
          ? localText(`차트 프리셋 ${count}개를 가져왔습니다.`, `Imported ${count} chart presets.`)
          : localText("가져올 차트 프리셋이 없습니다.", "No chart presets to import.") };
      }

      if ((raw.format === "ti-engine-chart-dry-mass-preset-library/v1" || raw.format === "ti-engine-chart-design-preset-library/v1") && Array.isArray(raw.presets)) {
        const result = mergeDryMassPresetEntriesDetailed(raw.presets);
        const count = result.count;
        if (count > 0) {
          const importedEntry = allDryMassPresetEntries().find(item => item.id === result.firstImportedId);
          applyDryMassPresetEntry(importedEntry, { showStatus: false });
        }
        return { ok: count > 0, message: count > 0
          ? localText(`설계 프리셋 ${count}개를 가져왔습니다.`, `Imported ${count} design presets.`)
          : localText("가져올 설계 프리셋이 없습니다.", "No design presets to import.") };
      }

      if (raw.format === "ti-engine-chart-named-preset/v1") {
        const entry = normalizeChartPresetEntry(raw, raw.name || "Imported chart preset");
        const count = entry ? mergeChartPresetEntries([entry]) : 0;
        if (count > 0) applySelectedChartPreset({ showStatus: false });
        return { ok: count > 0, message: count > 0
          ? localText("차트 프리셋을 라이브러리에 추가했습니다.", "Chart preset added to the library.")
          : localText("차트 프리셋을 가져오지 못했습니다.", "Failed to import chart preset.") };
      }

      if (raw.format === "ti-engine-chart-dry-mass-preset/v1" || raw.format === "ti-engine-chart-design-preset/v1") {
        const entry = normalizeDryMassPresetEntry(raw, raw.name || "Imported design preset");
        const result = entry ? mergeDryMassPresetEntriesDetailed([entry]) : { count: 0, firstImportedId: "" };
        const count = result.count;
        if (count > 0) {
          const importedEntry = allDryMassPresetEntries().find(item => item.id === result.firstImportedId);
          applyDryMassPresetEntry(importedEntry, { showStatus: false });
        }
        return { ok: count > 0, message: count > 0
          ? localText("설계 프리셋을 라이브러리에 추가했습니다.", "Design preset added to the library.")
          : localText("설계 프리셋을 가져오지 못했습니다.", "Failed to import design preset.") };
      }

      if (preferredKind === "dryMass") {
        const calculator = extractDryMassCalculatorFromImport(raw);
        if (calculator && presetRuntimeApi.applyDryMassCalculatorPreset(calculator)) {
          presetRuntimeApi.renderDryMassCalcModal();
          if (promptToSaveCurrent && window.confirm(localText("가져온 계산기 설정을 이름 있는 프리셋으로 저장할까요?", "Save imported calculator settings as a named preset?"))) {
            const name = promptPresetName(
              localText("설계 프리셋 이름", "Design preset name"),
              raw.name || localText("가져온 설계 프리셋", "Imported design preset"),
              showDryMassPresetStatus,
            );
            if (name) saveDryMassPresetFromCalculator(name, presetRuntimeApi.exportedDryMassCalculatorPreset());
          }
          return { ok: true, message: localText("설계 설정을 불러왔습니다.", "Design settings imported.") };
        }
      }

      const chartSettings = extractChartSettingsFromImport(raw);
      if (chartSettings && applyPresetToState(chartSettings)) {
        syncUiFromState();
        if (promptToSaveCurrent && window.confirm(localText("가져온 설정을 이름 있는 차트 프리셋으로 저장할까요?", "Save imported settings as a named chart preset?"))) {
          const name = promptPresetName(
            localText("차트 프리셋 이름", "Chart preset name"),
            raw.name || localText("가져온 차트 프리셋", "Imported chart preset"),
            showPresetStatus,
          );
          if (name) saveChartPresetFromSettings(name, exportedPreset());
        }
        return { ok: true, message: localText("설정을 불러왔습니다.", "Preset imported.") };
      }

      const calculator = extractDryMassCalculatorFromImport(raw);
      if (calculator && presetRuntimeApi.applyDryMassCalculatorPreset(calculator)) {
        presetRuntimeApi.renderDryMassCalcModal();
        return { ok: true, message: localText("설계 설정을 불러왔습니다.", "Design settings imported.") };
      }

      return { ok: false, message: localText("설정 형식을 인식하지 못했습니다.", "Unrecognized preset format.") };
    }


export let presetExportModalState = null;


export function selectedExportFormat() {
      const selected = document.querySelector('input[name="presetExportFormat"]:checked');
      return selected && selected.value === "json" ? "json" : "compressed";
    }

export async function refreshPresetExportOutput() {
      const output = document.getElementById("presetExportOutput");
      const status = document.getElementById("presetExportStatus");
      if (!output || !presetExportModalState) return;
      try {
        output.value = await formatExportPayloadObject(presetExportModalState.object, selectedExportFormat());
        if (status) {
          status.textContent = localText("출력 형식을 선택한 뒤 복사할 수 있습니다.", "Choose a format, then copy it to the clipboard.");
          status.classList.remove("error");
        }
      } catch {
        output.value = "";
        if (status) {
          status.textContent = presetExportModalState.failureText;
          status.classList.add("error");
        }
      }
    }

export function openPresetExportModal({ object, title, description, successText, failureText, statusFn = showPresetStatus }) {
      const modal = document.getElementById("presetExportModal");
      const titleElement = document.getElementById("presetExportTitle");
      const descriptionElement = document.getElementById("presetExportDescription");
      const compressed = document.querySelector('input[name="presetExportFormat"][value="compressed"]');
      if (!modal) return;
      presetExportModalState = { object, successText, failureText, statusFn };
      if (titleElement) titleElement.textContent = title || localText("프리셋 내보내기", "Export preset");
      if (descriptionElement) descriptionElement.textContent = description || localText("출력 형식을 선택하고 클립보드에 복사하세요.", "Choose an output format and copy it to the clipboard.");
      if (compressed) compressed.checked = true;
      modal.classList.add("is-open");
      refreshPresetExportOutput();
      document.getElementById("presetExportCopy")?.focus();
    }

export function closePresetExportModal() {
      const modal = document.getElementById("presetExportModal");
      if (modal) modal.classList.remove("is-open");
      presetExportModalState = null;
    }

export async function copyPresetExportOutput() {
      const output = document.getElementById("presetExportOutput");
      const status = document.getElementById("presetExportStatus");
      if (!output || !presetExportModalState) return;
      try {
        if (!output.value) output.value = await formatExportPayloadObject(presetExportModalState.object, selectedExportFormat());
        const copied = await copyToClipboard(output.value);
        const message = copied ? presetExportModalState.successText : presetExportModalState.failureText;
        if (status) {
          status.textContent = message;
          status.classList.toggle("error", !copied);
        }
        presetExportModalState.statusFn(message, !copied);
      } catch {
        if (status) {
          status.textContent = presetExportModalState.failureText;
          status.classList.add("error");
        }
        presetExportModalState.statusFn(presetExportModalState.failureText, true);
      }
    }

export function openSerializedObjectExport(object, successText, failureText, statusFn = showPresetStatus, title = "", description = "") {
      openPresetExportModal({ object, title, description, successText, failureText, statusFn });
    }

export function setupPresetExportModal() {
      const modal = document.getElementById("presetExportModal");
      document.getElementById("presetExportClose")?.addEventListener("click", closePresetExportModal);
      document.getElementById("presetExportCopy")?.addEventListener("click", copyPresetExportOutput);
      document.querySelectorAll('input[name="presetExportFormat"]').forEach(input => {
        input.addEventListener("change", refreshPresetExportOutput);
      });
      modal?.addEventListener("click", event => {
        if (event.target === modal) closePresetExportModal();
      });
      modal?.addEventListener("keydown", event => {
        if (event.key === "Escape") closePresetExportModal();
      });
    }

export function setupPresetLibraryControls() {
      setupPresetExportModal();
      if (!document.body.dataset.presetActionsOutsideClickHandler) {
        document.body.dataset.presetActionsOutsideClickHandler = "true";
        document.addEventListener("click", event => {
          if (event.target.closest(".preset-actions-menu")) return;
          document.querySelectorAll(".preset-actions-menu[open]").forEach(menu => {
            menu.open = false;
          });
        });
      }
      renderChartPresetControls();
      document.getElementById("chartPresetSelect")?.addEventListener("change", event => {
        renderChartPresetControls(event.target.value);
        applySelectedChartPreset();
      });
      document.getElementById("chartPresetSave")?.addEventListener("click", () => {
        const entry = selectedChartPresetEntry();
        const existingId = entry && !entry.builtIn ? entry.id : "";
        const name = promptPresetName(
          localText("차트 프리셋 이름", "Chart preset name"),
          entry ? (entry.builtIn ? `${entry.name} copy` : entry.name) : "",
          showPresetStatus,
        );
        if (!name) return;
        const saved = saveChartPresetFromSettings(name, exportedPreset(), existingId);
        showPresetStatus(saved
          ? localText("차트 프리셋을 저장했습니다.", "Chart preset saved.")
          : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      });
      document.getElementById("chartPresetRename")?.addEventListener("click", () => {
        const entry = selectedChartPresetEntry();
        if (!entry) return;
        if (entry.builtIn) return showPresetStatus(localText("예시 프리셋은 이름을 변경할 수 없습니다.", "Example presets cannot be renamed."), true);
        const name = promptPresetName(localText("새 차트 프리셋 이름", "New chart preset name"), entry.name, showPresetStatus);
        if (!name) return;
        entry.name = uniquePresetName(name, chartPresetLibrary, entry.id);
        entry.updatedAt = presetTimestamp();
        const saved = saveChartPresetLibrary();
        renderChartPresetControls(entry.id);
        showPresetStatus(saved ? localText("프리셋 이름을 변경했습니다.", "Preset renamed.") : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      });
      document.getElementById("chartPresetDelete")?.addEventListener("click", () => {
        const entry = selectedChartPresetEntry();
        if (entry && entry.builtIn) return showPresetStatus(localText("예시 프리셋은 삭제할 수 없습니다.", "Example presets cannot be deleted."), true);
        if (!entry || !window.confirm(localText("선택한 차트 프리셋을 삭제할까요?", "Delete the selected chart preset?"))) return;
        setChartPresetLibrary(chartPresetLibrary.filter(item => item.id !== entry.id));
        if (startupChartPresetId === entry.id) setStartupChartPreset("");
        const saved = saveChartPresetLibrary();
        renderChartPresetControls();
        if (saved) applySelectedChartPreset({ showStatus: false });
        showPresetStatus(saved ? localText("차트 프리셋을 삭제했습니다.", "Chart preset deleted.") : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      });
      document.getElementById("chartPresetSetStartup")?.addEventListener("click", () => {
        const entry = selectedChartPresetEntry();
        if (!entry) return;
        const saved = setStartupChartPreset(entry.id);
        renderChartPresetControls(entry.id);
        showPresetStatus(saved ? localText("기본 프리셋을 설정했습니다.", "Default preset set.") : localText("기본 프리셋 저장에 실패했습니다.", "Failed to save default preset."), !saved);
      });
      document.getElementById("chartPresetClearStartup")?.addEventListener("click", () => {
        const saved = setStartupChartPreset("");
        renderChartPresetControls();
        showPresetStatus(saved ? localText("기본 프리셋을 해제했습니다.", "Default preset cleared.") : localText("기본 프리셋 저장에 실패했습니다.", "Failed to save default preset."), !saved);
      });
      document.getElementById("chartPresetExportSelected")?.addEventListener("click", async () => {
        const entry = selectedChartPresetEntry();
        if (!entry) return showPresetStatus(localText("내보낼 차트 프리셋이 없습니다.", "No chart preset selected."), true);
        openSerializedObjectExport(
          chartPresetExportObject(entry),
          localText("선택한 차트 프리셋을 클립보드에 복사했습니다.", "Selected chart preset copied to clipboard."),
          localText("클립보드 복사에 실패했습니다.", "Failed to copy to clipboard."),
          showPresetStatus,
          localText("차트 프리셋 내보내기", "Export chart preset"),
          localText("선택한 차트 프리셋 1개를 JSON 또는 압축 문자열로 내보냅니다.", "Export the selected chart preset as JSON or a compressed string."),
        );
      });
      document.getElementById("chartPresetExportAll")?.addEventListener("click", async () => {
        if (!chartPresetLibrary.length) return showPresetStatus(localText("내보낼 차트 프리셋이 없습니다.", "No chart presets to export."), true);
        openSerializedObjectExport(
          chartPresetLibraryExportObject(),
          localText("차트 프리셋 라이브러리를 클립보드에 복사했습니다.", "Chart preset library copied to clipboard."),
          localText("클립보드 복사에 실패했습니다.", "Failed to copy to clipboard."),
          showPresetStatus,
          localText("전체 차트 프리셋 내보내기", "Export all chart presets"),
          localText("사용자가 저장한 차트 프리셋 전체를 JSON 또는 압축 문자열로 내보냅니다.", "Export all saved user chart presets as JSON or a compressed string."),
        );
      });
    }

export function saveCurrentDryMassPresetAsNew(defaultName = "") {
      const name = promptPresetName(
        localText("설계 프리셋 이름", "Design preset name"),
        defaultName,
        showDryMassPresetStatus,
      );
      if (!name) return null;
      const saved = saveDryMassPresetFromCalculator(name, presetRuntimeApi.exportedDryMassCalculatorPreset());
      showDryMassPresetStatus(saved
        ? localText("설계 프리셋을 새 이름으로 저장했습니다.", "Design preset saved as new.")
        : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      return saved;
    }

export function saveCurrentDryMassPreset() {
      const entry = selectedDryMassPresetEntry();
      if (!entry || entry.builtIn) {
        return saveCurrentDryMassPresetAsNew(entry ? `${dryMassPresetDisplayName(entry)} copy` : "");
      }
      const saved = saveDryMassPresetFromCalculator(entry.name, presetRuntimeApi.exportedDryMassCalculatorPreset(), entry.id);
      showDryMassPresetStatus(saved
        ? localText("설계 프리셋을 저장했습니다.", "Design preset saved.")
        : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      return saved;
    }

export function setupDryMassPresetControls() {
      renderDryMassPresetControls();
      applySelectedDryMassPreset({ showStatus: false });
      document.getElementById("dryMassPresetSelect")?.addEventListener("change", event => {
        renderDryMassPresetControls(event.target.value);
        applySelectedDryMassPreset();
      });
      document.getElementById("dryMassPresetSave")?.addEventListener("click", () => {
        saveCurrentDryMassPreset();
      });
      document.getElementById("dryMassPresetSaveAsNew")?.addEventListener("click", () => {
        const entry = selectedDryMassPresetEntry();
        saveCurrentDryMassPresetAsNew(entry ? `${dryMassPresetDisplayName(entry)} copy` : "");
      });
      document.getElementById("dryMassPresetRename")?.addEventListener("click", () => {
        const entry = selectedDryMassPresetEntry();
        if (!entry) return;
        if (entry.builtIn) return showDryMassPresetStatus(localText("예시 프리셋은 이름을 변경할 수 없습니다.", "Example presets cannot be renamed."), true);
        const name = promptPresetName(localText("새 설계 프리셋 이름", "New design preset name"), entry.name, showDryMassPresetStatus);
        if (!name) return;
        entry.name = uniquePresetName(name, dryMassPresetLibrary, entry.id);
        delete entry.displayName;
        entry.updatedAt = presetTimestamp();
        const saved = saveDryMassPresetLibrary();
        renderDryMassPresetControls(entry.id);
        showDryMassPresetStatus(saved ? localText("프리셋 이름을 변경했습니다.", "Preset renamed.") : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      });
      document.getElementById("dryMassPresetDelete")?.addEventListener("click", () => {
        const entry = selectedDryMassPresetEntry();
        if (entry && entry.builtIn) return showDryMassPresetStatus(localText("예시 프리셋은 삭제할 수 없습니다.", "Example presets cannot be deleted."), true);
        if (!entry || !window.confirm(localText("선택한 설계 프리셋을 삭제할까요?", "Delete the selected design preset?"))) return;
        setDryMassPresetLibrary(dryMassPresetLibrary.filter(item => item.id !== entry.id));
        const saved = saveDryMassPresetLibrary();
        renderDryMassPresetControls();
        if (saved) applySelectedDryMassPreset({ showStatus: false });
        showDryMassPresetStatus(saved ? localText("설계 프리셋을 삭제했습니다.", "Design preset deleted.") : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      });
      document.getElementById("dryMassPresetExportSelected")?.addEventListener("click", async () => {
        openSerializedObjectExport(
          dryMassPresetExportObject({
            id: uniquePresetId("design-export"),
            name: localText("현재 설계", "Current design"),
            calculator: presetRuntimeApi.exportedDryMassCalculatorPreset(),
            createdAt: presetTimestamp(),
            updatedAt: presetTimestamp(),
          }),
          localText("현재 설계를 클립보드에 복사했습니다.", "Current design copied to clipboard."),
          localText("클립보드 복사에 실패했습니다.", "Failed to copy to clipboard."),
          showDryMassPresetStatus,
          localText("현재 설계 설정 내보내기", "Export current design settings"),
          localText("현재 계산기 화면의 설정을 JSON 또는 압축 문자열로 내보냅니다.", "Export the current calculator settings as JSON or a compressed string."),
        );
      });
      document.getElementById("dryMassPresetExportAll")?.addEventListener("click", async () => {
        if (!dryMassPresetLibrary.length) return showDryMassPresetStatus(localText("내보낼 설계 프리셋이 없습니다.", "No design presets to export."), true);
        openSerializedObjectExport(
          dryMassPresetLibraryExportObject(),
          localText("설계 프리셋 라이브러리를 클립보드에 복사했습니다.", "Design preset library copied to clipboard."),
          localText("클립보드 복사에 실패했습니다.", "Failed to copy to clipboard."),
          showDryMassPresetStatus,
          localText("전체 설계 프리셋 내보내기", "Export all design presets"),
          localText("사용자가 저장한 설계 프리셋 전체를 JSON 또는 압축 문자열로 내보냅니다.", "Export all saved user design presets as JSON or a compressed string."),
        );
      });
      document.getElementById("dryMassPresetImport")?.addEventListener("click", async () => {
        const clip = (await readFromClipboard()).trim();
        const payload = window.prompt(localText("설계 프리셋 문자열을 붙여넣으세요", "Paste design preset string"), clip || "");
        if (payload === null) return showDryMassPresetStatus(localText("가져오기를 취소했습니다.", "Preset import canceled."));
        if (!payload.trim()) return showDryMassPresetStatus(localText("가져올 설정 문자열이 없습니다.", "No preset string to import."), true);
        try {
          const result = await handleImportedPresetObject(await parsePresetPayload(payload), { preferredKind: "dryMass" });
          showDryMassPresetStatus(result.message, !result.ok);
        } catch {
          showDryMassPresetStatus(localText("설정 문자열을 해석할 수 없습니다.", "Failed to parse preset payload."), true);
        }
      });
    }

export function setTextById(id, ko, en) {
      const element = document.getElementById(id);
      if (element) element.textContent = localText(ko, en);
    }

export function setPresetUiText() {
      const exportButton = document.getElementById("presetExport");
      const importButton = document.getElementById("presetImport");
      if (exportButton) exportButton.textContent = localText("현재 설정 Export", "Export current settings");
      if (importButton) importButton.textContent = localText("설정 Import", "Import settings");
      setTextById("chartPresetLibraryLabel", "차트 프리셋", "Chart presets");
      setTextById("chartPresetMoreLabel", "프리셋 관리", "Preset management");
      setTextById("chartPresetSelectedGroupLabel", "선택 프리셋", "Selected preset");
      setTextById("chartPresetDefaultGroupLabel", "기본 프리셋", "Default preset");
      setTextById("chartPresetTransferGroupLabel", "가져오기 / 내보내기", "Import / Export");
      setTextById("chartPresetSave", "저장", "Save");
      setTextById("chartPresetRename", "이름 변경", "Rename");
      setTextById("chartPresetDelete", "삭제", "Delete");
      setTextById("chartPresetSetStartup", "기본 지정", "Set default");
      setTextById("chartPresetClearStartup", "기본 해제", "Clear default");
      setTextById("dryMassPresetLibraryLabel", "설계 프리셋", "Design presets");
      setTextById("dryMassPresetMoreLabel", "프리셋 관리", "Preset management");
      setTextById("dryMassPresetTransferGroupLabel", "가져오기 / 내보내기", "Import / Export");
      setTextById("dryMassPresetSave", "저장", "Save");
      setTextById("dryMassPresetRename", "이름 변경", "Rename");
      setTextById("dryMassPresetDelete", "삭제", "Delete");
      setTextById("dryMassPresetExportSelected", "현재 설정 Export", "Export current settings");
      setTextById("dryMassPresetImport", "Import", "Import");
      setTextById("presetExportClose", "닫기", "Close");
      setTextById("presetExportFormatLabel", "출력 형식", "Output format");
      setTextById("presetExportFormatCompressedLabel", "압축 문자열", "Compressed string");
      setTextById("presetExportFormatJsonLabel", "JSON", "JSON");
      setTextById("presetExportCopy", "클립보드에 복사", "Copy to clipboard");
      setTextById("dryMassPresetSaveAsNew", "새 이름으로 저장", "Save as New");
      renderPresetLibraryControls();
    }

export function showPresetStatus(message, isError = false) {
      const status = document.getElementById("presetStatus");
      if (!status) return;
      status.textContent = message || "";
      status.classList.toggle("error", !!isError);
    }

export function showDryMassPresetStatus(message, isError = false) {
      const status = document.getElementById("dryMassPresetStatus");
      if (!status) return;
      status.textContent = message || "";
      status.classList.toggle("error", !!isError);
    }


export function exportedPreset() {
      return {
        format: "ti-engine-chart-preset/v1",
        lang: UI_LANG,
        metric: state.metric,
        thrusters: state.thrusters,
        fuelEfficiencyUnit: state.fuelEfficiencyUnit,
        dryMassTons: state.dryMassTons,
        targetDvKps: state.targetDvKps,
        radiatorId: state.radiatorId,
        logX: !!state.logX,
        logY: !!state.logY,
        showTwrInfo: !!state.showTwrInfo,
        showMassInfo: !!state.showMassInfo,
        paretoHighlight: !!state.paretoHighlight,
        showImpracticalCandidates: !!state.showImpracticalCandidates,
        powerResearchView: normalizePowerResearchView(state.powerResearchView),
        minTwr: state.minTwr,
        minDvKps: state.minDvKps,
        searchTerm: state.searchTerm,
        categories: Object.fromEntries(DATA.categories.map(category => [category.key, !!state.categories[category.key]])),
        families: Object.fromEntries(DATA.subfamilies.map(family => [family.key, !!state.families[family.key]])),
        dryMassCalculator: presetRuntimeApi.exportedDryMassCalculatorPreset(),
        designPresetLibrary: chartPresetDesignLibrarySnapshot(),
        dryMassPresetLibrary: chartPresetDesignLibrarySnapshot(),
        selectedDesignPresetId: document.getElementById("dryMassPresetSelect")?.value || "",
      };
    }


export async function serializePresetPayload() {
      return serializePayloadObject(exportedPreset());
    }


export function applyPresetToState(rawPreset) {
      const preset = rawPreset && rawPreset.settings ? rawPreset.settings : rawPreset;
      if (!preset || typeof preset !== "object") return false;

      if (preset.lang === "ko" || preset.lang === "en") {
        presetRuntimeApi.setLanguage(preset.lang, { rerender: false });
      }

      const metricKeys = Object.keys(metricDefs);
      if (metricKeys.includes(preset.metric)) state.metric = preset.metric;
      if (Number.isFinite(Number(preset.thrusters))) state.thrusters = Math.round(clamp(Number(preset.thrusters), 1, 6));
      if (preset.fuelEfficiencyUnit === "kps" || preset.fuelEfficiencyUnit === "seconds") state.fuelEfficiencyUnit = preset.fuelEfficiencyUnit;
      if (Number.isFinite(Number(preset.dryMassTons))) state.dryMassTons = clamp(Number(preset.dryMassTons), 0, 1000000);
      if (Number.isFinite(Number(preset.targetDvKps))) state.targetDvKps = clamp(Number(preset.targetDvKps), 0, 100000);

      if (typeof preset.radiatorId === "string" && DATA.radiators.some(item => item.id === preset.radiatorId)) {
        state.radiatorId = preset.radiatorId;
      }

      if (typeof preset.logX === "boolean") state.logX = preset.logX;
      if (typeof preset.logY === "boolean") state.logY = preset.logY;
      if (typeof preset.showTwrInfo === "boolean") state.showTwrInfo = preset.showTwrInfo;
      if (typeof preset.showMassInfo === "boolean") state.showMassInfo = preset.showMassInfo;
      if (typeof preset.paretoHighlight === "boolean") state.paretoHighlight = preset.paretoHighlight;
      if (typeof preset.showImpracticalCandidates === "boolean") state.showImpracticalCandidates = preset.showImpracticalCandidates;
      if (typeof preset.powerResearchView === "string") {
        state.powerResearchView = normalizePowerResearchView(preset.powerResearchView);
      } else if (typeof preset.usePowerResearch === "boolean") {
        state.powerResearchView = preset.usePowerResearch ? "all" : "focus";
      }
      if (Number.isFinite(Number(preset.minTwr))) state.minTwr = clamp(Number(preset.minTwr), 0.0001, 10);
      if (Number.isFinite(Number(preset.minDvKps))) state.minDvKps = clamp(Number(preset.minDvKps), 0, 100000);
      if (typeof preset.searchTerm === "string") state.searchTerm = preset.searchTerm.trim().toLocaleLowerCase();

      if (preset.categories && typeof preset.categories === "object") {
        DATA.categories.forEach(category => {
          if (typeof preset.categories[category.key] === "boolean") {
            state.categories[category.key] = preset.categories[category.key];
          }
        });
      }
      if (preset.families && typeof preset.families === "object") {
        DATA.subfamilies.forEach(family => {
          if (typeof preset.families[family.key] === "boolean") {
            state.families[family.key] = preset.families[family.key];
          }
        });
      }

      const designLibrarySnapshot = Array.isArray(preset.designPresetLibrary)
        ? preset.designPresetLibrary
        : Array.isArray(preset.dryMassPresetLibrary)
          ? preset.dryMassPresetLibrary
          : null;
      if (designLibrarySnapshot) {
        restoreDesignPresetLibrarySnapshot(designLibrarySnapshot);
      }

      const selectedDesignPresetId = typeof preset.selectedDesignPresetId === "string" ? preset.selectedDesignPresetId : "";
      const calculatorPreset = preset.dryMassCalculator || preset.dryMassCalc;
      if (calculatorPreset && typeof calculatorPreset === "object") {
        presetRuntimeApi.applyDryMassCalculatorPreset(calculatorPreset);
      } else if (selectedDesignPresetId) {
        const selectedDesign = allDryMassPresetEntries().find(item => item.id === selectedDesignPresetId);
        if (selectedDesign) presetRuntimeApi.applyDryMassCalculatorPreset(selectedDesign.calculator);
      }
      renderDryMassPresetControls(selectedDesignPresetId);

      return true;
    }

export function syncUiFromState() {
      const metric = document.getElementById("metric");
      const thrusters = document.getElementById("thrusters");
      const thrustersNumber = document.getElementById("thrustersNumber");
      const dryMass = document.getElementById("dryMass");
      const dryMassNumber = document.getElementById("dryMassNumber");
      const targetDv = document.getElementById("targetDv");
      const targetDvNumber = document.getElementById("targetDvNumber");
      const radiator = document.getElementById("radiator");
      const logX = document.getElementById("logX");
      const logY = document.getElementById("logY");
      const showTwrInfo = document.getElementById("showTwrInfo");
      const showMassInfo = document.getElementById("showMassInfo");
      const paretoHighlight = document.getElementById("paretoHighlight");
      const showImpracticalCandidates = document.getElementById("showImpracticalCandidates");
      const nameSearch = document.getElementById("nameSearch");

      if (metric) metric.value = state.metric;
      if (thrusters) thrusters.value = String(state.thrusters);
      if (thrustersNumber) thrustersNumber.value = String(state.thrusters);
      if (dryMass) dryMass.value = String(clamp(state.dryMassTons, Number(dryMass.min), Number(dryMass.max)));
      if (dryMassNumber) dryMassNumber.value = String(Math.round(state.dryMassTons));
      if (targetDv) targetDv.value = String(clamp(state.targetDvKps, Number(targetDv.min), Number(targetDv.max)));
      if (targetDvNumber) targetDvNumber.value = String(Math.round(state.targetDvKps));
      if (radiator) {
        radiator.value = state.radiatorId;
        enhanceSearchableSelect(radiator);
      }
      if (logX) logX.checked = !!state.logX;
      if (logY) logY.checked = !!state.logY;
      if (showTwrInfo) showTwrInfo.checked = !!state.showTwrInfo;
      if (showMassInfo) showMassInfo.checked = !!state.showMassInfo;
      if (paretoHighlight) paretoHighlight.checked = !!state.paretoHighlight;
      if (showImpracticalCandidates) showImpracticalCandidates.checked = !!state.showImpracticalCandidates;
      if (nameSearch) nameSearch.value = state.searchTerm || "";
      document.querySelectorAll('input[name="fuelUnit"]').forEach(input => {
        input.checked = input.value === state.fuelEfficiencyUnit;
      });

      state.zoom = null;
      syncFilterInputs();
      presetRuntimeApi.syncMinTwrInputs();
      presetRuntimeApi.syncMinDvInputs();
      presetRuntimeApi.updateChartControls();
      presetRuntimeApi.renderDryMassCalcModal();
      presetRuntimeApi.render();
    }

