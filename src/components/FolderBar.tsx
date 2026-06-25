import { useEffect, useRef, useState } from "react";
import { LuFolder, LuFolderOpen, LuPlus, LuX } from "react-icons/lu";
import { Folder } from "../api";

/** Which subset of saved items the list shows. */
export type FolderFilter = "all" | "none" | number;

/**
 * Horizontal bar of folder filters for the Saved section: "Todos", "Sem pasta",
 * one chip per folder, and an inline create control. Mouse-driven (MVP).
 */
export function FolderBar({
  folders,
  selected,
  counts,
  onSelect,
  onCreate,
  onDelete,
}: {
  folders: Folder[];
  selected: FolderFilter;
  /** id → number of items; key "none" for unfiled. */
  counts: Record<string, number>;
  onSelect: (f: FolderFilter) => void;
  onCreate: (name: string) => void;
  onDelete: (id: number) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  function commit() {
    const trimmed = name.trim();
    if (trimmed) onCreate(trimmed);
    setName("");
    setCreating(false);
  }

  const chip = (active: boolean) =>
    `flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs transition ${
      active
        ? "bg-[var(--cf-accent-soft)] text-[var(--cf-accent-text)]"
        : "bg-[var(--cf-hover)] text-[var(--cf-text-dim)] hover:text-[var(--cf-text)]"
    }`;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--cf-border)] px-3 py-2">
      <button className={chip(selected === "all")} onClick={() => onSelect("all")}>
        Todos
      </button>
      <button className={chip(selected === "none")} onClick={() => onSelect("none")}>
        Sem pasta
        {counts.none ? <span className="opacity-60">{counts.none}</span> : null}
      </button>

      {folders.map((f) => {
        const active = selected === f.id;
        return (
          <span key={f.id} className={chip(active)}>
            <button
              className="flex items-center gap-1.5"
              onClick={() => onSelect(f.id)}
              title={f.name}
            >
              {active ? <LuFolderOpen className="size-3" /> : <LuFolder className="size-3" />}
              <span className="max-w-[120px] truncate">{f.name}</span>
              {counts[f.id] ? <span className="opacity-60">{counts[f.id]}</span> : null}
            </button>
            {active && (
              <button
                onClick={() => onDelete(f.id)}
                title="Excluir pasta (os itens viram “Sem pasta”)"
                className="hover:text-red-400"
              >
                <LuX className="size-3" />
              </button>
            )}
          </span>
        );
      })}

      {creating ? (
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setName("");
              setCreating(false);
            }
          }}
          onBlur={commit}
          placeholder="Nome da pasta"
          className="w-32 rounded-full border border-[var(--cf-accent)] bg-[var(--cf-surface)] px-2.5 py-1 text-xs text-[var(--cf-text)] outline-none"
        />
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs text-[var(--cf-text-dim)] hover:text-[var(--cf-accent-text)]"
        >
          <LuPlus className="size-3" /> pasta
        </button>
      )}
    </div>
  );
}
