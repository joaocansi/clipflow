import { useState } from "react";
import { api, SavedItem } from "../api";
import { Kbd } from "./Kbd";
import { TagInput } from "./TagInput";

/** Right-hand detail pane for a saved item (editable name/description/tags). */
export function SavedDetail({
  item,
  onUpdated,
  onDelete,
  onTools,
  toolsEnabled,
}: {
  item: SavedItem;
  onUpdated: () => void;
  onDelete: () => void;
  onTools: () => void;
  toolsEnabled: boolean;
}) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [tags, setTags] = useState(item.tags);
  const dirty =
    name !== item.name || description !== item.description || tags !== item.tags;

  async function save() {
    await api.updateSaved(item.id, name, description, tags);
    onUpdated();
  }

  const field =
    "rounded-lg border border-[var(--cf-border)] bg-[var(--cf-surface)] px-2.5 py-1.5 text-sm text-[var(--cf-text)] outline-none focus:border-[var(--cf-accent)]";
  const label = "text-[10px] uppercase tracking-wide text-[var(--cf-text-dim)]";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 text-xs">
      <label className="flex flex-col gap-1">
        <span className={label}>Nome</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Descrição</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={`resize-none ${field}`}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Tags</span>
        <TagInput value={tags} onChange={setTags} placeholder="ex.: api, token, prod" />
      </label>
      <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-[var(--cf-border)] bg-[var(--cf-surface)] px-2.5 py-1.5 text-[11px] text-[var(--cf-text-dim)]">
        {item.content}
      </pre>
      <div className="mt-auto flex items-center gap-2 pt-1">
        <button
          onClick={onTools}
          disabled={!toolsEnabled}
          className="flex items-center gap-1 rounded-lg bg-[var(--cf-hover)] px-2.5 py-1.5 text-[var(--cf-text-dim)] hover:bg-[var(--cf-selection)] hover:text-[var(--cf-text)] disabled:opacity-40"
        >
          Tools <Kbd>Ctrl</Kbd>
          <Kbd>T</Kbd>
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg bg-[var(--cf-hover)] px-2.5 py-1.5 text-[var(--cf-text-dim)] hover:bg-red-500/20 hover:text-red-300"
        >
          Excluir
        </button>
        <button
          onClick={save}
          disabled={!dirty}
          className="ml-auto rounded-lg bg-[var(--cf-accent-soft)] px-3 py-1.5 text-[var(--cf-accent-text)] hover:bg-[var(--cf-accent)] disabled:opacity-40"
        >
          Salvar alterações
        </button>
      </div>
    </div>
  );
}
