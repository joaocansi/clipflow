import { useState } from "react";
import { api } from "../api";
import { detectType } from "../detect";
import { parseColor, cssColor, toHex, toRgbString, toHslString } from "../lib/color";

/** One copyable color representation (hex / rgb / hsl). */
function ColorRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await api.copyClip(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 900);
      }}
      className="flex items-center gap-2 rounded-lg border border-[var(--cf-border)] bg-[var(--cf-surface)] px-2.5 py-1.5 text-left hover:border-[var(--cf-accent)]"
    >
      <span className="w-8 text-[10px] uppercase tracking-wide text-[var(--cf-text-dim)]">
        {label}
      </span>
      <span className="flex-1 font-mono text-xs text-[var(--cf-text)]">{value}</span>
      <span className="text-[10px] text-[var(--cf-text-dim)]">{copied ? "copiado!" : "copiar"}</span>
    </button>
  );
}

/** Swatch + clickable hex/rgb/hsl conversions for a color clip. */
function ColorPreview({ content }: { content: string }) {
  const c = parseColor(content)!;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
      <div
        className="h-24 w-full rounded-xl border border-[var(--cf-border)]"
        style={{ background: cssColor(c) }}
      />
      <div className="flex flex-col gap-1.5">
        <ColorRow label="hex" value={toHex(c)} />
        <ColorRow label="rgb" value={toRgbString(c)} />
        <ColorRow label="hsl" value={toHslString(c)} />
      </div>
    </div>
  );
}

/**
 * Renders a clip's body by detected type: an image preview for image clips,
 * a swatch + conversions for colors, otherwise the raw text.
 */
export function ContentPreview({ content }: { content: string }) {
  const ty = detectType(content);

  if (ty === "image") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto border-t border-[var(--cf-border)] bg-[var(--cf-surface)] p-3">
        <img
          src={content}
          alt=""
          className="max-h-full max-w-full rounded-md object-contain"
        />
      </div>
    );
  }

  if (ty === "color" && parseColor(content)) {
    return (
      <div className="min-h-0 flex-1 border-t border-[var(--cf-border)] bg-[var(--cf-surface)]">
        <ColorPreview content={content} />
      </div>
    );
  }

  return (
    <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all border-t border-[var(--cf-border)] bg-[var(--cf-surface)] px-3 py-2 text-xs text-[var(--cf-text)]">
      {content}
    </pre>
  );
}
