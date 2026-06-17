import { useEffect, useRef, useState } from "react";
import { LuCheck } from "react-icons/lu";
import { api, Theme } from "../api";
import { SHORTCUT } from "../constants";

/**
 * Configuration section: theme picker, history limit, clear history, app info.
 *
 * Keyboard model (when `active`): ↑/↓ move through every control (each theme,
 * then the limit input, Salvar, Limpar); ↵ applies the focused control; ←
 * returns to the menu. Handled keys are `stopPropagation`'d so the global nav
 * handler doesn't also act; Ctrl+1/2/3 and Esc still bubble.
 */
export function SettingsView({
  active,
  themes,
  themeId,
  onSelectTheme,
  onClearedHistory,
  onExit,
}: {
  active: boolean;
  themes: Theme[];
  themeId: string;
  onSelectTheme: (id: string) => void;
  onClearedHistory: () => void;
  onExit: () => void;
}) {
  const [limit, setLimit] = useState("200");
  const [version, setVersion] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);

  // Ordered focusable controls: [..themes, limit input, Salvar, Limpar].
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const setRef = (i: number) => (el: HTMLElement | null) => {
    itemRefs.current[i] = el;
  };
  const count = themes.length + 3;
  const limitIdx = themes.length;
  const clearIdx = count - 1;

  useEffect(() => {
    api.getSetting("history_limit").then((v) => v && setLimit(v));
    api.appVersion().then(setVersion);
  }, []);

  // Reset to the first control whenever we (re)enter the settings content.
  useEffect(() => {
    if (active) setFocusIdx(0);
  }, [active]);

  // Move real DOM focus to the selected control while the section is active.
  useEffect(() => {
    if (!active) return;
    itemRefs.current[focusIdx]?.focus();
  }, [active, focusIdx]);

  async function saveLimit() {
    const n = Math.max(1, parseInt(limit, 10) || 200);
    setLimit(String(n));
    await api.setSetting("history_limit", String(n));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }

  function clearHistory() {
    api.clearClips().then(onClearedHistory);
  }

  function activate(idx: number) {
    if (idx < themes.length) onSelectTheme(themes[idx].id);
    else if (idx === clearIdx) clearHistory();
    else saveLimit();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setFocusIdx((i) => Math.min(i + 1, count - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setFocusIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      onExit();
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      activate(focusIdx);
    }
  }

  const focusRing =
    "outline-none focus:ring-1 focus:ring-inset focus:ring-[var(--cf-accent)]";
  const sectionLabel = "text-[11px] uppercase tracking-wide text-[var(--cf-text-dim)]";

  return (
    <div
      onKeyDown={onKeyDown}
      className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 text-sm"
    >
      <h2 className="text-base font-semibold text-[var(--cf-text)]">Configuração</h2>

      <section className="flex flex-col gap-2">
        <span className={sectionLabel}>Tema</span>
        <div className="flex flex-col gap-1">
          {themes.map((t, i) => {
            const selected = t.id === themeId;
            return (
              <button
                key={t.id}
                ref={setRef(i)}
                onClick={() => onSelectTheme(t.id)}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left ${focusRing} ${
                  selected
                    ? "bg-[var(--cf-selection)] text-[var(--cf-text)]"
                    : "text-[var(--cf-text-dim)] hover:bg-[var(--cf-hover)] hover:text-[var(--cf-text)]"
                }`}
              >
                <span
                  className="size-3.5 shrink-0 rounded-full border border-[var(--cf-border)]"
                  style={{ background: t.accent }}
                />
                <span className="flex-1">{t.name}</span>
                {selected && <LuCheck className="size-3.5 text-[var(--cf-accent-text)]" />}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[var(--cf-text-dim)]">
          Crie temas próprios em{" "}
          <code className="text-[var(--cf-text)]">~/.config/clipflow/themes/</code> (um
          arquivo <code className="text-[var(--cf-text)]">.toml</code> por tema).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <span className={sectionLabel}>Histórico</span>
        <div className="flex items-center gap-2">
          <span className="text-[var(--cf-text)]">Limite de itens</span>
          <input
            ref={setRef(limitIdx)}
            type="number"
            min={1}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className={`w-24 rounded-lg border border-[var(--cf-border)] bg-[var(--cf-surface)] px-2.5 py-1 text-sm text-[var(--cf-text)] focus:border-[var(--cf-accent)] ${focusRing}`}
          />
          <button
            ref={setRef(limitIdx + 1)}
            onClick={saveLimit}
            className={`rounded-lg bg-[var(--cf-accent-soft)] px-3 py-1 text-xs text-[var(--cf-accent-text)] hover:bg-[var(--cf-accent)] ${focusRing}`}
          >
            Salvar
          </button>
          {savedFlash && (
            <span className="flex items-center gap-1 text-xs text-emerald-300">
              <LuCheck className="size-3.5" /> salvo
            </span>
          )}
        </div>
        <button
          ref={setRef(clearIdx)}
          onClick={clearHistory}
          className={`w-fit rounded-lg bg-[var(--cf-hover)] px-3 py-1 text-xs text-[var(--cf-text-dim)] hover:bg-red-500/20 hover:text-red-300 ${focusRing}`}
        >
          Limpar histórico (mantém fixados)
        </button>
      </section>

      <section className="flex flex-col gap-1">
        <span className={sectionLabel}>Sobre</span>
        <div className="text-[var(--cf-text-dim)]">
          Atalho global: <span className="text-[var(--cf-text)]">{SHORTCUT}</span>
        </div>
        <div className="text-[var(--cf-text-dim)]">
          Versão: <span className="text-[var(--cf-text)]">{version || "…"}</span>
        </div>
      </section>
    </div>
  );
}
