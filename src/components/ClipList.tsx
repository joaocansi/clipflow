import { memo } from "react";
import { LuPin } from "react-icons/lu";
import { Clip, SavedItem } from "../api";
import { detectType, typeBadge } from "../detect";
import { timeAgo, splitTags } from "../lib/format";
import { parseColor, cssColor } from "../lib/color";
import type { Section, Zone } from "../types";

/**
 * A single list row. Memoized so that re-renders triggered by selection,
 * theme or zone changes only repaint the rows whose props actually changed —
 * `detectType` (≈9 regexes) then runs for the touched rows instead of every
 * item on every keystroke.
 */
const Row = memo(function Row({
  item,
  index,
  isSaved,
  light,
  selected,
  ring,
  onSelect,
  onActivate,
}: {
  item: Clip | SavedItem;
  index: number;
  isSaved: boolean;
  light: boolean;
  /** This row is the current selection. */
  selected: boolean;
  /** Show the accent ring (selected AND the list zone is focused). */
  ring: boolean;
  onSelect: (i: number) => void;
  onActivate: (content: string) => void;
}) {
  const ty = detectType(item.content);
  const si = item as SavedItem;
  const tags = isSaved ? splitTags(si.tags) : [];
  const color = ty === "color" ? parseColor(item.content) : null;

  return (
    <div
      data-idx={index}
      onClick={() => onSelect(index)}
      onDoubleClick={() => onActivate(item.content)}
      className={`mx-1.5 my-1 cursor-pointer rounded-xl px-3 py-2 transition duration-150 ease-out ${
        selected
          ? ring
            ? "bg-[var(--cf-selection)] ring-1 ring-inset ring-[var(--cf-accent)]"
            : "bg-[var(--cf-selection)]"
          : "hover:bg-[var(--cf-hover)]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] uppercase ${typeBadge(ty, light)}`}>
          {ty}
        </span>
        {isSaved && si.name && (
          <span className="truncate text-xs font-medium text-[var(--cf-text)]">{si.name}</span>
        )}
        {!isSaved && (item as Clip).pinned && (
          <LuPin className="size-3 text-[var(--cf-text-dim)]" />
        )}
        <span className="ml-auto text-[10px] text-[var(--cf-text-dim)]">
          {timeAgo(item.created_at)}
        </span>
      </div>
      {ty === "image" ? (
        <div className="mt-1 flex items-center gap-2">
          <img
            src={item.content}
            alt=""
            className="h-10 w-10 shrink-0 rounded-md border border-[var(--cf-border)] object-cover"
          />
          <span className="text-sm text-[var(--cf-text-dim)]">Imagem</span>
        </div>
      ) : color ? (
        <div className="mt-1 flex items-center gap-2">
          <span
            className="size-4 shrink-0 rounded border border-[var(--cf-border)]"
            style={{ background: cssColor(color) }}
          />
          <span className="truncate text-sm text-[var(--cf-text)]">{item.content}</span>
        </div>
      ) : (
        <p className="mt-1 truncate text-sm text-[var(--cf-text)]">{item.content}</p>
      )}
      {isSaved && tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-md bg-[var(--cf-accent-soft)] px-1.5 py-0.5 text-[9px] text-[var(--cf-accent-text)]"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

/** The scrollable list column of clips (history) or saved items. */
export function ClipList({
  items,
  section,
  sel,
  zone,
  light,
  listRef,
  onSelect,
  onActivate,
}: {
  items: (Clip | SavedItem)[];
  section: Section;
  sel: number;
  zone: Zone;
  light: boolean;
  listRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (i: number) => void;
  onActivate: (content: string) => void;
}) {
  const isSaved = section === "saved";
  return (
    <div ref={listRef} className="w-1/2 overflow-y-auto border-r border-[var(--cf-border)]">
      {items.length === 0 && (
        <p className="p-4 text-sm text-[var(--cf-text-dim)]">
          {section === "history"
            ? "Sem clips ainda. Copie algo."
            : "Nenhum item salvo. Selecione um clip no histórico e pressione Ctrl+S."}
        </p>
      )}
      {items.map((it, i) => (
        <Row
          key={it.id}
          item={it}
          index={i}
          isSaved={isSaved}
          light={light}
          selected={i === sel}
          ring={i === sel && zone === "list"}
          onSelect={onSelect}
          onActivate={onActivate}
        />
      ))}
    </div>
  );
}
