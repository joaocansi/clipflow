import { useCallback, useEffect, useState } from "react";
import { api, Theme } from "../api";
import {
  applyTheme,
  BUILTIN_THEMES,
  DEFAULT_THEME_ID,
  mergeThemes,
} from "../themes";

/**
 * Loads the available themes (built-ins + the user's custom folder), tracks the
 * selected theme (persisted via the `theme` setting), and applies it as CSS
 * variables whenever it changes.
 */
export function useThemes() {
  const [themes, setThemes] = useState<Theme[]>(BUILTIN_THEMES);
  const [themeId, setThemeIdState] = useState<string>(DEFAULT_THEME_ID);

  // Load custom themes from the backend folder and the saved selection.
  useEffect(() => {
    api
      .listThemes()
      .then((custom) => setThemes(mergeThemes(BUILTIN_THEMES, custom)))
      .catch(() => setThemes(BUILTIN_THEMES));
    api.getSetting("theme").then((v) => v && setThemeIdState(v));
  }, []);

  // Apply the active theme (falling back to the first available) on any change.
  useEffect(() => {
    const theme = themes.find((t) => t.id === themeId) ?? themes[0];
    if (theme) applyTheme(theme);
  }, [themeId, themes]);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    api.setSetting("theme", id);
  }, []);

  return { themes, themeId, setThemeId };
}
