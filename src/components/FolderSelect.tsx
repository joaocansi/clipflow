import { useEffect, useRef, useState } from "react";
import { LuCheck, LuChevronDown } from "react-icons/lu";
import { Folder } from "../api";

/**
 * Folder picker rendered entirely inside the webview. A native `<select>`
 * opens an OS-level popup, which blurs the borderless always-on-top window and
 * trips the hide-on-blur logic (window closes, options detach). This custom
 * dropdown stays in the DOM, so focus never leaves the webview.
 */
export function FolderSelect({
  folders,
  value,
  onChange,
}: {
  folders: Folder[];
  value: number | null;
  onChange: (folderId: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const current = folders.find((f) => f.id === value);
  const label = current ? current.name : "Sem pasta";

  function pick(id: number | null) {
    onChange(id);
    setOpen(false);
  }

  const field =
    "rounded-lg border border-[var(--cf-border)] bg-[var(--cf-surface)] px-2.5 py-1.5 text-sm text-[var(--cf-text)] outline-none";

  const optionCls = (active: boolean) =>
    `flex cursor-pointer items-center justify-between px-2.5 py-1.5 text-sm ${
      active
        ? "bg-[var(--cf-selection)] text-[var(--cf-text)]"
        : "text-[var(--cf-text)] hover:bg-[var(--cf-hover)]"
    }`;

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className={`${field} flex w-full items-center justify-between focus:border-[var(--cf-accent)]`}
      >
        <span className="truncate">{label}</span>
        <LuChevronDown className="size-4 shrink-0 text-[var(--cf-text-dim)]" />
      </button>
      {open && (
        <div className="mt-1 max-h-40 overflow-auto rounded-lg border border-[var(--cf-border)] bg-[var(--cf-panel)] py-1">
          <div className={optionCls(value == null)} onClick={() => pick(null)}>
            <span>Sem pasta</span>
            {value == null && <LuCheck className="size-4" />}
          </div>
          {folders.map((f) => (
            <div key={f.id} className={optionCls(value === f.id)} onClick={() => pick(f.id)}>
              <span className="truncate">{f.name}</span>
              {value === f.id && <LuCheck className="size-4 shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
