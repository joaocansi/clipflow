import { useState } from "react";
import { api, Tool } from "./api";

/**
 * Edits a tool's manifest (folder + manifest.toml). Scripts referenced by the
 * `run` command live as files inside the tool's folder and are edited there.
 */
export function ToolEditor({
  tool,
  sample,
  onClose,
  onSaved,
}: {
  tool: Tool;
  sample: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [t, setT] = useState<Tool>(tool);
  const [test, setTest] = useState<string>("");
  const [error, setError] = useState<string>("");
  const isNew = !tool.id;

  function set<K extends keyof Tool>(key: K, value: Tool[K]) {
    setT((prev) => ({ ...prev, [key]: value }));
  }

  function slug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /** Persist the manifest (creating the folder) without closing the editor. */
  async function persist(): Promise<string | null> {
    const id = t.id || slug(t.name);
    if (!id) {
      setError("Name is required");
      return null;
    }
    await api.saveTool({ ...t, id, output_file: t.output_file || "output.json" });
    return id;
  }

  async function save() {
    try {
      const id = await persist();
      if (id) onSaved();
    } catch (e) {
      setError(String(e));
    }
  }

  async function runTest() {
    setError("");
    setTest("");
    try {
      const id = await persist();
      if (!id) return;
      const r = await api.runTool(id, sample);
      if (r.ok) setTest(r.result ?? r.message ?? "Concluído");
      else setError(r.error ?? "erro");
    } catch (e) {
      setError(String(e));
    }
  }

  const field =
    "w-full rounded-lg bg-[var(--cf-surface)] px-2 py-1.5 text-sm text-[var(--cf-text)] outline-none border border-[var(--cf-border)] focus:border-[var(--cf-accent)]";
  const label = "flex flex-col gap-1 text-xs text-[var(--cf-text-dim)]";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={onClose}
          className="text-[var(--cf-text-dim)] hover:text-[var(--cf-text)]"
        >
          ← Back
        </button>
        <h2 className="font-medium">{isNew ? "Nova tool" : `Editar: ${tool.name}`}</h2>
        {!isNew && (
          <button
            onClick={async () => {
              await api.deleteTool(tool.id);
              onSaved();
            }}
            className="ml-auto rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-300 hover:bg-red-500/30"
          >
            Excluir
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          Nome
          <input className={field} value={t.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className={label}>
          Output file
          <input
            className={field}
            value={t.output_file}
            placeholder="output.json"
            onChange={(e) => set("output_file", e.target.value)}
          />
        </label>
      </div>

      <label className={`mt-3 ${label}`}>
        Descrição
        <input
          className={field}
          value={t.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </label>

      <label className={`mt-3 ${label}`}>
        Match (regex — sugere a tool quando casa; opcional)
        <input
          className={`${field} font-mono`}
          value={t.match}
          placeholder="^eyJ..."
          onChange={(e) => set("match", e.target.value)}
        />
      </label>

      <label className={`mt-3 ${label}`}>
        Run (a tool roda na sua pasta e deve escrever o output file)
        <textarea
          className={`${field} h-20 font-mono`}
          value={t.run}
          placeholder="python3 run.py"
          onChange={(e) => set("run", e.target.value)}
        />
      </label>

      <p className="mt-2 text-[11px] text-[var(--cf-text-dim)]">
        O clip chega via stdin e em <code className="text-[var(--cf-text)]">$CLIPFLOW_INPUT</code>.
        Escreva <code className="text-[var(--cf-text)]">{`{"result": "..."}`}</code> (transformação),{" "}
        <code className="text-[var(--cf-text)]">{`{"error": "..."}`}</code> ou{" "}
        <code className="text-[var(--cf-text)]">{`{"message": "..."}`}</code> (ação). Coloque scripts
        na pasta <code className="text-[var(--cf-text)]">~/.config/clipflow/tools/&lt;id&gt;/</code>.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={runTest}
          className="rounded-lg bg-[var(--cf-hover)] px-3 py-1.5 text-sm text-[var(--cf-text)] hover:bg-[var(--cf-selection)]"
        >
          Salvar e testar
        </button>
        <button
          onClick={save}
          className="rounded-lg bg-[var(--cf-accent-soft)] px-3 py-1.5 text-sm text-[var(--cf-accent-text)] hover:bg-[var(--cf-accent)]"
        >
          Salvar
        </button>
      </div>

      {error && (
        <pre className="mt-2 whitespace-pre-wrap break-all rounded-lg bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </pre>
      )}
      {test && !error && (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[var(--cf-surface)] p-2 text-xs text-[var(--cf-text)]">
          {test}
        </pre>
      )}
    </div>
  );
}
