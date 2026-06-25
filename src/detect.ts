import { parseColor } from "./lib/color";

/** Lightweight content-type detection used for badges and tool suggestions. */
export function detectType(text: string): string {
  if (text.startsWith("data:image/")) return "image";
  const t = text.trim();
  if (!t) return "empty";
  if (/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\./.test(t)) return "jwt";
  if (/^https?:\/\//.test(t)) return "url";
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(t)) return "email";
  if (/^[\s]*[{[]/.test(t) && /[}\]][\s]*$/.test(t)) {
    try {
      JSON.parse(t);
      return "json";
    } catch {
      /* not valid json */
    }
  }
  if (parseColor(t)) return "color";
  if (/^-?\d{10,13}$/.test(t)) return "timestamp";
  if (/^[0-9a-fA-F]{32}$|^[0-9a-fA-F]{40}$|^[0-9a-fA-F]{64}$/.test(t)) return "hash";
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(t) && t.length % 4 === 0 && t.length >= 8)
    return "base64";
  if (/^\//.test(t) && !t.includes(" ")) return "path";
  if (t.split("\n").length > 1) return "multiline";
  return "text";
}

/** Badge classes for dark themes (light text on a translucent hue). */
export const typeColor: Record<string, string> = {
  jwt: "bg-purple-500/20 text-purple-300",
  url: "bg-blue-500/20 text-blue-300",
  email: "bg-cyan-500/20 text-cyan-300",
  json: "bg-amber-500/20 text-amber-300",
  color: "bg-pink-500/20 text-pink-300",
  image: "bg-fuchsia-500/20 text-fuchsia-300",
  timestamp: "bg-green-500/20 text-green-300",
  hash: "bg-red-500/20 text-red-300",
  base64: "bg-teal-500/20 text-teal-300",
  path: "bg-indigo-500/20 text-indigo-300",
  multiline: "bg-slate-500/20 text-slate-300",
  text: "bg-slate-500/20 text-slate-300",
  empty: "bg-slate-500/20 text-slate-300",
};

/** Badge classes for light themes (dark text for contrast on a pale panel). */
export const typeColorLight: Record<string, string> = {
  jwt: "bg-purple-500/15 text-purple-700",
  url: "bg-blue-500/15 text-blue-700",
  email: "bg-cyan-500/15 text-cyan-700",
  json: "bg-amber-500/15 text-amber-700",
  color: "bg-pink-500/15 text-pink-700",
  image: "bg-fuchsia-500/15 text-fuchsia-700",
  timestamp: "bg-green-500/15 text-green-700",
  hash: "bg-red-500/15 text-red-700",
  base64: "bg-teal-500/15 text-teal-700",
  path: "bg-indigo-500/15 text-indigo-700",
  multiline: "bg-slate-500/15 text-slate-700",
  text: "bg-slate-500/15 text-slate-700",
  empty: "bg-slate-500/15 text-slate-700",
};

/** Pick the badge classes for a content type, given the active scheme. */
export function typeBadge(ty: string, light: boolean): string {
  return (light ? typeColorLight : typeColor)[ty] ?? typeColor.text;
}
