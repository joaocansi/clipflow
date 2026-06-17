import { NAV } from "../constants";
import type { Section, Zone } from "../types";
import { Kbd } from "./Kbd";

/** Left vertical navigation (Histórico / Salvos / Configuração). */
export function Sidebar({
  section,
  zone,
  navRef,
  onNavigate,
}: {
  section: Section;
  zone: Zone;
  navRef: React.RefObject<HTMLElement | null>;
  onNavigate: (id: Section) => void;
}) {
  return (
    <nav
      ref={navRef}
      className="flex w-[190px] shrink-0 flex-col border-r border-[var(--cf-border)] bg-[var(--cf-surface)] p-2"
    >
      <div className="px-2 py-2 text-sm font-semibold tracking-tight text-[var(--cf-text)]">
        ClipFlow
      </div>
      {NAV.map((n) => {
        const navActive = zone === "nav" && section === n.id;
        const Icon = n.Icon;
        return (
          <button
            key={n.id}
            data-nav={n.id}
            onClick={() => onNavigate(n.id)}
            className={`mt-0.5 flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm outline-none transition duration-150 ease-out ${
              section === n.id
                ? "bg-[var(--cf-selection)] text-[var(--cf-text)]"
                : "text-[var(--cf-text-dim)] hover:bg-[var(--cf-hover)] hover:text-[var(--cf-text)]"
            } ${navActive ? "ring-1 ring-inset ring-[var(--cf-accent)]" : ""}`}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{n.label}</span>
          </button>
        );
      })}
      <div className="mt-auto flex items-center gap-1 px-2 pb-1 text-[10px] leading-relaxed text-[var(--cf-text-dim)]">
        <Kbd>←</Kbd>
        <span>menu</span>
      </div>
    </nav>
  );
}
