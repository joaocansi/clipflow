/** Parsed color, normalized to 0-255 RGB channels and 0-1 alpha. */
export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const clamp = (n: number, lo = 0, hi = 255) => Math.min(hi, Math.max(lo, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHsl(c: RGBA): { h: number; s: number; l: number } {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const alpha = (token: string | undefined): number => {
  if (token == null) return 1;
  return token.endsWith("%") ? parseFloat(token) / 100 : parseFloat(token);
};

/**
 * Parse a CSS color string (hex 3/4/6/8, rgb(), rgba(), hsl(), hsla()).
 * Returns null when the input isn't a recognizable color.
 */
export function parseColor(input: string): RGBA | null {
  const s = input.trim().toLowerCase();

  const hex = s.replace(/^#/, "");
  if (/^[0-9a-f]+$/.test(hex)) {
    if (hex.length === 3 || hex.length === 4) {
      const [r, g, b] = [0, 1, 2].map((i) => parseInt(hex[i] + hex[i], 16));
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return { r, g, b, a };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
  }

  let m = s.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/
  );
  if (m) {
    return {
      r: clamp(Math.round(parseFloat(m[1]))),
      g: clamp(Math.round(parseFloat(m[2]))),
      b: clamp(Math.round(parseFloat(m[3]))),
      a: clamp(alpha(m[4]), 0, 1),
    };
  }

  m = s.match(
    /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.]+%?))?\s*\)$/
  );
  if (m) {
    const { r, g, b } = hslToRgb(parseFloat(m[1]), parseFloat(m[2]) / 100, parseFloat(m[3]) / 100);
    return { r, g, b, a: clamp(alpha(m[4]), 0, 1) };
  }

  return null;
}

const hh = (n: number) => clamp(Math.round(n)).toString(16).padStart(2, "0");

export const toHex = (c: RGBA): string =>
  `#${hh(c.r)}${hh(c.g)}${hh(c.b)}${c.a < 1 ? hh(c.a * 255) : ""}`;

export const toRgbString = (c: RGBA): string =>
  c.a < 1 ? `rgba(${c.r}, ${c.g}, ${c.b}, ${round2(c.a)})` : `rgb(${c.r}, ${c.g}, ${c.b})`;

export const toHslString = (c: RGBA): string => {
  const { h, s, l } = rgbToHsl(c);
  return c.a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${round2(c.a)})` : `hsl(${h}, ${s}%, ${l}%)`;
};

/** A CSS value safe to drop straight into a swatch's background. */
export const cssColor = (c: RGBA): string => `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
