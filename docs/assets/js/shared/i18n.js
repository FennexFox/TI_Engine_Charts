const LANGUAGE_STORAGE_KEY = "tiEngineChartLanguage";

function normalizeLanguage(lang) {
  return lang === "en" ? "en" : "ko";
}

export let UI_LANG = document.documentElement.lang === "en" ? "en" : "ko";

const savedLanguage = (() => {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
})();
if (savedLanguage === "en" || savedLanguage === "ko") UI_LANG = savedLanguage;

export function currentLanguage() {
  return UI_LANG;
}

export function setUiLanguage(lang) {
  UI_LANG = normalizeLanguage(lang);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, UI_LANG);
  } catch {
    // Keep the in-memory language even when persistence is unavailable.
  }
  return UI_LANG;
}

export function localText(ko, en) {
  return UI_LANG === "en" ? en : ko;
}
