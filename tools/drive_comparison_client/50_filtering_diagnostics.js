    function rowCategoryLabel(row) {
      return UI_LANG === "en" ? (row.categoryLabelEn || row.categoryLabel) : (row.categoryLabel || row.categoryLabelEn);
    }

    function rowFamilyLabel(row) {
      return UI_LANG === "en" ? (row.familyLabelEn || row.familyLabel) : (row.familyLabel || row.familyLabelEn);
    }

    function rowProjectLabel(row) {
      return UI_LANG === "en"
        ? (row.requiredProjectDisplay.en || row.requiredProjectDisplay.ko || row.requiredProject)
        : (row.requiredProjectDisplay.ko || row.requiredProjectDisplay.en || row.requiredProject);
    }

    function syncFilterInputs() {
      document.querySelectorAll(".category-row").forEach(row => {
        const input = row.querySelector("input");
        input.checked = !!state.categories[row.dataset.categoryKey];
      });
      document.querySelectorAll(".family-row").forEach(row => {
        const activeCategory = !!state.categories[row.dataset.categoryKey];
        const input = row.querySelector("input");
        row.style.display = activeCategory ? "" : "none";
        input.disabled = !activeCategory;
        input.checked = !!state.families[row.dataset.familyKey];
      });
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function filteredRows() {
      return computeDriveDiagnostics().visibleRows;
    }

    function computeDriveDiagnostics() {
      const familyStats = new Map(DATA.subfamilies.map(family => [family.key, {
        ...family,
        total: 0,
        visible: 0,
        hidden: 0,
        selected: !!state.categories[family.categoryKey] && !!state.families[family.key],
        hiddenReasons: {},
      }]));
      const visibleRows = [];
      DATA.drives.forEach(row => {
        const evaluation = evaluateDriveVisibility(row);
        if (evaluation.visible) visibleRows.push(row);
        if (!rowInFamilyDiagnosticScope(row)) return;
        const stats = familyStats.get(row.familyKey);
        if (!stats) return;
        stats.total += 1;
        if (evaluation.visible) {
          stats.visible += 1;
        } else if (stats.selected) {
          stats.hidden += 1;
          const reasons = evaluation.reasons.filter(reason => reason !== "familyFilter");
          (reasons.length ? reasons : ["other"]).forEach(reason => {
            stats.hiddenReasons[reason] = (stats.hiddenReasons[reason] || 0) + 1;
          });
        }
      });
      const families = DATA.subfamilies.map(family => {
        const stats = familyStats.get(family.key);
        return {
          ...stats,
          dominantReason: dominantHiddenReason(stats.hiddenReasons),
        };
      });
      return {
        visibleRows,
        families,
        zeroFamilies: families.filter(family => family.selected && family.total > 0 && family.visible === 0),
      };
    }

    function evaluateDriveVisibility(row) {
      const reasons = [];
      if (row.thrusterCount !== state.thrusters || !rowMatchesSearch(row) || !rowFamilySelected(row)) {
        reasons.push("familyFilter");
      }
      if (!Number.isFinite(rowUnlockResearchValue(row)) || rowUnlockResearchValue(row) <= 0) {
        reasons.push("researchFilter");
      }
      if (isBandMetric()) {
        reasons.push(...bandMetricHiddenReasons(row));
      } else {
        const value = metricDefs[state.metric].value(row);
        if (!Number.isFinite(value) || value <= 0) reasons.push("axisRange");
      }
      return {
        visible: reasons.length === 0,
        reasons: [...new Set(reasons)],
      };
    }

    function rowFamilySelected(row) {
      return !!state.categories[row.categoryKey] && !!state.families[row.familyKey];
    }

    function rowInFamilyDiagnosticScope(row) {
      return row.thrusterCount === state.thrusters && rowMatchesSearch(row);
    }

    function rowMatchesSearch(row) {
      if (!state.searchTerm) return true;
      const haystack = [
        row.displayName,
        row.baseDisplayName,
        row.requiredProject,
        rowProjectLabel(row),
        rowCategoryLabel(row),
        rowFamilyLabel(row),
      ].join(" ").toLocaleLowerCase();
      return haystack.includes(state.searchTerm);
    }

    function bandMetricHiddenReasons(row) {
      const configuredOptions = row.powerOptions || row.reactorOptions || [];
      if (!configuredOptions.length) return ["invalidPowerPlant"];
      const massInfo = massRatioDiagnostics(row);
      const options = massOptions(row);
      if (!options.length) {
        if (massInfo.overflow || massInfo.extreme) return ["targetDvOrMassRatio"];
        return [massInfo.invalid ? "invalidComputation" : "invalidPowerPlant"];
      }
      const finiteMetricOptions = options.filter(option => Number.isFinite(optionMetricValue(option)) && optionMetricValue(option) > 0);
      if (!finiteMetricOptions.length) return ["invalidComputation"];
      const reasons = [];
      if ((state.metric === "totalMassTons" || state.metric === "fuelMassTons") && state.minTwr > 0 && !state.showImpracticalCandidates) {
        const twrPassing = finiteMetricOptions.some(option => Number.isFinite(option.twr) && option.twr >= state.minTwr);
        if (!twrPassing) {
          reasons.push("minTwr");
          if (massInfo.extreme || massInfo.overflow || finiteMetricOptions.some(isExtremeMassRatioOption)) {
            reasons.push("targetDvOrMassRatio");
          }
        }
      }
      if (state.metric === "twr" && state.minDvKps > 0 && !state.showImpracticalCandidates) {
        const dvPassing = finiteMetricOptions.some(
          option => Number.isFinite(option.maxPracticalDvKps) && option.maxPracticalDvKps >= state.minDvKps,
        );
        if (!dvPassing) reasons.push("minDv");
      }
      return reasons;
    }

    function massRatioDiagnostics(row) {
      const targetDv = Number(state.targetDvKps);
      const exhaustVelocity = Number(row.exhaustVelocityKps);
      if (!Number.isFinite(targetDv) || !Number.isFinite(exhaustVelocity) || exhaustVelocity <= 0) {
        return { invalid: true, overflow: false, extreme: false, massRatio: NaN };
      }
      const exponent = targetDv / exhaustVelocity;
      if (!Number.isFinite(exponent)) {
        return { invalid: true, overflow: false, extreme: false, massRatio: NaN };
      }
      if (exponent > MASS_RATIO_OVERFLOW_EXPONENT) {
        return { invalid: false, overflow: true, extreme: true, massRatio: Infinity };
      }
      const massRatio = Math.exp(exponent);
      return {
        invalid: !Number.isFinite(massRatio),
        overflow: !Number.isFinite(massRatio),
        extreme: Number.isFinite(massRatio) && massRatio >= EXTREME_MASS_RATIO,
        massRatio,
      };
    }

    function isExtremeMassRatioOption(option) {
      return Number.isFinite(option.massRatio) && option.massRatio >= EXTREME_MASS_RATIO;
    }

    function isImpracticalOption(option) {
      if (!state.showImpracticalCandidates) return false;
      return ((state.metric === "totalMassTons" || state.metric === "fuelMassTons") && state.minTwr > 0 && Number.isFinite(option.twr) && option.twr < state.minTwr)
        || isExtremeMassRatioOption(option);
    }

    function dominantHiddenReason(hiddenReasons) {
      return HIDDEN_REASON_PRIORITY.find(reason => (hiddenReasons && hiddenReasons[reason] > 0)) || "other";
    }

    function rowUnlockResearchValue(row) {
      const value = Number(row.unlockCumulativeResearch);
      if (Number.isFinite(value) && value > 0) return value;
      return Number(row.cumulativeResearch);
    }

    function selectedRadiator() {
      return DATA.radiators.find(item => item.id === state.radiatorId) || DATA.radiators[0] || null;
    }

    function massOptions(row) {
      const baseDryTons = state.dryMassTons;
      const targetDv = state.targetDvKps;
      const radiator = selectedRadiator();
      const radiatorSpecificPower = radiator ? Number(radiator.specificPowerKWPerKg) : NaN;
      const massRatioMinusOne = Math.exp(targetDv / row.exhaustVelocityKps) - 1;
      if (!Number.isFinite(massRatioMinusOne) || massRatioMinusOne < 0) return [];
      const massRatio = massRatioMinusOne + 1;
      const options = row.powerOptions || row.reactorOptions || [];
      const computed = options.map(option => {
        const selfContained = !!option.selfContained || row.powerRequirementGW <= 0;
        const powerPlantMassTons = selfContained ? 0 : Math.max(1, option.specificMassTonsPerGW * row.powerRequirementGW);
        const wasteHeatGW = selfContained || row.openCycleCooling ? 0 : row.powerRequirementGW * (1 - option.efficiency);
        const radiatorMassTons = !selfContained && radiatorSpecificPower > 0
          ? Math.max(0, wasteHeatGW * 1_000_000 / radiatorSpecificPower / 1000)
          : 0;
        const hardwareMassTons = row.driveMassTons + powerPlantMassTons + radiatorMassTons;
        const dryWithHardwareTons = baseDryTons + hardwareMassTons;
        const propellantTons = dryWithHardwareTons * massRatioMinusOne;
        const totalMassTons = dryWithHardwareTons + propellantTons;
        const twr = row.thrustN / (totalMassTons * 1000 * STANDARD_GRAVITY_MPS2);
        return {
          ...option,
          reactorMassTons: powerPlantMassTons,
          powerPlantMassTons,
          radiatorMassTons,
          wasteHeatGW,
          hardwareMassTons,
          baseDryTons,
          dryWithHardwareTons,
          propellantTons,
          totalMassTons,
          twr,
          maxPracticalDvKps: row.exhaustVelocityKps * Math.log(EXTREME_MASS_RATIO),
          massRatio,
          massRatioMinusOne,
        };
      });
      return actualPowerFrontier(row, computed);
    }

    function chartMassOptions(row, metric = state.metric) {
      const options = massOptions(row);
      if ((metric === "totalMassTons" || metric === "fuelMassTons") && state.minTwr > 0 && !state.showImpracticalCandidates) {
        return options.filter(option => Number.isFinite(option.twr) && option.twr >= state.minTwr);
      }
      if (metric === "twr" && state.minDvKps > 0 && !state.showImpracticalCandidates) {
        return options.filter(option => Number.isFinite(option.maxPracticalDvKps) && option.maxPracticalDvKps >= state.minDvKps);
      }
      return options;
    }

    function chartSummaryMassOptions(row) {
      const options = chartMassOptions(row);
      return powerResearchActive() ? options : options.slice(0, 1);
    }

    function actualPowerFrontier(row, options) {
      if (row.requiredPowerPlantClass !== "Any_General" || row.powerRequirementGW <= 0 || options.length <= 1) {
        return options;
      }
      const frontier = [];
      let bestTotalMass = Infinity;
      options.forEach((option, index) => {
        if (index === 0 || option.totalMassTons < bestTotalMass * (1 - 1e-9)) {
          frontier.push(option);
          bestTotalMass = Math.min(bestTotalMass, option.totalMassTons);
        }
      });
      return frontier;
    }

