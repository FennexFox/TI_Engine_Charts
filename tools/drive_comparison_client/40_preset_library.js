    function renderDryMassCalcModal() {
      const classSelect = document.getElementById("dryMassCalcClass");
      const info = document.getElementById("dryMassCalcInfo");
      const slots = document.getElementById("dryMassCalcSlots");
      const weapons = document.getElementById("dryMassCalcWeapons");
      const armor = document.getElementById("dryMassCalcArmor");
      const total = document.getElementById("dryMassCalcTotal");
      const breakdown = document.getElementById("dryMassCalcBreakdown");
      const title = document.getElementById("dryMassCalcTitle");
      const close = document.getElementById("dryMassCalcClose");
      const apply = document.getElementById("dryMassCalcApply");
      const applyWithDefaults = document.getElementById("dryMassCalcApplyWithDefaults");
      const reset = document.getElementById("dryMassCalcReset");
      const classLabel = document.getElementById("dryMassCalcClassLabel");
      const slotsLabel = document.getElementById("dryMassCalcSlotsLabel");
      const weaponsLabel = document.getElementById("dryMassCalcWeaponsLabel");
      const armorLabel = document.getElementById("dryMassCalcArmorLabel");
      const notesLabel = document.getElementById("dryMassCalcNotesLabel");
      const notes = document.getElementById("dryMassCalcNotes");
      const simulationDefaultsLabel = document.getElementById("shipPresetSimulationDefaultsLabel");
      const targetDvLabel = document.getElementById("shipPresetTargetDvLabel");
      const targetDvInput = document.getElementById("shipPresetTargetDv");
      const radiatorLabel = document.getElementById("shipPresetRadiatorLabel");
      const radiatorSelect = document.getElementById("shipPresetRadiator");
      const button = document.getElementById("dryMassCalcButton");

      if (button) {
        button.setAttribute("aria-label", localText("건조질량 계산기", "Dry-mass calculator"));
        button.title = localText("건조질량 계산기", "Dry-mass calculator");
      }
      if (title) title.textContent = localText("건조질량 계산기", "Dry-mass calculator");
      if (close) close.textContent = localText("닫기", "Close");
      if (apply) apply.textContent = localText("건조질량만 적용", "Apply dry mass only");
      setTextById("dryMassCalcApplyWithDefaults", "건조질량 + 조건 적용", "Apply dry mass + defaults");
      if (reset) reset.textContent = localText("초기화", "Reset");
      if (classLabel) classLabel.textContent = localText("함급", "Hull Class");
      if (slotsLabel) slotsLabel.textContent = localText("내부 유틸리티 모듈", "Internal utility modules");
      if (weaponsLabel) weaponsLabel.textContent = localText("무장 하드포인트", "Weapon hardpoints");
      if (armorLabel) armorLabel.textContent = localText("장갑", "Armor");
      if (notesLabel) notesLabel.textContent = localText("메모", "Notes");
      if (simulationDefaultsLabel) simulationDefaultsLabel.textContent = localText("시뮬레이션 기본 조건", "Simulation defaults");
      if (targetDvLabel) targetDvLabel.textContent = localText("목표 dV (km/s)", "Target dV (km/s)");
      if (radiatorLabel) radiatorLabel.textContent = localText("라디에이터", "Radiator");
      const simulationDefaults = normalizeShipDesignSimulationDefaults();
      if (targetDvInput) targetDvInput.value = String(Math.round(simulationDefaults.targetDvKps));
      if (radiatorSelect) {
        renderRadiatorOptions(radiatorSelect);
        radiatorSelect.value = simulationDefaults.radiatorId;
      }
      if (notes) {
        notes.placeholder = localText("선박 설계 가정 메모", "Ship design assumption notes");
        if (notes.value !== String(dryMassCalcState.notes || "")) notes.value = String(dryMassCalcState.notes || "");
      }
      setPresetUiText();
      renderDryMassPresetControls();

      if (!classSelect || !info || !slots || !weapons || !armor || !total) return;

      classSelect.innerHTML = groupedShipClassOptionsHtml();
      if (!SHIP_CLASS_OPTIONS.length) {
        info.innerHTML = `<span>${escapeHtml(localText("함급 카탈로그 없음", "No hull catalog"))}</span><strong>-</strong>`;
        slots.innerHTML = "";
        weapons.innerHTML = "";
        armor.innerHTML = "";
        total.textContent = `${localText("예상 건조질량", "Estimated dry mass")}: -`;
        if (breakdown) breakdown.innerHTML = "";
        return;
      }
      if (!SHIP_CLASS_OPTIONS.some(item => item.dataName === dryMassCalcState.classId)) {
        dryMassCalcState.classId = SHIP_CLASS_OPTIONS[0].dataName;
      }
      classSelect.value = dryMassCalcState.classId;

      const shipClass = selectedShipClass();
      normalizeDryMassCalcSlots();
      const moduleOptions = utilityModulesForShipClass(shipClass);
      const moduleTotals = dryMassCalcModuleTotals();
      const armorTotals = dryMassCalcArmorTotals(shipClass);
      const hullMass = Number(shipClass.massTons) || 0;
      info.innerHTML = [
        [localText("선체 기본 질량", "Hull mass"), formatNumber(hullMass, " t")],
        shipyardBuildTimeRow(shipClass),
        [localText("Structural Integrity", "Structural Integrity"), formatCompact(Number(shipClass.structuralIntegrity) || 0, 1_000)],
        [localText("함수 하드포인트", "Nose hardpoints"), formatHardpointSize(hardpointCapacity(shipClass, "nose"))],
        [localText("함체 하드포인트", "Hull hardpoints"), formatHardpointSize(hardpointCapacity(shipClass, "hull"))],
        [localText("유틸리티 슬롯", "Utility slots"), String(dryMassCalcState.slotModules.length)],
        [localText("승무원", "Crew"), formatCompact(Number(shipClass.crew) || 0, 1_000)],
        [localText("최대 장교 수", "Max officers"), String(Number(shipClass.maxOfficers) || 0)],
        [localText("요구 프로젝트", "Required project"), shipClass.requiredProject || "-"],
      ].map(([label, value]) => `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`).join("");

      weapons.innerHTML = [
        renderWeaponSection("nose", shipClass),
        renderWeaponSection("hull", shipClass),
      ].join("");

      armor.innerHTML = renderArmorRows(shipClass);

      if (!dryMassCalcState.slotModules.length) {
        slots.innerHTML = `<div class="calc-empty">${escapeHtml(localText("선택 가능한 내부 슬롯 없음", "No internal slots"))}</div>`;
      } else {
        slots.innerHTML = dryMassCalcState.slotModules.map((selectedId, index) => {
          const selectedModule = selectedModuleById(selectedId);
          const options = moduleOptions
            .map(item => {
              const label = `${catalogDisplayName(item)} (${formatNumber(Number(item.massTons) || 0, " t")})`;
              return `<option value="${escapeHtml(item.dataName)}"${item.dataName === selectedId ? " selected" : ""}>${escapeHtml(label)}</option>`;
            })
            .join("");
          return `
            <div class="calc-slot-row">
              <span>${escapeHtml(localText("슬롯", "Slot"))} ${index + 1}</span>
              <select id="dryMassCalcSlot${index}" data-slot-index="${index}" data-searchable-select="true">${options}</select>
              <span class="calc-slot-mass">${escapeHtml(formatNumber(Number(selectedModule.massTons) || 0, " t"))}</span>
            </div>
          `;
        }).join("");
      }
      total.textContent = `${localText("예상 건조질량", "Estimated dry mass")}: ${formatNumber(dryMassCalcTotalTons(), " t")}`;
      if (breakdown) {
        breakdown.innerHTML = [
          `${localText("선체", "Hull")} ${formatNumber(hullMass, " t")}`,
          `${localText("장갑", "Armor")} ${formatNumber(armorTotals.massTons, " t")}`,
          `${localText("무장", "Weapons")} ${formatNumber(moduleTotals.weaponMassTons, " t")}`,
          `${localText("유틸리티", "Utility")} ${formatNumber(moduleTotals.utilityMassTons, " t")}`,
          `${localText("추가 승무원", "Extra crew")} ${formatCompact(moduleTotals.crew, 1_000)}`,
          `${localText("모듈 전력", "Module power")} ${formatNumber(moduleTotals.powerMW, " MW")}`,
        ].map(item => `<span>${escapeHtml(item)}</span>`).join("");
      }
      enhanceSearchableSelects(document.getElementById("dryMassCalcModal"));
    }

    function setupDryMassCalculator() {
      const modal = document.getElementById("dryMassCalcModal");
      const button = document.getElementById("dryMassCalcButton");
      const classSelect = document.getElementById("dryMassCalcClass");
      const slots = document.getElementById("dryMassCalcSlots");
      const weapons = document.getElementById("dryMassCalcWeapons");
      const armor = document.getElementById("dryMassCalcArmor");
      const close = document.getElementById("dryMassCalcClose");
      const apply = document.getElementById("dryMassCalcApply");
      const applyWithDefaults = document.getElementById("dryMassCalcApplyWithDefaults");
      const reset = document.getElementById("dryMassCalcReset");
      const dryMass = document.getElementById("dryMass");
      const dryMassNumber = document.getElementById("dryMassNumber");
      const notes = document.getElementById("dryMassCalcNotes");
      const presetTargetDv = document.getElementById("shipPresetTargetDv");
      const presetRadiator = document.getElementById("shipPresetRadiator");
      if (!modal || !button || !classSelect || !slots || !weapons || !armor || !close || !apply || !applyWithDefaults || !reset || !dryMass || !dryMassNumber || !notes || !presetTargetDv || !presetRadiator) return;

      const openModal = () => {
        renderDryMassCalcModal();
        modal.classList.add("is-open");
        const firstSearchableTrigger = modal.querySelector(".searchable-select-trigger");
        (firstSearchableTrigger || classSelect).focus();
      };
      const closeModal = () => {
        modal.classList.remove("is-open");
      };

      button.addEventListener("click", openModal);
      close.addEventListener("click", closeModal);
      reset.addEventListener("click", () => {
        resetDryMassCalcState();
        renderDryMassCalcModal();
      });
      notes.addEventListener("input", () => {
        dryMassCalcState.notes = notes.value.slice(0, 2000);
      });
      presetTargetDv.addEventListener("input", () => {
        normalizeShipDesignSimulationDefaults().targetDvKps = clamp(Number(presetTargetDv.value) || 0, 0, 100000);
      });
      presetRadiator.addEventListener("change", () => {
        const defaults = normalizeShipDesignSimulationDefaults();
        if (DATA.radiators.some(item => item.id === presetRadiator.value)) {
          defaults.radiatorId = presetRadiator.value;
        }
      });
      modal.addEventListener("click", event => {
        if (event.target === modal) closeModal();
      });
      modal.addEventListener("keydown", event => {
        if (event.key === "Escape") closeModal();
      });
      classSelect.addEventListener("change", () => {
        dryMassCalcState.classId = classSelect.value;
        normalizeDryMassCalcSlots();
        renderDryMassCalcModal();
      });
      slots.addEventListener("change", event => {
        const select = event.target.closest("select[data-slot-index]");
        if (!select) return;
        const index = Number(select.dataset.slotIndex);
        if (!Number.isFinite(index) || index < 0) return;
        dryMassCalcState.slotModules[index] = select.value;
        renderDryMassCalcModal();
      });
      weapons.addEventListener("change", event => {
        const select = event.target.closest("select[data-weapon-section]");
        if (!select) return;
        const section = select.dataset.weaponSection;
        if (section !== "nose" && section !== "hull") return;
        const value = select.value;
        const selections = weaponSelections(section);
        if (select.dataset.weaponIndex === "new") {
          if (value !== EMPTY_WEAPON_MODULE.dataName) selections.push(value);
        } else {
          const index = Number(select.dataset.weaponIndex);
          if (!Number.isFinite(index) || index < 0) return;
          if (value === EMPTY_WEAPON_MODULE.dataName) {
            selections.splice(index, 1);
          } else {
            selections[index] = value;
          }
        }
        normalizeDryMassCalcWeapons();
        renderDryMassCalcModal();
      });
      armor.addEventListener("change", event => {
        const control = event.target.closest("[data-armor-section]");
        if (!control) return;
        const section = control.dataset.armorSection;
        if (!["tail", "hull", "nose"].includes(section)) return;
        const selection = armorSelection(section);
        if (control.dataset.armorField === "type") {
          selection.armorId = control.value;
        } else if (control.dataset.armorField === "points") {
          selection.points = Math.round(Number(control.value) || 0);
        }
        normalizeDryMassCalcArmor();
        renderDryMassCalcModal();
      });
      apply.addEventListener("click", () => {
        const value = clamp(dryMassCalcTotalTons(), 0, 1000000);
        state.dryMassTons = value;
        dryMass.value = String(clamp(value, Number(dryMass.min), Number(dryMass.max)));
        dryMassNumber.value = String(Math.round(value));
        closeModal();
        render();
      });
      applyWithDefaults.addEventListener("click", () => {
        const value = clamp(dryMassCalcTotalTons(), 0, 1000000);
        state.dryMassTons = value;
        applyShipDesignSimulationDefaultsToState();
        syncUiFromState();
        closeModal();
        render();
      });

      normalizeDryMassCalcSlots();
      setupDryMassPresetControls();
      renderDryMassCalcModal();
    }

    function localLabel(item) {
      if (UI_LANG === "en") return item.labelEn || item.label || item.key;
      return item.label || item.labelEn || item.key;
    }

    function localCategoryHelp(category) {
      if (UI_LANG === "en") return category.helpEn || category.help || "";
      return category.help || category.helpEn || "";
    }

    function helpText(key) {
      const item = HELP_TEXT[key] || {};
      return UI_LANG === "en" ? (item.en || item.ko || "") : (item.ko || item.en || "");
    }

    function applyHelp(element, text) {
      if (!element || !text) return;
      element.dataset.help = text;
      element.title = text;
    }

    function cloneJson(value) {
      const text = JSON.stringify(value);
      return text ? JSON.parse(text) : null;
    }

    function storageReadJson(key) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    function storageWriteJson(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }

    function uniquePresetId(prefix) {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return `${prefix}-${window.crypto.randomUUID()}`;
      }
      return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function sanitizePresetName(value, fallback = "Preset") {
      const name = String(value || "").trim();
      return name || fallback;
    }

    function uniquePresetName(baseName, library, ignoreId = "") {
      const base = sanitizePresetName(baseName, "Preset");
      let candidate = base;
      let suffix = 2;
      while (library.some(item => item.id !== ignoreId && item.name === candidate)) {
        candidate = `${base} (${suffix})`;
        suffix += 1;
      }
      return candidate;
    }

    function presetTimestamp() {
      return new Date().toISOString();
    }

    function normalizeChartPresetEntry(rawEntry, fallbackName = "Chart preset") {
      if (!rawEntry || typeof rawEntry !== "object") return null;
      const source = rawEntry.preset && typeof rawEntry.preset === "object" ? rawEntry.preset : rawEntry;
      const settings = source.settings && typeof source.settings === "object" ? source.settings : source;
      if (!settings || typeof settings !== "object") return null;
      const now = presetTimestamp();
      return {
        id: typeof source.id === "string" && source.id.trim() ? source.id : uniquePresetId("chart"),
        name: sanitizePresetName(source.name, fallbackName),
        settings: cloneJson(settings),
        createdAt: typeof source.createdAt === "string" ? source.createdAt : now,
        updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : now,
      };
    }

    function normalizeDryMassPresetEntry(rawEntry, fallbackName = "Design preset") {
      if (!rawEntry || typeof rawEntry !== "object") return null;
      const source = rawEntry.preset && typeof rawEntry.preset === "object" ? rawEntry.preset : rawEntry;
      const dryMassDesign = source.dryMassDesign && typeof source.dryMassDesign === "object"
        ? source.dryMassDesign
        : source.design && typeof source.design === "object"
          ? source.design
          : source.calculator && typeof source.calculator === "object"
            ? source.calculator
            : source.settings && typeof source.settings === "object"
              ? source.settings
              : source.dryMassCalculator && typeof source.dryMassCalculator === "object"
                ? source.dryMassCalculator
                : source.dryMassCalc && typeof source.dryMassCalc === "object"
                  ? source.dryMassCalc
                  : source;
      if (!dryMassDesign || typeof dryMassDesign !== "object") return null;
      const calculator = cloneJson(dryMassDesign);
      const simulationDefaults = source.simulationDefaults && typeof source.simulationDefaults === "object"
        ? source.simulationDefaults
        : calculator.simulationDefaults && typeof calculator.simulationDefaults === "object"
          ? calculator.simulationDefaults
          : null;
      if (simulationDefaults) calculator.simulationDefaults = cloneJson(simulationDefaults);
      const now = presetTimestamp();
      return {
        id: typeof source.id === "string" && source.id.trim() ? source.id : uniquePresetId("design"),
        name: sanitizePresetName(source.name, fallbackName),
        calculator,
        createdAt: typeof source.createdAt === "string" ? source.createdAt : now,
        updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : now,
      };
    }

    function dedupePresetEntries(entries) {
      const seen = new Set();
      return entries.filter(entry => {
        if (!entry || seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
      });
    }

    function presetLibraryData() {
      const library = DATA.presetLibrary;
      return library && typeof library === "object" ? library : {};
    }

    function builtInPresetId(prefix, rawEntry, index) {
      const source = rawEntry && rawEntry.preset && typeof rawEntry.preset === "object" ? rawEntry.preset : rawEntry;
      const rawId = source && typeof source.id === "string" && source.id.trim()
        ? source.id.trim()
        : String(index + 1);
      return `${prefix}:${rawId}`;
    }

    function normalizeBuiltInChartPresetEntry(rawEntry, index) {
      if (!rawEntry || typeof rawEntry !== "object") return null;
      const source = rawEntry.preset && typeof rawEntry.preset === "object" ? rawEntry.preset : rawEntry;
      const entry = normalizeChartPresetEntry(
        { ...source, id: builtInPresetId("built-in-chart", rawEntry, index) },
        `Built-in chart preset ${index + 1}`,
      );
      if (entry) entry.builtIn = true;
      return entry;
    }

    function normalizeBuiltInDryMassPresetEntry(rawEntry, index) {
      if (!rawEntry || typeof rawEntry !== "object") return null;
      const source = rawEntry.preset && typeof rawEntry.preset === "object" ? rawEntry.preset : rawEntry;
      const entry = normalizeDryMassPresetEntry(
        { ...source, id: builtInPresetId("built-in-design", rawEntry, index) },
        `Built-in design preset ${index + 1}`,
      );
      if (entry) entry.builtIn = true;
      return entry;
    }

    function loadBuiltInChartPresetLibrary() {
      const presets = presetLibraryData().chartPresets;
      return dedupePresetEntries((Array.isArray(presets) ? presets : [])
        .map(normalizeBuiltInChartPresetEntry)
        .filter(Boolean));
    }

    function loadBuiltInDryMassPresetLibrary() {
      const presets = presetLibraryData().dryMassPresets;
      return dedupePresetEntries((Array.isArray(presets) ? presets : [])
        .map(normalizeBuiltInDryMassPresetEntry)
        .filter(Boolean));
    }

    function allChartPresetEntries() {
      return [...builtInChartPresetLibrary, ...chartPresetLibrary];
    }

    function allDryMassPresetEntries() {
      return [...builtInDryMassPresetLibrary, ...dryMassPresetLibrary];
    }

    function loadChartPresetLibrary() {
      const raw = storageReadJson(CHART_PRESET_STORAGE_KEY);
      const presets = Array.isArray(raw) ? raw : (Array.isArray(raw?.presets) ? raw.presets : []);
      return dedupePresetEntries(presets.map(item => normalizeChartPresetEntry(item)).filter(Boolean));
    }

    function loadDryMassPresetLibrary() {
      const raw = storageReadJson(DRY_MASS_PRESET_STORAGE_KEY);
      const presets = Array.isArray(raw) ? raw : (Array.isArray(raw?.presets) ? raw.presets : []);
      return dedupePresetEntries(presets.map(item => normalizeDryMassPresetEntry(item)).filter(Boolean));
    }

    function loadStartupChartPresetId() {
      try {
        return localStorage.getItem(CHART_PRESET_STARTUP_STORAGE_KEY) || "";
      } catch {
        return "";
      }
    }

    function saveChartPresetLibrary() {
      return storageWriteJson(CHART_PRESET_STORAGE_KEY, {
        format: "ti-engine-chart-preset-library/v1",
        presets: chartPresetLibrary,
      });
    }

    function saveDryMassPresetLibrary() {
      return storageWriteJson(DRY_MASS_PRESET_STORAGE_KEY, {
        format: "ti-engine-chart-design-preset-library/v1",
        presets: dryMassPresetLibrary,
      });
    }

    function chartPresetExportObject(entry) {
      return {
        format: "ti-engine-chart-named-preset/v1",
        id: entry.id,
        name: entry.name,
        settings: cloneJson(entry.settings),
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    }

    function chartPresetLibraryExportObject() {
      return {
        format: "ti-engine-chart-preset-library/v1",
        presets: chartPresetLibrary.map(chartPresetExportObject),
        startupPresetId: startupChartPresetId || null,
      };
    }

    function dryMassPresetExportObject(entry) {
      const calculator = cloneJson(entry.calculator);
      const simulationDefaults = calculator && calculator.simulationDefaults && typeof calculator.simulationDefaults === "object"
        ? cloneJson(calculator.simulationDefaults)
        : null;
      const dryMassDesign = cloneJson(calculator);
      if (dryMassDesign && typeof dryMassDesign === "object") delete dryMassDesign.simulationDefaults;
      return {
        format: "ti-engine-chart-design-preset/v1",
        id: entry.id,
        name: entry.name,
        dryMassDesign,
        simulationDefaults,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    }

    function dryMassPresetLibraryExportObject() {
      return {
        format: "ti-engine-chart-design-preset-library/v1",
        presets: dryMassPresetLibrary.map(dryMassPresetExportObject),
      };
    }

    function setStartupChartPreset(id) {
      startupChartPresetId = id || "";
      try {
        if (startupChartPresetId) {
          localStorage.setItem(CHART_PRESET_STARTUP_STORAGE_KEY, startupChartPresetId);
        } else {
          localStorage.removeItem(CHART_PRESET_STARTUP_STORAGE_KEY);
        }
        return true;
      } catch {
        return false;
      }
    }

    function selectedChartPresetEntry() {
      const select = document.getElementById("chartPresetSelect");
      return allChartPresetEntries().find(item => item.id === (select && select.value)) || null;
    }

    function selectedDryMassPresetEntry() {
      const select = document.getElementById("dryMassPresetSelect");
      return allDryMassPresetEntries().find(item => item.id === (select && select.value)) || null;
    }

    function firstChartPresetEntry() {
      return allChartPresetEntries()[0] || null;
    }

    function firstDryMassPresetEntry() {
      return allDryMassPresetEntries()[0] || null;
    }

    function applyChartPresetEntry(entry, { showStatus = true } = {}) {
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

    function applySelectedChartPreset(options = {}) {
      return applyChartPresetEntry(selectedChartPresetEntry(), options);
    }

    function applyDryMassPresetEntry(entry, { showStatus = true } = {}) {
      if (!entry) return false;
      if (!applyDryMassCalculatorPreset(entry.calculator)) {
        if (showStatus) showDryMassPresetStatus(localText("프리셋을 적용하지 못했습니다.", "Failed to apply preset."), true);
        return false;
      }
      renderDryMassCalcModal();
      if (showStatus) showDryMassPresetStatus(localText(`“${entry.name}” 설계 프리셋을 적용했습니다. 적용 버튼으로 차트에 반영하세요.`, `Applied design preset “${entry.name}”. Use an apply button to update the chart.`));
      return true;
    }

    function applySelectedDryMassPreset(options = {}) {
      return applyDryMassPresetEntry(selectedDryMassPresetEntry(), options);
    }

    function applyStartupChartPreset() {
      let entry = startupChartPresetId
        ? allChartPresetEntries().find(item => item.id === startupChartPresetId)
        : null;
      if (startupChartPresetId && !entry) setStartupChartPreset("");
      entry = entry || firstChartPresetEntry();
      return !!entry && applyPresetToState(entry.settings);
    }

    function setDisabled(id, disabled) {
      const button = document.getElementById(id);
      if (button) button.disabled = !!disabled;
    }

    function appendPresetOptionGroup(select, label, entries, startupId = "") {
      if (!entries.length) return;
      const group = document.createElement("optgroup");
      group.label = label;
      entries.forEach(entry => {
        const option = document.createElement("option");
        option.value = entry.id;
        option.textContent = entry.id === startupId
          ? `${entry.name} ${localText("(기본)", "(default)")}`
          : entry.name;
        group.appendChild(option);
      });
      select.appendChild(group);
    }

    function renderChartPresetControls(preferredId = "") {
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

    function renderDryMassPresetControls(preferredId = "") {
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
        select.value = allEntries.some(item => item.id === selectedId)
          ? selectedId
          : allEntries[0].id;
      }
      select.disabled = !hasPresets;
      const entry = selectedDryMassPresetEntry();
      setDisabled("dryMassPresetSave", false);
      ["dryMassPresetRename", "dryMassPresetDelete"].forEach(id => setDisabled(id, !entry || !!entry.builtIn));
    }

    function renderPresetLibraryControls() {
      renderChartPresetControls();
      renderDryMassPresetControls();
    }

    function promptPresetName(message, defaultName, statusFn) {
      const name = window.prompt(message, defaultName || "");
      if (name === null) return null;
      const clean = sanitizePresetName(name, "");
      if (!clean) {
        statusFn(localText("프리셋 이름이 필요합니다.", "Preset name is required."), true);
        return null;
      }
      return clean;
    }

    function saveChartPresetFromSettings(name, settings, existingId = "") {
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
        chartPresetLibrary = chartPresetLibrary.map(item => item.id === existing.id ? entry : item);
      } else {
        chartPresetLibrary = [...chartPresetLibrary, entry];
      }
      if (!saveChartPresetLibrary()) return null;
      renderChartPresetControls(entry.id);
      return entry;
    }

    function saveDryMassPresetFromCalculator(name, calculator, existingId = "") {
      const now = presetTimestamp();
      const existing = dryMassPresetLibrary.find(item => item.id === existingId);
      const entry = {
        id: existing ? existing.id : uniquePresetId("design"),
        name: uniquePresetName(name, dryMassPresetLibrary, existing ? existing.id : ""),
        calculator: cloneJson(calculator),
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      };
      if (existing) {
        dryMassPresetLibrary = dryMassPresetLibrary.map(item => item.id === existing.id ? entry : item);
      } else {
        dryMassPresetLibrary = [...dryMassPresetLibrary, entry];
      }
      if (!saveDryMassPresetLibrary()) return null;
      renderDryMassPresetControls(entry.id);
      return entry;
    }

    function mergeChartPresetEntries(entries) {
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

    function mergeDryMassPresetEntries(entries) {
      let changed = 0;
      entries.map((entry, index) => normalizeDryMassPresetEntry(entry, `Imported design preset ${index + 1}`))
        .filter(Boolean)
        .forEach(entry => {
          const usedIds = new Set(allDryMassPresetEntries().map(item => item.id));
          const imported = { ...entry, builtIn: false };
          if (usedIds.has(imported.id)) imported.id = uniquePresetId("design");
          imported.name = uniquePresetName(imported.name, dryMassPresetLibrary);
          dryMassPresetLibrary.push(imported);
          changed += 1;
        });
      if (!changed) return 0;
      saveDryMassPresetLibrary();
      renderDryMassPresetControls();
      return changed;
    }

    function extractChartSettingsFromImport(raw) {
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

    function extractDryMassCalculatorFromImport(raw) {
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

    async function handleImportedPresetObject(raw, { preferredKind = "chart", promptToSaveCurrent = true } = {}) {
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
        const count = mergeDryMassPresetEntries(raw.presets);
        if (count > 0) applySelectedDryMassPreset({ showStatus: false });
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
        const count = entry ? mergeDryMassPresetEntries([entry]) : 0;
        if (count > 0) applySelectedDryMassPreset({ showStatus: false });
        return { ok: count > 0, message: count > 0
          ? localText("설계 프리셋을 라이브러리에 추가했습니다.", "Design preset added to the library.")
          : localText("설계 프리셋을 가져오지 못했습니다.", "Failed to import design preset.") };
      }

      if (preferredKind === "dryMass") {
        const calculator = extractDryMassCalculatorFromImport(raw);
        if (calculator && applyDryMassCalculatorPreset(calculator)) {
          renderDryMassCalcModal();
          if (promptToSaveCurrent && window.confirm(localText("가져온 계산기 설정을 이름 있는 프리셋으로 저장할까요?", "Save imported calculator settings as a named preset?"))) {
            const name = promptPresetName(
              localText("설계 프리셋 이름", "Design preset name"),
              raw.name || localText("가져온 설계 프리셋", "Imported design preset"),
              showDryMassPresetStatus,
            );
            if (name) saveDryMassPresetFromCalculator(name, exportedDryMassCalculatorPreset());
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
      if (calculator && applyDryMassCalculatorPreset(calculator)) {
        renderDryMassCalcModal();
        return { ok: true, message: localText("설계 설정을 불러왔습니다.", "Design settings imported.") };
      }

      return { ok: false, message: localText("설정 형식을 인식하지 못했습니다.", "Unrecognized preset format.") };
    }

    let presetExportModalState = null;

    async function serializePayloadObject(object) {
      const jsonText = JSON.stringify(object);
      const sourceBytes = new TextEncoder().encode(jsonText);
      const gzipped = await gzipBytes(sourceBytes);
      if (gzipped) return `ticp1:${bytesToBase64(gzipped)}`;
      return `tijp1:${bytesToBase64(sourceBytes)}`;
    }

    async function formatExportPayloadObject(object, format) {
      if (format === "json") return JSON.stringify(object, null, 2);
      return serializePayloadObject(object);
    }

    function selectedExportFormat() {
      const selected = document.querySelector('input[name="presetExportFormat"]:checked');
      return selected && selected.value === "json" ? "json" : "compressed";
    }

    async function refreshPresetExportOutput() {
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

    function openPresetExportModal({ object, title, description, successText, failureText, statusFn = showPresetStatus }) {
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

    function closePresetExportModal() {
      const modal = document.getElementById("presetExportModal");
      if (modal) modal.classList.remove("is-open");
      presetExportModalState = null;
    }

    async function copyPresetExportOutput() {
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

    function openSerializedObjectExport(object, successText, failureText, statusFn = showPresetStatus, title = "", description = "") {
      openPresetExportModal({ object, title, description, successText, failureText, statusFn });
    }

    function setupPresetExportModal() {
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

    function setupPresetLibraryControls() {
      setupPresetExportModal();
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
        chartPresetLibrary = chartPresetLibrary.filter(item => item.id !== entry.id);
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

    function setupDryMassPresetControls() {
      renderDryMassPresetControls();
      applySelectedDryMassPreset({ showStatus: false });
      document.getElementById("dryMassPresetSelect")?.addEventListener("change", event => {
        renderDryMassPresetControls(event.target.value);
        applySelectedDryMassPreset();
      });
      document.getElementById("dryMassPresetSave")?.addEventListener("click", () => {
        const entry = selectedDryMassPresetEntry();
        const existingId = entry && !entry.builtIn ? entry.id : "";
        const name = promptPresetName(
          localText("설계 프리셋 이름", "Design preset name"),
          entry ? (entry.builtIn ? `${entry.name} copy` : entry.name) : "",
          showDryMassPresetStatus,
        );
        if (!name) return;
        const saved = saveDryMassPresetFromCalculator(name, exportedDryMassCalculatorPreset(), existingId);
        showDryMassPresetStatus(saved
          ? localText("설계 프리셋을 저장했습니다.", "Design preset saved.")
          : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      });
      document.getElementById("dryMassPresetRename")?.addEventListener("click", () => {
        const entry = selectedDryMassPresetEntry();
        if (!entry) return;
        if (entry.builtIn) return showDryMassPresetStatus(localText("예시 프리셋은 이름을 변경할 수 없습니다.", "Example presets cannot be renamed."), true);
        const name = promptPresetName(localText("새 설계 프리셋 이름", "New design preset name"), entry.name, showDryMassPresetStatus);
        if (!name) return;
        entry.name = uniquePresetName(name, dryMassPresetLibrary, entry.id);
        entry.updatedAt = presetTimestamp();
        const saved = saveDryMassPresetLibrary();
        renderDryMassPresetControls(entry.id);
        showDryMassPresetStatus(saved ? localText("프리셋 이름을 변경했습니다.", "Preset renamed.") : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      });
      document.getElementById("dryMassPresetDelete")?.addEventListener("click", () => {
        const entry = selectedDryMassPresetEntry();
        if (entry && entry.builtIn) return showDryMassPresetStatus(localText("예시 프리셋은 삭제할 수 없습니다.", "Example presets cannot be deleted."), true);
        if (!entry || !window.confirm(localText("선택한 설계 프리셋을 삭제할까요?", "Delete the selected design preset?"))) return;
        dryMassPresetLibrary = dryMassPresetLibrary.filter(item => item.id !== entry.id);
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
            calculator: exportedDryMassCalculatorPreset(),
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

    function setTextById(id, ko, en) {
      const element = document.getElementById(id);
      if (element) element.textContent = localText(ko, en);
    }

    function setPresetUiText() {
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
      renderPresetLibraryControls();
    }

    function showPresetStatus(message, isError = false) {
      const status = document.getElementById("presetStatus");
      if (!status) return;
      status.textContent = message || "";
      status.classList.toggle("error", !!isError);
    }

    function showDryMassPresetStatus(message, isError = false) {
      const status = document.getElementById("dryMassPresetStatus");
      if (!status) return;
      status.textContent = message || "";
      status.classList.toggle("error", !!isError);
    }


    function chartPresetDesignLibrarySnapshot() {
      return dryMassPresetLibrary.map(dryMassPresetExportObject);
    }

    function restoreDesignPresetLibrarySnapshot(rawEntries) {
      if (!Array.isArray(rawEntries)) return false;
      const entries = rawEntries
        .map((entry, index) => normalizeDryMassPresetEntry(entry, `Restored design preset ${index + 1}`))
        .filter(Boolean)
        .map(entry => ({ ...entry, builtIn: false }));
      dryMassPresetLibrary = dedupePresetEntries(entries);
      saveDryMassPresetLibrary();
      return true;
    }

    function exportedPreset() {
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
        dryMassCalculator: exportedDryMassCalculatorPreset(),
        designPresetLibrary: chartPresetDesignLibrarySnapshot(),
        dryMassPresetLibrary: chartPresetDesignLibrarySnapshot(),
        selectedDesignPresetId: document.getElementById("dryMassPresetSelect")?.value || "",
      };
    }

    async function copyToClipboard(text) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const hidden = document.createElement("textarea");
      hidden.value = text;
      hidden.setAttribute("readonly", "");
      hidden.style.position = "fixed";
      hidden.style.opacity = "0";
      document.body.appendChild(hidden);
      hidden.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } finally {
        document.body.removeChild(hidden);
      }
      return copied;
    }

    async function readFromClipboard() {
      if (!(navigator.clipboard && window.isSecureContext)) return "";
      try {
        return (await navigator.clipboard.readText()) || "";
      } catch {
        return "";
      }
    }

    function bytesToBase64(bytes) {
      let binary = "";
      const chunkSize = 0x8000;
      for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      return btoa(binary);
    }

    function base64ToBytes(text) {
      const binary = atob(text);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return bytes;
    }

    async function gzipBytes(bytes) {
      if (typeof CompressionStream !== "function") return null;
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    async function gunzipBytes(bytes) {
      if (typeof DecompressionStream !== "function") return null;
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    async function serializePresetPayload() {
      return serializePayloadObject(exportedPreset());
    }

    async function parsePresetPayload(payloadText) {
      const payload = String(payloadText || "").trim();
      if (!payload) throw new Error("empty");

      if (payload.startsWith("ticp1:")) {
        const compressed = base64ToBytes(payload.slice("ticp1:".length));
        const plain = await gunzipBytes(compressed);
        if (!plain) throw new Error("no-gunzip");
        return JSON.parse(new TextDecoder().decode(plain));
      }

      if (payload.startsWith("tijp1:")) {
        const plain = base64ToBytes(payload.slice("tijp1:".length));
        return JSON.parse(new TextDecoder().decode(plain));
      }

      return JSON.parse(payload);
    }

    function applyPresetToState(rawPreset) {
      const preset = rawPreset && rawPreset.settings ? rawPreset.settings : rawPreset;
      if (!preset || typeof preset !== "object") return false;

      if (preset.lang === "ko" || preset.lang === "en") {
        setLanguage(preset.lang, { rerender: false });
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
        applyDryMassCalculatorPreset(calculatorPreset);
      } else if (selectedDesignPresetId) {
        const selectedDesign = allDryMassPresetEntries().find(item => item.id === selectedDesignPresetId);
        if (selectedDesign) applyDryMassCalculatorPreset(selectedDesign.calculator);
      }
      renderDryMassPresetControls(selectedDesignPresetId);

      return true;
    }

    function syncUiFromState() {
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
      syncMinTwrInputs();
      syncMinDvInputs();
      updateChartControls();
      renderDryMassCalcModal();
      render();
    }

