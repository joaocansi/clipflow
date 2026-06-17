import type { Section, Zone } from "../types";
import { Hint } from "./Kbd";

/** Context-sensitive keyboard hints shown at the bottom of the main area. */
export function Footer({
  section,
  zone,
  toolsOpen,
}: {
  section: Section;
  zone: Zone;
  toolsOpen: boolean;
}) {
  return (
    <div className="flex items-center gap-3 overflow-hidden border-t border-[var(--cf-border)] px-4 py-1.5 text-[10px] text-[var(--cf-text-dim)]">
      {zone === "nav" ? (
        <>
          <Hint keys={["↑", "↓"]} label="seção" />
          <Hint keys={["→"]} label="itens" />
        </>
      ) : toolsOpen && zone === "tools" ? (
        <>
          <Hint keys={["↑", "↓"]} label="tools" />
          <Hint keys={["↵"]} label="executar" />
          <Hint keys={["←"]} label="itens" />
          <Hint keys={["Esc"]} label="fechar" />
        </>
      ) : section === "settings" ? (
        <>
          <Hint keys={["↑", "↓"]} label="navegar" />
          <Hint keys={["↵"]} label="aplicar" />
          <Hint keys={["←"]} label="menu" />
        </>
      ) : (
        <>
          <Hint keys={["↑", "↓"]} label="navegar" />
          <Hint keys={["←"]} label="menu" />
          <Hint keys={["↵"]} label="copiar" />
          <Hint keys={["Esc"]} label="fechar" />
        </>
      )}
    </div>
  );
}
