const STORAGE_KEY = "ewms:v1";

const seedState = {
  version: 1,
  theme: "light",
  ui: { taskFilters: {}, projectFilters: {} },
};

export function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState;
    const parsed = JSON.parse(raw);
    return { ...seedState, theme: parsed.theme, ui: parsed.ui };
  } catch {
    return seedState;
  }
}

export function writeStorage(payload) {
  // Only save theme and UI preferences
  const toSave = {
    version: payload.version || 1,
    theme: payload.theme,
    ui: payload.ui,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

export { STORAGE_KEY, seedState };
