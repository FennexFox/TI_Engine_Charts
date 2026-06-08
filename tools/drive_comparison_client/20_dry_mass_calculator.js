    function catalogDisplayName(item) {
      const display = item && item.displayName;
      if (display && typeof display === "object") {
        return UI_LANG === "en"
          ? display.en || display.kor || item.friendlyName || item.dataName
          : display.kor || display.en || item.friendlyName || item.dataName;
      }
      return item ? (item.friendlyName || item.dataName || "") : "";
    }

    function compareCatalogTitles(left, right) {
      const locale = UI_LANG === "en" ? "en" : "ko-KR";
      const titleCompare = catalogDisplayName(left).localeCompare(catalogDisplayName(right), locale, {
        numeric: true,
        sensitivity: "base",
      });
      if (titleCompare) return titleCompare;
      return String(left && left.dataName || "").localeCompare(String(right && right.dataName || ""), "en", {
        numeric: true,
        sensitivity: "base",
      });
    }

    function sortedByCatalogTitle(items) {
      return [...items].sort(compareCatalogTitles);
    }

    function selectedShipClass() {
      return SHIP_CLASS_OPTIONS.find(item => item.dataName === dryMassCalcState.classId) || SHIP_CLASS_OPTIONS[0] || null;
    }

    function utilityModulesForShipClass(shipClass) {
      const hullTier = Number(shipClass && shipClass.constructionTier) || 0;
      const modules = ALL_UTILITY_MODULES.filter(item => {
        if (!item || item.dataName === "Empty") return false;
        if (item.alien) return false;
        return (Number(item.minConstructionTier) || 0) <= hullTier;
      });
      return [EMPTY_UTILITY_MODULE, ...sortedByCatalogTitle(modules)];
    }

    function selectedModuleById(id) {
      return ALL_UTILITY_MODULES.find(item => item.dataName === id) || EMPTY_UTILITY_MODULE;
    }

    function selectedWeaponById(id) {
      return ALL_WEAPON_MODULES.find(item => item.dataName === id) || EMPTY_WEAPON_MODULE;
    }

    function selectedArmorById(id) {
      return ARMOR_OPTIONS.find(item => item.dataName === id) || ARMOR_OPTIONS[0] || null;
    }

    function armorSelection(section) {
      if (!dryMassCalcState.armor || typeof dryMassCalcState.armor !== "object") dryMassCalcState.armor = {};
      if (!dryMassCalcState.armor[section] || typeof dryMassCalcState.armor[section] !== "object") {
        dryMassCalcState.armor[section] = { armorId: DEFAULT_ARMOR_ID, points: 0 };
      }
      if (!dryMassCalcState.armor[section].armorId) dryMassCalcState.armor[section].armorId = DEFAULT_ARMOR_ID;
      dryMassCalcState.armor[section].points = Math.max(0, Math.round(Number(dryMassCalcState.armor[section].points) || 0));
      return dryMassCalcState.armor[section];
    }

    function armorPlateThicknessM(armor) {
      const density = Number(armor && armor.densityKgM3) || 0;
      const heat = Number(armor && armor.heatOfVaporizationMJkg) || 0;
      if (density <= 0 || heat <= 0) return 0;
      const massDamagePointKg = 20 / heat;
      const volumeDamagePointM3 = massDamagePointKg / density;
      return volumeDamagePointM3 / 0.005;
    }

    function armorSectionThicknessM(armor, points) {
      return armorPlateThicknessM(armor) * Math.max(0, Number(points) || 0);
    }

    function selectedArmorMaxBonus() {
      return dryMassCalcState.slotModules
        .map(selectedModuleById)
        .reduce((sum, module) => {
          const rules = Array.isArray(module.specialRules) ? module.specialRules : [];
          return sum + (rules.includes("ArmorStruts") ? (Number(module.specialValue) || 0) : 0);
        }, 0);
    }

    function armorMaxDepthM(shipClass, section) {
      if (!shipClass) return 0;
      const length = Number(shipClass.lengthM) || 0;
      const width = Number(shipClass.widthM) || 0;
      const simple = !!shipClass.simpleHull;
      const base = section === "hull"
        ? width * (simple ? 0.06 : 0.12)
        : length * (simple ? (section === "tail" ? 0 : 0.018) : 0.036);
      return base * (1 + selectedArmorMaxBonus());
    }

    function armorMaxPoints(shipClass, section, armor) {
      const plate = armorPlateThicknessM(armor);
      if (plate <= 0) return 0;
      return Math.max(0, Math.trunc(armorMaxDepthM(shipClass, section) / plate));
    }

    function normalizeDryMassCalcArmor() {
      const shipClass = selectedShipClass();
      for (const section of ["tail", "hull", "nose"]) {
        const selection = armorSelection(section);
        const armor = selectedArmorById(selection.armorId);
        if (!armor) {
          selection.armorId = DEFAULT_ARMOR_ID;
          selection.points = 0;
          continue;
        }
        selection.armorId = armor.dataName;
        selection.points = clamp(Math.round(selection.points), 0, armorMaxPoints(shipClass, section, armor));
      }
    }

    function armorSectionVolumeM3(armor, points, shipClass, lateralArmorDepthM, lateral) {
      const length = Number(shipClass && shipClass.lengthM) || 0;
      const width = Number(shipClass && shipClass.widthM) || 0;
      if (!armor || points <= 0 || length <= 0 || width <= 0) return 0;
      const radiusWithArmor = (width + lateralArmorDepthM + lateralArmorDepthM) / 2;
      const enlargedCapArea = Math.PI * radiusWithArmor * radiusWithArmor;
      if (lateral) {
        const baseVolume = Math.PI * (width / 2) * (width / 2) * length;
        return Math.max(0, (enlargedCapArea * length - baseVolume) / 2);
      }
      return armorSectionThicknessM(armor, points) * enlargedCapArea * 3;
    }

    function armorMassTons(section, shipClass) {
      const hullSelection = armorSelection("hull");
      const hullArmor = selectedArmorById(hullSelection.armorId);
      const lateralArmorDepthM = armorSectionThicknessM(hullArmor, hullSelection.points);
      const selection = armorSelection(section);
      const armor = selectedArmorById(selection.armorId);
      const points = Math.max(0, Number(selection.points) || 0);
      const volumeM3 = armorSectionVolumeM3(armor, points, shipClass, lateralArmorDepthM, section === "hull");
      return Math.max(0, volumeM3 * (Number(armor && armor.densityKgM3) || 0) / 1000);
    }

    function dryMassCalcArmorTotals(shipClass = selectedShipClass()) {
      const tailMassTons = armorMassTons("tail", shipClass);
      const hullMassTons = armorMassTons("hull", shipClass);
      const noseMassTons = armorMassTons("nose", shipClass);
      return {
        tailMassTons,
        hullMassTons,
        noseMassTons,
        massTons: tailMassTons + hullMassTons + noseMassTons,
      };
    }

    function hardpointCapacity(shipClass, section) {
      if (!shipClass) return 0;
      return Math.max(0, Number(section === "nose" ? shipClass.noseHardpoints : shipClass.hullHardpoints) || 0);
    }

    function weaponSlotSize(module) {
      if (!module || module.dataName === EMPTY_WEAPON_MODULE.dataName) return 0;
      return Math.max(0, Number(module.slotSize) || 1);
    }

    function weaponSlotClass(module) {
      return String(module && module.slotClass || "");
    }

    function weaponFitsSection(module, section) {
      const slotClass = weaponSlotClass(module);
      return slotClass === section || slotClass === "any";
    }

    function weaponModulesForSection(section) {
      const modules = ALL_WEAPON_MODULES.filter(item => {
        if (!item || item.alien) return false;
        return weaponFitsSection(item, section) && weaponSlotSize(item) > 0;
      });
      return [EMPTY_WEAPON_MODULE, ...sortedByCatalogTitle(modules)];
    }

    function weaponSelections(section) {
      if (!dryMassCalcState.weaponModules || typeof dryMassCalcState.weaponModules !== "object") {
        dryMassCalcState.weaponModules = { nose: [], hull: [] };
      }
      if (!Array.isArray(dryMassCalcState.weaponModules[section])) {
        dryMassCalcState.weaponModules[section] = [];
      }
      return dryMassCalcState.weaponModules[section];
    }

    function usedWeaponHardpoints(section) {
      return weaponSelections(section)
        .map(selectedWeaponById)
        .reduce((sum, module) => sum + weaponSlotSize(module), 0);
    }

    function formatHardpointSize(value) {
      return Number.isFinite(value) ? trim(value) : "-";
    }

    function formatDays(value) {
      const days = Number(value);
      if (!Number.isFinite(days) || days <= 0) return "-";
      return formatCompact(days, 1_000);
    }

    function shipyardBuildTimeRow(shipClass) {
      const times = shipClass && shipClass.shipyardBuildTimesDays || {};
      const value = [
        formatDays(times.t1 ?? shipClass.baseConstructionTimeDays),
        formatDays(times.t2 ?? shipClass.baseConstructionTimeDays),
        formatDays(times.t3 ?? shipClass.baseConstructionTimeDays),
      ].join(" / ");
      return [localText("조선소 건조일수 (T1/T2/T3)", "Shipyard build days (T1/T2/T3)"), value];
    }

    function groupedShipClassOptionsHtml() {
      const groups = new Map();
      SHIP_CLASS_OPTIONS.forEach(item => {
        const missionControl = Number(item.missionControl) || 0;
        if (!groups.has(missionControl)) groups.set(missionControl, []);
        groups.get(missionControl).push(item);
      });
      return Array.from(groups.entries())
        .sort(([left], [right]) => left - right)
        .map(([missionControl, items]) => {
          const groupLabel = `${localText("MC 소모", "MC cost")} ${formatHardpointSize(missionControl)}`;
          const options = sortedByCatalogTitle(items)
            .map(item => `<option value="${escapeHtml(item.dataName)}">${escapeHtml(catalogDisplayName(item))}</option>`)
            .join("");
          return `<optgroup label="${escapeHtml(groupLabel)}">${options}</optgroup>`;
        })
        .join("");
    }

    function weaponOptionLabel(item) {
      if (item.dataName === EMPTY_WEAPON_MODULE.dataName) return catalogDisplayName(item);
      return `${catalogDisplayName(item)} (${formatHardpointSize(weaponSlotSize(item))} HP, ${formatNumber(Number(item.massTons) || 0, " t")})`;
    }

    function normalizeDryMassCalcWeapons() {
      const shipClass = selectedShipClass();
      for (const section of ["nose", "hull"]) {
        const capacity = hardpointCapacity(shipClass, section);
        const allowedIds = new Set(weaponModulesForSection(section).map(item => item.dataName));
        const normalized = [];
        let used = 0;
        for (const id of weaponSelections(section)) {
          if (!allowedIds.has(id)) continue;
          const module = selectedWeaponById(id);
          const size = weaponSlotSize(module);
          if (size <= 0) continue;
          if (used + size <= capacity + 1e-9) {
            normalized.push(id);
            used += size;
          }
        }
        dryMassCalcState.weaponModules[section] = normalized;
      }
    }

    function normalizeDryMassCalcSlots() {
      const shipClass = selectedShipClass();
      if (!shipClass) {
        dryMassCalcState.slotModules = [];
        dryMassCalcState.weaponModules = { nose: [], hull: [] };
        normalizeDryMassCalcArmor();
        return;
      }
      normalizeDryMassCalcWeapons();
      const desired = Math.max(0, Number(shipClass.utilitySlots ?? shipClass.internalModules) || 0);
      const allowedIds = new Set(utilityModulesForShipClass(shipClass).map(item => item.dataName));
      if (dryMassCalcState.slotModules.length > desired) {
        dryMassCalcState.slotModules = dryMassCalcState.slotModules.slice(0, desired);
      }
      dryMassCalcState.slotModules = dryMassCalcState.slotModules.map(id => allowedIds.has(id) ? id : EMPTY_UTILITY_MODULE.dataName);
      while (dryMassCalcState.slotModules.length < desired) {
        dryMassCalcState.slotModules.push(EMPTY_UTILITY_MODULE.dataName);
      }
      normalizeDryMassCalcArmor();
    }

    function normalizeShipDesignSimulationDefaults() {
      if (!dryMassCalcState.simulationDefaults || typeof dryMassCalcState.simulationDefaults !== "object") {
        dryMassCalcState.simulationDefaults = {};
      }
      const defaults = dryMassCalcState.simulationDefaults;
      if (!Number.isFinite(Number(defaults.targetDvKps))) defaults.targetDvKps = state.targetDvKps;
      defaults.targetDvKps = clamp(Number(defaults.targetDvKps), 0, 100000);
      if (typeof defaults.radiatorId !== "string" || !DATA.radiators.some(item => item.id === defaults.radiatorId)) {
        defaults.radiatorId = state.radiatorId || (DATA.radiators[0] && DATA.radiators[0].id) || "";
      }
      return defaults;
    }

    function applyShipDesignSimulationDefaultsToState() {
      const defaults = normalizeShipDesignSimulationDefaults();
      state.targetDvKps = clamp(Number(defaults.targetDvKps), 0, 100000);
      if (DATA.radiators.some(item => item.id === defaults.radiatorId)) {
        state.radiatorId = defaults.radiatorId;
      }
    }

    function resetDryMassCalcState() {
      dryMassCalcState.classId = SHIP_CLASS_OPTIONS[0] ? SHIP_CLASS_OPTIONS[0].dataName : "";
      dryMassCalcState.slotModules = [];
      dryMassCalcState.weaponModules = { nose: [], hull: [] };
      dryMassCalcState.armor = {
        tail: { armorId: DEFAULT_ARMOR_ID, points: 0 },
        hull: { armorId: DEFAULT_ARMOR_ID, points: 0 },
        nose: { armorId: DEFAULT_ARMOR_ID, points: 0 },
      };
      dryMassCalcState.notes = "";
      dryMassCalcState.simulationDefaults = {
        targetDvKps: state.targetDvKps,
        radiatorId: state.radiatorId,
      };
      normalizeShipDesignSimulationDefaults();
      normalizeDryMassCalcSlots();
    }

    function exportedDryMassCalculatorPreset() {
      normalizeDryMassCalcSlots();
      return {
        classId: dryMassCalcState.classId,
        slotModules: dryMassCalcState.slotModules.slice(),
        weaponModules: {
          nose: weaponSelections("nose").slice(),
          hull: weaponSelections("hull").slice(),
        },
        armor: Object.fromEntries(["tail", "hull", "nose"].map(section => {
          const selection = armorSelection(section);
          return [section, {
            armorId: selection.armorId,
            points: selection.points,
          }];
        })),
        notes: String(dryMassCalcState.notes || ""),
        simulationDefaults: cloneJson(normalizeShipDesignSimulationDefaults()),
      };
    }

    function applyDryMassCalculatorPreset(rawCalculator) {
      if (!rawCalculator || typeof rawCalculator !== "object") return false;

      if (typeof rawCalculator.classId === "string" && SHIP_CLASS_OPTIONS.some(item => item.dataName === rawCalculator.classId)) {
        dryMassCalcState.classId = rawCalculator.classId;
      }

      if (Array.isArray(rawCalculator.slotModules)) {
        dryMassCalcState.slotModules = rawCalculator.slotModules.filter(item => typeof item === "string");
      }

      if (rawCalculator.weaponModules && typeof rawCalculator.weaponModules === "object") {
        ["nose", "hull"].forEach(section => {
          const values = rawCalculator.weaponModules[section];
          if (Array.isArray(values)) {
            dryMassCalcState.weaponModules[section] = values.filter(item => typeof item === "string");
          }
        });
      }

      if (rawCalculator.armor && typeof rawCalculator.armor === "object") {
        ["tail", "hull", "nose"].forEach(section => {
          const rawSelection = rawCalculator.armor[section];
          if (!rawSelection || typeof rawSelection !== "object") return;
          const selection = armorSelection(section);
          if (typeof rawSelection.armorId === "string" && ARMOR_OPTIONS.some(item => item.dataName === rawSelection.armorId)) {
            selection.armorId = rawSelection.armorId;
          }
          if (Number.isFinite(Number(rawSelection.points))) {
            selection.points = Math.round(Number(rawSelection.points));
          }
        });
      }

      if (typeof rawCalculator.notes === "string") {
        dryMassCalcState.notes = rawCalculator.notes.slice(0, 2000);
      }

      if (rawCalculator.simulationDefaults && typeof rawCalculator.simulationDefaults === "object") {
        const rawDefaults = rawCalculator.simulationDefaults;
        if (!dryMassCalcState.simulationDefaults || typeof dryMassCalcState.simulationDefaults !== "object") {
          dryMassCalcState.simulationDefaults = {};
        }
        if (Number.isFinite(Number(rawDefaults.targetDvKps))) {
          dryMassCalcState.simulationDefaults.targetDvKps = clamp(Number(rawDefaults.targetDvKps), 0, 100000);
        }
        if (typeof rawDefaults.radiatorId === "string" && DATA.radiators.some(item => item.id === rawDefaults.radiatorId)) {
          dryMassCalcState.simulationDefaults.radiatorId = rawDefaults.radiatorId;
        }
      }
      normalizeShipDesignSimulationDefaults();

      normalizeDryMassCalcSlots();
      return true;
    }

    function dryMassCalcModuleTotals() {
      const utilityTotals = dryMassCalcState.slotModules
        .map(selectedModuleById)
        .reduce((totals, module) => {
          totals.massTons += Number(module.massTons) || 0;
          totals.crew += Number(module.crew) || 0;
          totals.powerMW += Number(module.powerRequirementMW) || 0;
          return totals;
        }, { massTons: 0, crew: 0, powerMW: 0 });
      const weaponTotals = ["nose", "hull"]
        .flatMap(section => weaponSelections(section).map(selectedWeaponById))
        .reduce((totals, module) => {
          totals.massTons += Number(module.massTons) || 0;
          totals.crew += Number(module.crew) || 0;
          return totals;
        }, { massTons: 0, crew: 0 });
      return {
        utilityMassTons: utilityTotals.massTons,
        weaponMassTons: weaponTotals.massTons,
        massTons: utilityTotals.massTons + weaponTotals.massTons,
        utilityCrew: utilityTotals.crew,
        weaponCrew: weaponTotals.crew,
        crew: utilityTotals.crew + weaponTotals.crew,
        powerMW: utilityTotals.powerMW,
      };
    }

    function dryMassCalcTotalTons() {
      const shipClass = selectedShipClass();
      if (!shipClass) return 0;
      return (Number(shipClass.massTons) || 0) + dryMassCalcModuleTotals().massTons + dryMassCalcArmorTotals(shipClass).massTons;
    }

    function renderWeaponSection(section, shipClass) {
      const capacity = hardpointCapacity(shipClass, section);
      const used = usedWeaponHardpoints(section);
      const remaining = Math.max(0, capacity - used);
      const label = section === "nose" ? localText("함수", "Nose") : localText("함체", "Hull");
      if (capacity <= 0) {
        return `
          <div class="calc-weapon-group">
            <div class="calc-group-header">
              <strong>${escapeHtml(label)}</strong>
              <span class="calc-capacity">0 HP</span>
            </div>
            <div class="calc-empty">${escapeHtml(localText("하드포인트 없음", "No hardpoints"))}</div>
          </div>
        `;
      }

      const selections = weaponSelections(section);
      const rows = selections.map((selectedId, index) => {
        const selectedWeapon = selectedWeaponById(selectedId);
        const usedWithoutCurrent = used - weaponSlotSize(selectedWeapon);
        const fitLimit = Math.max(0, capacity - usedWithoutCurrent);
        const options = weaponModulesForSection(section)
          .filter(item => item.dataName === EMPTY_WEAPON_MODULE.dataName || weaponSlotSize(item) <= fitLimit + 1e-9)
          .map(item => `<option value="${escapeHtml(item.dataName)}"${item.dataName === selectedId ? " selected" : ""}>${escapeHtml(weaponOptionLabel(item))}</option>`)
          .join("");
        return `
          <div class="calc-slot-row">
            <span>${escapeHtml(label)} ${index + 1}</span>
            <select id="dryMassCalcWeapon${section}${index}" data-weapon-section="${section}" data-weapon-index="${index}" data-searchable-select="true">${options}</select>
            <span class="calc-slot-mass">${escapeHtml(formatNumber(Number(selectedWeapon.massTons) || 0, " t"))}</span>
          </div>
        `;
      });

      if (remaining > 1e-9) {
        const options = weaponModulesForSection(section)
          .filter(item => item.dataName === EMPTY_WEAPON_MODULE.dataName || weaponSlotSize(item) <= remaining + 1e-9)
          .map(item => `<option value="${escapeHtml(item.dataName)}">${escapeHtml(item.dataName === EMPTY_WEAPON_MODULE.dataName ? localText("무장 추가", "Add weapon") : weaponOptionLabel(item))}</option>`)
          .join("");
        rows.push(`
          <div class="calc-slot-row">
            <span>${escapeHtml(localText("추가", "Add"))}</span>
            <select id="dryMassCalcWeapon${section}New" data-weapon-section="${section}" data-weapon-index="new" data-searchable-select="true">${options}</select>
            <span class="calc-slot-mass">${escapeHtml(formatHardpointSize(remaining))} HP</span>
          </div>
        `);
      }

      return `
        <div class="calc-weapon-group">
          <div class="calc-group-header">
            <strong>${escapeHtml(label)}</strong>
            <span class="calc-capacity">${escapeHtml(formatHardpointSize(used))} / ${escapeHtml(formatHardpointSize(capacity))} HP</span>
          </div>
          ${rows.join("") || `<div class="calc-empty">${escapeHtml(localText("남은 하드포인트 없음", "No remaining hardpoints"))}</div>`}
        </div>
      `;
    }

    function renderArmorRows(shipClass) {
      if (!ARMOR_OPTIONS.length) {
        return `<div class="calc-empty">${escapeHtml(localText("장갑 카탈로그 없음", "No armor catalog"))}</div>`;
      }
      const sectionLabels = {
        tail: localText("함미", "Tail"),
        hull: localText("함체", "Hull"),
        nose: localText("함수", "Nose"),
      };
      return ["tail", "hull", "nose"].map(section => {
        const selection = armorSelection(section);
        const selectedArmor = selectedArmorById(selection.armorId);
        const maxPoints = armorMaxPoints(shipClass, section, selectedArmor);
        const massTons = armorMassTons(section, shipClass);
        const options = sortedByCatalogTitle(ARMOR_OPTIONS)
          .map(item => `<option value="${escapeHtml(item.dataName)}"${item.dataName === selection.armorId ? " selected" : ""}>${escapeHtml(catalogDisplayName(item))}</option>`)
          .join("");
        return `
          <div class="calc-armor-row">
            <div class="calc-armor-title">${escapeHtml(sectionLabels[section])}</div>
            <select id="dryMassCalcArmor${section}" data-armor-section="${section}" data-armor-field="type" data-searchable-select="true">${options}</select>
            <div class="calc-armor-point-row">
              <input id="dryMassCalcArmor${section}Points" type="number" min="0" max="${escapeHtml(maxPoints)}" step="1" value="${escapeHtml(selection.points)}" data-armor-section="${section}" data-armor-field="points">
              <span class="calc-slot-mass">${escapeHtml(formatNumber(massTons, " t"))}</span>
            </div>
          </div>
        `;
