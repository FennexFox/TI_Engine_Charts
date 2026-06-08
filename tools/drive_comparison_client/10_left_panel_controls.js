    function setupControls() {
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
      const showTwrInfo = document.getElementById("showTwrInfo");
      const showMassInfo = document.getElementById("showMassInfo");
      const paretoHighlight = document.getElementById("paretoHighlight");
      const showImpracticalCandidates = document.getElementById("showImpracticalCandidates");
      const powerResearchToggle = document.getElementById("powerResearchToggle");
      const minTwrExp = document.getElementById("minTwrExp");
      const minTwrNumber = document.getElementById("minTwrNumber");
      const minDv = document.getElementById("minDv");
      const minDvNumber = document.getElementById("minDvNumber");
      const presetExport = document.getElementById("presetExport");
      const presetImport = document.getElementById("presetImport");
      const nameSearch = document.getElementById("nameSearch");

      applyStartupChartPreset();
      const languageSelect = document.getElementById("uiLanguageSelect");
      if (languageSelect) {
        languageSelect.addEventListener("change", () => setLanguage(languageSelect.value));
      }
      applyStaticLanguage();
      setupLeftPanelCards();
      applyHelp(showTwrInfo.closest(".check-row"), helpText("showTwrInfo"));
      applyHelp(showMassInfo.closest(".check-row"), helpText("showMassInfo"));
      applyHelp(paretoHighlight.closest(".check-row"), helpText("paretoHighlight"));
      applyHelp(showImpracticalCandidates.closest(".check-row"), helpText("showImpracticalCandidates"));
      applyHelp(document.querySelector("#minTwrControl .label"), helpText("minTwr"));
      applyHelp(document.querySelector("#minDvControl .label"), helpText("minDv"));

      metric.value = state.metric;
      enhanceSearchableSelect(metric);
      dryMass.value = String(clamp(state.dryMassTons, Number(dryMass.min), Number(dryMass.max)));
      dryMassNumber.value = String(Math.round(state.dryMassTons));
      targetDv.value = String(clamp(state.targetDvKps, Number(targetDv.min), Number(targetDv.max)));
      targetDvNumber.value = String(Math.round(state.targetDvKps));

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
        state.targetDvKps = Number(targetDv.value);
        targetDvNumber.value = String(Math.round(state.targetDvKps));
        render();
      });
      targetDvNumber.addEventListener("input", () => {
        const raw = Number(targetDvNumber.value);
        const value = clamp(Number.isFinite(raw) ? raw : 0, 0, 100000);
        state.targetDvKps = value;
        targetDv.value = String(clamp(value, Number(targetDv.min), Number(targetDv.max)));
        render();
      });
      radiator.addEventListener("change", () => {
        state.radiatorId = radiator.value;
        render();
      });
      logX.addEventListener("change", () => {
        state.logX = logX.checked;
        render();
      });
      logY.addEventListener("change", () => {
        state.logY = logY.checked;
        render();
      });
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
      showImpracticalCandidates.addEventListener("change", () => {
        state.showImpracticalCandidates = showImpracticalCandidates.checked;
        render();
      });
      powerResearchToggle.addEventListener("click", () => {
        if (chartViewport && chartViewport.xDomain && chartViewport.yDomain) {
          state.zoom = {
            xDomain: chartViewport.xDomain.slice(),
            yDomain: chartViewport.yDomain.slice(),
          };
          state.preserveViewportOnce = true;
        }
        state.usePowerResearch = !state.usePowerResearch;
        render();
      });
      minTwrExp.addEventListener("input", () => {
        const exponent = Number(minTwrExp.value);
        state.minTwr = Math.pow(10, exponent);
        syncMinTwrInputs();
        render();
      });
      minTwrNumber.addEventListener("input", () => {
        state.minTwr = clamp(Number(minTwrNumber.value) || 0.0001, 0.0001, 10);
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
      setupDryMassCalculator();
      refreshSourceNote();
      refreshLocalizedControls();
      syncFilterInputs();
      setupChartInteraction();
      updateChartControls();
      updateSortHeaders();
    }

    function refreshSourceNote() {
      const gameVersionParts = [
        `${localText("게임 버전", "Game version")}: ${DATA.source.gameVersion || "unknown"}`,
      ];
      if (DATA.source.steamBuildId) gameVersionParts.push(`Steam build ${DATA.source.steamBuildId}`);
      document.getElementById("sourceNote").textContent = `${localText("소스", "Source")}: ${DATA.source.driveTemplate}; ${DATA.source.radiatorTemplate}; ${DATA.source.shipCatalog}; ${gameVersionParts.join("; ")}`;
    }

    function setupChartInteraction() {
      const resetZoom = document.getElementById("resetZoom");
      resetZoom.addEventListener("click", () => {
        state.zoom = null;
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
        redrawChartOnly();
      });
      document.addEventListener("keydown", handleChartKeyDown);
    }

    function updateChartControls() {
      const fuelUnitBlock = document.getElementById("chartFuelUnit");
      const bandAnalysisControls = document.getElementById("bandAnalysisControls");
      const showTwrInfoRow = document.getElementById("showTwrInfoRow");
      const showMassInfoRow = document.getElementById("showMassInfoRow");
      const minTwrControl = document.getElementById("minTwrControl");
      const minDvControl = document.getElementById("minDvControl");
      const powerResearchToggle = document.getElementById("powerResearchToggle");
      fuelUnitBlock.style.display = state.metric === "fuelEfficiency" ? "" : "none";
      bandAnalysisControls.style.display = isBandMetric() ? "" : "none";
      showTwrInfoRow.style.display = (state.metric === "totalMassTons" || state.metric === "fuelMassTons") ? "" : "none";
      showMassInfoRow.style.display = state.metric === "twr" ? "" : "none";
      minTwrControl.style.display = (state.metric === "totalMassTons" || state.metric === "fuelMassTons") ? "" : "none";
      minDvControl.style.display = state.metric === "twr" ? "" : "none";
      powerResearchToggle.style.display = isBandMetric() ? "" : "none";
      powerResearchToggle.setAttribute("aria-pressed", state.usePowerResearch ? "true" : "false");
      const showImpracticalCandidates = document.getElementById("showImpracticalCandidates");
      if (showImpracticalCandidates) showImpracticalCandidates.checked = !!state.showImpracticalCandidates;
      syncMinTwrInputs();
      syncMinDvInputs();
    }

    function syncMinTwrInputs() {
      const slider = document.getElementById("minTwrExp");
      const number = document.getElementById("minTwrNumber");
      const readout = document.getElementById("minTwrReadout");
      if (!slider || !number || !readout) return;
      state.minTwr = clamp(state.minTwr || 0.0001, 0.0001, 10);
      const exponent = clamp(Math.log10(state.minTwr), Number(slider.min), Number(slider.max));
      slider.value = String(exponent);
      number.value = String(Number(state.minTwr.toPrecision(4)));
      readout.textContent = `${UI_LANG === "en" ? "Showing" : "표시"}: TWR >= ${formatTwrDynamicUnit(state.minTwr)}`;
    }

    function syncMinDvInputs() {
      const slider = document.getElementById("minDv");
      const number = document.getElementById("minDvNumber");
      const readout = document.getElementById("minDvReadout");
      if (!slider || !number || !readout) return;
      state.minDvKps = clamp(state.minDvKps || 0, 0, 100000);
      slider.value = String(clamp(state.minDvKps, Number(slider.min), Number(slider.max)));
      number.value = String(Math.round(state.minDvKps));
      readout.textContent = `${UI_LANG === "en" ? "Showing" : "표시"}: dV >= ${formatNumber(state.minDvKps, " km/s")}`;
    }

