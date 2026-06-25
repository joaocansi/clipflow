import { LuX, LuCheck } from "react-icons/lu";
import { Tool } from "../api";
import { ToolResult } from "../runTool";
import type { Zone } from "../types";

/** Right tools sidebar: lists tools for the selected item, or a tool result. */
export function ToolsSidebar({
  result,
  resultTool,
  sortedTools,
  toolSel,
  zone,
  suggestedIds,
  toolsRef,
  onClose,
  onExec,
  onSetToolSel,
  onClearResult,
  onCopyResult,
}: {
  result: ToolResult | null;
  resultTool: Tool | null;
  sortedTools: Tool[];
  toolSel: number;
  zone: Zone;
  suggestedIds: Set<string>;
  toolsRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onExec: (tool: Tool) => void;
  onSetToolSel: (i: number) => void;
  onClearResult: () => void;
  onCopyResult: (output: string) => void;
}) {
  return (
    <aside className="cf-tools flex w-[280px] shrink-0 flex-col border-l border-[var(--cf-border)] bg-[var(--cf-surface)]">
      <div className="flex min-h-[49px] items-center gap-2 border-b border-[var(--cf-border)] px-3 py-2 text-xs">
        <span className="font-medium text-[var(--cf-text)]">
          {result ? resultTool?.name : "Tools"}
        </span>
        {result && !result.ok && (
          <span className="rounded-md bg-red-500/20 px-1.5 py-0.5 text-[10px] uppercase text-red-300">
            erro
          </span>
        )}
        <button
          onClick={onClose}
          className="ml-auto rounded-md p-1 text-[var(--cf-text-dim)] hover:bg-[var(--cf-hover)] hover:text-[var(--cf-text)]"
          title="Fechar (Ctrl+T)"
        >
          <LuX className="size-3.5" />
        </button>
      </div>

      {result ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {!result.ok ? (
            <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all px-3 py-2 text-xs text-red-300">
              {result.error}
            </pre>
          ) : result.result != null ? (
            <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all px-3 py-2 text-xs text-[var(--cf-text)]">
              {result.result}
            </pre>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-3 py-6 text-center text-xs text-[var(--cf-text-dim)]">
              <LuCheck className="size-6 text-emerald-400" />
              <span>{result.message ?? "Concluído"}</span>
            </div>
          )}

          <div className="flex gap-2 border-t border-[var(--cf-border)] px-3 py-2">
            <button
              onClick={onClearResult}
              className="rounded-lg bg-[var(--cf-hover)] px-2.5 py-1 text-xs text-[var(--cf-text-dim)] hover:bg-[var(--cf-selection)] hover:text-[var(--cf-text)]"
            >
              ← Voltar
            </button>
            {result.ok && result.result != null && (
              <button
                onClick={() => onCopyResult(result.result as string)}
                className="ml-auto rounded-lg bg-[var(--cf-accent-soft)] px-2.5 py-1 text-xs text-[var(--cf-accent-text)] hover:bg-[var(--cf-accent)]"
              >
                Copiar resultado
              </button>
            )}
          </div>
        </div>
      ) : (
        <div ref={toolsRef} className="min-h-0 flex-1 overflow-y-auto p-2">
          {sortedTools.map((t, i) => {
            const activeTool = zone === "tools" && i === toolSel;
            return (
              <button
                key={t.id}
                data-tool={i}
                onClick={() => onExec(t)}
                onMouseEnter={() => zone === "tools" && onSetToolSel(i)}
                className={`mb-1 flex w-full flex-col rounded-xl px-2.5 py-2 text-left transition duration-150 ease-out ${
                  activeTool
                    ? "bg-[var(--cf-selection)] ring-1 ring-inset ring-[var(--cf-accent)]"
                    : "hover:bg-[var(--cf-hover)]"
                }`}
              >
                <span className="flex items-center gap-2 text-sm text-[var(--cf-text)]">
                  {t.name}
                  {suggestedIds.has(t.id) && (
                    <span className="ml-auto rounded-md bg-[var(--cf-accent-soft)] px-1.5 py-0.5 text-[9px] uppercase text-[var(--cf-accent-text)]">
                      sugerida
                    </span>
                  )}
                </span>
                {t.description && (
                  <span className="text-[11px] text-[var(--cf-text-dim)]">{t.description}</span>
                )}
              </button>
            );
          })}
          {sortedTools.length === 0 && (
            <p className="px-1 text-xs text-[var(--cf-text-dim)]">
              Nenhuma tool. Crie uma com “+ Tool”.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
