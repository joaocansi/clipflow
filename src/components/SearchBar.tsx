import { LuSearch, LuWrench } from "react-icons/lu";
import type { Section } from "../types";

/** Search input row at the top of the main area (history/saved only). */
export function SearchBar({
  section,
  query,
  onQueryChange,
  inputRef,
  onNewTool,
}: {
  section: Section;
  query: string;
  onQueryChange: (q: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onNewTool: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--cf-border)] px-4 py-3">
      <LuSearch className="size-4 shrink-0 text-[var(--cf-text-dim)]" />
      <input
        ref={inputRef}
        autoFocus
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={
          section === "history" ? "Buscar no histórico…" : "Buscar nos salvos…"
        }
        className="w-full bg-transparent text-base text-[var(--cf-text)] outline-none placeholder:text-[var(--cf-text-dim)]"
      />
      {section === "saved" && (
        <button
          onClick={onNewTool}
          className="flex items-center gap-1 rounded-lg bg-[var(--cf-hover)] px-2.5 py-1 text-xs text-[var(--cf-text-dim)] hover:bg-[var(--cf-selection)] hover:text-[var(--cf-text)]"
          title="Nova tool"
        >
          <LuWrench className="size-3" /> Tool
        </button>
      )}
    </div>
  );
}
