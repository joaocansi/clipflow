/** Lightweight content-type detection used for badges and tool suggestions. */
export function detectType(text: string): string {
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
  if (/^#?[0-9a-fA-F]{6}$/.test(t) || /^#?[0-9a-fA-F]{3}$/.test(t)) return "color";
  if (/^-?\d{10,13}$/.test(t)) return "timestamp";
  if (/^[0-9a-fA-F]{32}$|^[0-9a-fA-F]{40}$|^[0-9a-fA-F]{64}$/.test(t)) return "hash";
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(t) && t.length % 4 === 0 && t.length >= 8)
    return "base64";
  if (/^\//.test(t) && !t.includes(" ")) return "path";
  if (t.split("\n").length > 1) return "multiline";
  return "text";
}

export const typeColor: Record<string, string> = {
  jwt: "bg-purple-500/20 text-purple-300",
  url: "bg-blue-500/20 text-blue-300",
  email: "bg-cyan-500/20 text-cyan-300",
  json: "bg-amber-500/20 text-amber-300",
  color: "bg-pink-500/20 text-pink-300",
  timestamp: "bg-green-500/20 text-green-300",
  hash: "bg-red-500/20 text-red-300",
  base64: "bg-teal-500/20 text-teal-300",
  path: "bg-indigo-500/20 text-indigo-300",
  multiline: "bg-slate-500/20 text-slate-300",
  text: "bg-slate-500/20 text-slate-300",
  empty: "bg-slate-500/20 text-slate-300",
};
