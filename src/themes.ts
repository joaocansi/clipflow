import { Theme } from "./api";

/**
 * Built-in themes. These are always available (even if the user deletes the
 * seeded files); themes loaded from the backend folder are merged on top and
 * override these by `id`.
 */
export const BUILTIN_THEMES: Theme[] = [
  {
    id: "dark",
    name: "Dark",
    panel: "rgba(24, 24, 27, 0.96)",
    surface: "rgba(0, 0, 0, 0.22)",
    text: "#f4f4f5",
    text_dim: "#a1a1aa",
    border: "rgba(255, 255, 255, 0.10)",
    selection: "rgba(255, 255, 255, 0.14)",
    hover: "rgba(255, 255, 255, 0.06)",
    accent: "#6366f1",
    accent_soft: "rgba(99, 102, 241, 0.28)",
    accent_text: "#c7d2fe",
  },
  {
    id: "light",
    name: "Light",
    panel: "rgba(250, 250, 252, 0.98)",
    surface: "rgba(0, 0, 0, 0.04)",
    text: "#18181b",
    text_dim: "#52525b",
    border: "rgba(0, 0, 0, 0.12)",
    selection: "rgba(0, 0, 0, 0.08)",
    hover: "rgba(0, 0, 0, 0.04)",
    accent: "#4f46e5",
    accent_soft: "rgba(79, 70, 229, 0.14)",
    accent_text: "#4338ca",
  },
  {
    id: "dark-green",
    name: "Dark Green",
    panel: "rgba(12, 26, 20, 0.96)",
    surface: "rgba(0, 0, 0, 0.25)",
    text: "#e7f3ec",
    text_dim: "#8fb3a1",
    border: "rgba(255, 255, 255, 0.08)",
    selection: "rgba(16, 185, 129, 0.16)",
    hover: "rgba(255, 255, 255, 0.05)",
    accent: "#10b981",
    accent_soft: "rgba(16, 185, 129, 0.24)",
    accent_text: "#a7f3d0",
  },
  {
    id: "dark-blue",
    name: "Dark Blue",
    panel: "rgba(12, 18, 33, 0.96)",
    surface: "rgba(0, 0, 0, 0.25)",
    text: "#e6edf7",
    text_dim: "#93a4c0",
    border: "rgba(255, 255, 255, 0.08)",
    selection: "rgba(59, 130, 246, 0.18)",
    hover: "rgba(255, 255, 255, 0.05)",
    accent: "#3b82f6",
    accent_soft: "rgba(59, 130, 246, 0.26)",
    accent_text: "#bfdbfe",
  },
];

export const DEFAULT_THEME_ID = "dark";

/** Merge backend (custom) themes over the built-ins, de-duped by id. */
export function mergeThemes(builtins: Theme[], custom: Theme[]): Theme[] {
  const byId = new Map<string, Theme>();
  for (const t of builtins) byId.set(t.id, t);
  for (const t of custom) byId.set(t.id, t);
  return [...byId.values()].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );
}

/** Rough relative luminance of a CSS color (hex or rgb/rgba); 0=dark, 1=light. */
function luminance(color: string): number {
  let r = 0;
  let g = 0;
  let b = 0;
  const hex = color.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (hex) {
    const n = parseInt(hex[1], 16);
    r = (n >> 16) & 255;
    g = (n >> 8) & 255;
    b = n & 255;
  } else {
    const m = color.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(",").map((s) => parseFloat(s));
      [r, g, b] = p;
    }
  }
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** True if the theme's panel is light enough to need dark foreground accents. */
export function isLightTheme(t: Theme): boolean {
  return luminance(t.panel) > 0.6;
}

/** Apply a theme by writing its colors as `--cf-*` CSS variables on :root. */
export function applyTheme(t: Theme) {
  const r = document.documentElement.style;
  r.setProperty("--cf-panel", t.panel);
  r.setProperty("--cf-surface", t.surface);
  r.setProperty("--cf-text", t.text);
  r.setProperty("--cf-text-dim", t.text_dim);
  r.setProperty("--cf-border", t.border);
  r.setProperty("--cf-selection", t.selection);
  r.setProperty("--cf-hover", t.hover);
  r.setProperty("--cf-accent", t.accent);
  r.setProperty("--cf-accent-soft", t.accent_soft);
  r.setProperty("--cf-accent-text", t.accent_text);
}
