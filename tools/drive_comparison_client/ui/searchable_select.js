import { localText } from "../state/core.js";

export function searchableSelectLabel(select) {
      const selected = select && select.selectedOptions && select.selectedOptions[0];
      return selected ? selected.textContent.trim() : "";
    }

export function searchableSelectOptions(select) {
      const rows = [];
      Array.from(select.children || []).forEach(child => {
        if (child.tagName === "OPTGROUP") {
          const group = child.label || "";
          rows.push({ type: "group", label: group });
          Array.from(child.children || []).forEach(option => {
            rows.push({
              type: "option",
              value: option.value,
              label: option.textContent.trim(),
              group,
              disabled: option.disabled,
              selected: option.selected,
            });
          });
        } else if (child.tagName === "OPTION") {
          rows.push({
            type: "option",
            value: child.value,
            label: child.textContent.trim(),
            group: "",
            disabled: child.disabled,
            selected: child.selected,
          });
        }
      });
      return rows;
    }

export function closeSearchableSelect(wrapper) {
      const menu = wrapper && wrapper.querySelector(".searchable-select-menu");
      const trigger = wrapper && wrapper.querySelector(".searchable-select-trigger");
      if (menu) menu.hidden = true;
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    }

export function closeOtherSearchableSelects(activeWrapper = null) {
      document.querySelectorAll(".searchable-select").forEach(wrapper => {
        if (wrapper !== activeWrapper) closeSearchableSelect(wrapper);
      });
    }

export function renderSearchableSelectOptions(select, wrapper, query = "") {
      const list = wrapper.querySelector(".searchable-select-options");
      if (!list) return;
      const normalizedQuery = String(query || "").trim().toLocaleLowerCase();
      const rows = searchableSelectOptions(select);
      list.innerHTML = "";
      let visibleOptions = 0;
      let currentGroupElement = null;
      let currentGroupVisible = false;
      rows.forEach(row => {
        if (row.type === "group") {
          currentGroupElement = document.createElement("div");
          currentGroupElement.className = "searchable-select-group";
          currentGroupElement.textContent = row.label;
          currentGroupElement.hidden = true;
          list.appendChild(currentGroupElement);
          currentGroupVisible = false;
          return;
        }
        const haystack = `${row.label} ${row.value} ${row.group}`.toLocaleLowerCase();
        if (normalizedQuery && !haystack.includes(normalizedQuery)) return;
        if (currentGroupElement && !currentGroupVisible) {
          currentGroupElement.hidden = false;
          currentGroupVisible = true;
        }
        const button = document.createElement("button");
        button.type = "button";
        button.className = `searchable-select-option${row.selected ? " is-selected" : ""}`;
        button.dataset.value = row.value;
        button.disabled = !!row.disabled;
        button.textContent = row.label;
        button.addEventListener("click", () => {
          select.value = row.value;
          const value = wrapper.querySelector(".searchable-select-value");
          if (value) value.textContent = searchableSelectLabel(select);
          closeSearchableSelect(wrapper);
          select.dispatchEvent(new Event("change", { bubbles: true }));
        });
        list.appendChild(button);
        visibleOptions += 1;
      });
      if (!visibleOptions) {
        const empty = document.createElement("div");
        empty.className = "searchable-select-empty";
        empty.textContent = localText("검색 결과 없음", "No matching results");
        list.appendChild(empty);
      }
    }

export function enhanceSearchableSelect(select) {
      if (!select || select.dataset.searchableEnhanced === "true") {
        const existingWrapper = select && select.nextElementSibling && select.nextElementSibling.classList.contains("searchable-select")
          ? select.nextElementSibling
          : null;
        if (existingWrapper) {
          const value = existingWrapper.querySelector(".searchable-select-value");
          const search = existingWrapper.querySelector(".searchable-select-search");
          if (value) value.textContent = searchableSelectLabel(select);
          if (search) search.placeholder = localText("검색...", "Search...");
          renderSearchableSelectOptions(select, existingWrapper, "");
        }
        return;
      }
      const wrapper = document.createElement("div");
      wrapper.className = "searchable-select";
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "searchable-select-trigger";
      trigger.setAttribute("aria-haspopup", "listbox");
      trigger.setAttribute("aria-expanded", "false");
      trigger.innerHTML = `<span class="searchable-select-value"></span><span class="searchable-select-caret">▾</span>`;
      const menu = document.createElement("div");
      menu.className = "searchable-select-menu";
      menu.hidden = true;
      const search = document.createElement("input");
      search.type = "search";
      search.className = "searchable-select-search";
      search.placeholder = localText("검색...", "Search...");
      search.autocomplete = "off";
      const options = document.createElement("div");
      options.className = "searchable-select-options";
      options.setAttribute("role", "listbox");
      menu.append(search, options);
      wrapper.append(trigger, menu);
      select.classList.add("native-select-hidden");
      select.dataset.searchableEnhanced = "true";
      select.insertAdjacentElement("afterend", wrapper);

      const value = wrapper.querySelector(".searchable-select-value");
      if (value) value.textContent = searchableSelectLabel(select);
      renderSearchableSelectOptions(select, wrapper, "");

      trigger.addEventListener("click", () => {
        const open = menu.hidden;
        closeOtherSearchableSelects(wrapper);
        menu.hidden = !open;
        trigger.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) {
          search.value = "";
          renderSearchableSelectOptions(select, wrapper, "");
          search.focus();
        }
      });
      search.addEventListener("input", () => renderSearchableSelectOptions(select, wrapper, search.value));
      search.addEventListener("keydown", event => {
        const buttons = Array.from(wrapper.querySelectorAll(".searchable-select-option:not([disabled])"));
        const currentIndex = buttons.indexOf(document.activeElement);
        if (event.key === "ArrowDown") {
          event.preventDefault();
          (buttons[currentIndex + 1] || buttons[0] || search).focus();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          (buttons[currentIndex - 1] || buttons[buttons.length - 1] || search).focus();
        } else if (event.key === "Escape") {
          closeSearchableSelect(wrapper);
          trigger.focus();
        }
      });
      options.addEventListener("keydown", event => {
        const buttons = Array.from(wrapper.querySelectorAll(".searchable-select-option:not([disabled])"));
        const currentIndex = buttons.indexOf(document.activeElement);
        if (event.key === "ArrowDown") {
          event.preventDefault();
          (buttons[currentIndex + 1] || buttons[0] || search).focus();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          (buttons[currentIndex - 1] || search).focus();
        } else if (event.key === "Escape") {
          closeSearchableSelect(wrapper);
          trigger.focus();
        }
      });
    }

export function enhanceSearchableSelects(root = document) {
      root.querySelectorAll("select[data-searchable-select]").forEach(select => enhanceSearchableSelect(select));
      if (!document.body.dataset.searchableSelectGlobalHandlers) {
        document.body.dataset.searchableSelectGlobalHandlers = "true";
        document.addEventListener("click", event => {
          if (!event.target.closest(".searchable-select")) closeOtherSearchableSelects();
        });
      }
    }


