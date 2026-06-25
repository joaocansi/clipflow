import { Clip } from "../api";
import { detectType, typeBadge } from "../detect";
import { ContentPreview } from "./ContentPreview";
import { Kbd } from "./Kbd";

/** Right-hand detail pane for a history clip. */
export function HistoryDetail({
  clip,
  light,
  onPinToggle,
  onDelete,
  onSave,
  onTools,
  toolsEnabled,
}: {
  clip: Clip;
  light: boolean;
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
        <span className={`rounded-md px-1.5 py-0.5 uppercase ${typeBadge(ty, light)}`}>{ty}</span>
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
      <ContentPreview content={clip.content} />
    </>
  );
}
