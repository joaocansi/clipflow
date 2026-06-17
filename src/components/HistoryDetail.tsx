import { Clip } from "../api";
import { detectType, typeColor } from "../detect";
import { Kbd } from "./Kbd";

/** Right-hand detail pane for a history clip. */
export function HistoryDetail({
  clip,
  onPinToggle,
  onDelete,
  onSave,
  onTools,
  toolsEnabled,
}: {
  clip: Clip;
  onPinToggle: () => void;
  onDelete: () => void;
  onSave: () => void;
  onTools: () => void;
  toolsEnabled: boolean;
}) {
  const ty = detectType(clip.content);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs text-[var(--cf-text-dim)]">
        <span className={`rounded-md px-1.5 py-0.5 uppercase ${typeColor[ty]}`}>{ty}</span>
        <button
          onClick={onPinToggle}
          className="flex items-center gap-1 hover:text-[var(--cf-text)]"
        >
          {clip.pinned ? "Desafixar" : "Fixar"} <Kbd>Ctrl</Kbd>
          <Kbd>P</Kbd>
        </button>
        <button
          onClick={onSave}
          className="flex items-center gap-1 hover:text-[var(--cf-accent-text)]"
        >
          Salvar <Kbd>Ctrl</Kbd>
          <Kbd>S</Kbd>
        </button>
        <button
          onClick={onTools}
          disabled={!toolsEnabled}
          className="flex items-center gap-1 hover:text-[var(--cf-accent-text)] disabled:opacity-40"
        >
          Tools <Kbd>Ctrl</Kbd>
          <Kbd>T</Kbd>
        </button>
        <button onClick={onDelete} className="hover:text-red-400">
          Excluir
        </button>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all border-t border-[var(--cf-border)] bg-[var(--cf-surface)] px-3 py-2 text-xs text-[var(--cf-text)]">
        {clip.content}
      </pre>
    </>
  );
}
