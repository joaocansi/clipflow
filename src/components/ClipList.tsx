import { LuPin } from "react-icons/lu";
import { Clip, SavedItem } from "../api";
import { detectType, typeBadge } from "../detect";
import { timeAgo, splitTags } from "../lib/format";
import type { Section, Zone } from "../types";

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
  return (
    <div ref={listRef} className="w-1/2 overflow-y-auto border-r border-[var(--cf-border)]">
      {items.length === 0 && (
        <p className="p-4 text-sm text-[var(--cf-text-dim)]">
          {section === "history"
            ? "Sem clips ainda. Copie algo."
            : "Nenhum item salvo. Selecione um clip no histórico e pressione Ctrl+S."}
        </p>
      )}
      {items.map((it, i) => {
        const ty = detectType(it.content);
        const isSaved = section === "saved";
        const si = it as SavedItem;
        return (
          <div
            key={it.id}
            data-idx={i}
            onClick={() => onSelect(i)}
            onDoubleClick={() => onActivate(it.content)}
            className={`mx-1.5 my-1 cursor-pointer rounded-xl px-3 py-2 transition duration-150 ease-out ${
              i === sel
                ? zone === "list"
                  ? "bg-[var(--cf-selection)] ring-1 ring-inset ring-[var(--cf-accent)]"
                  : "bg-[var(--cf-selection)]"
                : "hover:bg-[var(--cf-hover)]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] uppercase ${typeBadge(ty, light)}`}
              >
                {ty}
              </span>
              {isSaved && si.name && (
                <span className="truncate text-xs font-medium text-[var(--cf-text)]">
                  {si.name}
                </span>
              )}
              {!isSaved && (it as Clip).pinned && (
                <LuPin className="size-3 text-[var(--cf-text-dim)]" />
              )}
              <span className="ml-auto text-[10px] text-[var(--cf-text-dim)]">
                {timeAgo(it.created_at)}
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-[var(--cf-text)]">{it.content}</p>
            {isSaved && splitTags(si.tags).length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {splitTags(si.tags).map((t) => (
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
      })}
    </div>
  );
}
