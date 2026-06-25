import { useEffect, useRef, useState } from "react";
import { api, Folder } from "../api";
import { TagInput } from "./TagInput";

/** Overlay form for saving a clip as a named/tagged saved item. */
export function SaveForm({
  content,
  folders,
  defaultFolderId,
  onCancel,
  onSaved,
}: {
  content: string;
  folders: Folder[];
  defaultFolderId: number | null;
  onCancel: () => void;
  /** Receives the folder the item was filed into (null when unfiled). */
  onSaved: (folderId: number | null) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [folderId, setFolderId] = useState<number | null>(defaultFolderId);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 30);
  }, []);

  async function save() {
    await api.saveItem(content, name.trim(), description.trim(), tags.trim(), folderId);
    onSaved(folderId);
  }

  const field =
    "rounded-lg border border-[var(--cf-border)] bg-[var(--cf-surface)] px-2.5 py-1.5 text-[var(--cf-text)] outline-none focus:border-[var(--cf-accent)]";
  const label = "text-[10px] uppercase tracking-wide text-[var(--cf-text-dim)]";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 text-sm">
      <h2 className="text-sm font-semibold text-[var(--cf-text)]">Salvar item</h2>
      <label className="flex flex-col gap-1">
        <span className={label}>Nome</span>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
          }}
          placeholder="Nome do item"
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Descrição</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Descrição (opcional)"
          className={`resize-none ${field}`}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Tags</span>
        <TagInput value={tags} onChange={setTags} placeholder="ex.: api, token, prod" />
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Pasta</span>
        <select
          value={folderId ?? ""}
          onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}
          className={field}
        >
          <option value="">Sem pasta</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-1">
        <span className={label}>Conteúdo</span>
        <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-[var(--cf-border)] bg-[var(--cf-surface)] px-2.5 py-1.5 text-xs text-[var(--cf-text-dim)]">
          {content}
        </pre>
      </div>
      <div className="mt-auto flex items-center gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg bg-[var(--cf-hover)] px-3 py-1.5 text-xs text-[var(--cf-text-dim)] hover:bg-[var(--cf-selection)] hover:text-[var(--cf-text)]"
        >
          Cancelar
        </button>
        <button
          onClick={save}
          className="ml-auto rounded-lg bg-[var(--cf-accent-soft)] px-4 py-1.5 text-xs text-[var(--cf-accent-text)] hover:bg-[var(--cf-accent)]"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
