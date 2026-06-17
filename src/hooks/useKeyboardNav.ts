import { useCallback } from "react";
import { api, Tool } from "../api";
import { NAV } from "../constants";
import { ToolResult } from "../runTool";
import type { Overlay, Section, Zone } from "../types";

interface UseKeyboardNavParams {
  section: Section;
  overlay: Overlay;
  toolsOpen: boolean;
  zone: Zone;
  result: ToolResult | null;
  activeContent: string | undefined;
  sortedTools: Tool[];
  toolSel: number;
  itemsLen: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  setSel: React.Dispatch<React.SetStateAction<number>>;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  setToolSel: React.Dispatch<React.SetStateAction<number>>;
  setResult: (r: ToolResult | null) => void;
  setZone: (z: Zone) => void;
  setOverlay: (o: Overlay) => void;
  goSection: (id: Section) => void;
  openTools: () => void;
  closeTools: () => void;
  focusSearch: () => void;
  copyAndClose: (content: string) => void;
  execTool: (tool: Tool) => void;
  togglePin: () => void;
}

/**
 * The central keyboard handler. Resolves shortcuts (Ctrl+1/2/3, Ctrl+T,
 * Ctrl+S, Escape) first, then dispatches arrow/Enter/typing per focus zone
 * (nav ← list ← tools). Returns a stable `onKeyDown` for window-level binding.
 */
export function useKeyboardNav({
  section,
  overlay,
  toolsOpen,
  zone,
  result,
  activeContent,
  sortedTools,
  toolSel,
  itemsLen,
  inputRef,
  setSel,
  setQuery,
  setToolSel,
  setResult,
  setZone,
  setOverlay,
  goSection,
  openTools,
  closeTools,
  focusSearch,
  copyAndClose,
  execTool,
  togglePin,
}: UseKeyboardNavParams) {
  return useCallback(
    (e: React.KeyboardEvent) => {
      // Section switching (works anywhere).
      if (e.ctrlKey && (e.key === "1" || e.key === "2" || e.key === "3")) {
        e.preventDefault();
        goSection(NAV[Number(e.key) - 1].id);
        setZone("list");
        focusSearch();
        return;
      }
      // Ctrl+T toggles the tools sidebar (needs an item with content).
      if (e.ctrlKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        if (toolsOpen) closeTools();
        else openTools();
        return;
      }
      // Ctrl+S saves the selected history item.
      if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        if (section === "history" && activeContent) setOverlay("save");
        return;
      }
      // Ctrl+P toggles pin/unpin on the selected history clip.
      if (e.ctrlKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        if (section === "history" && activeContent) togglePin();
        return;
      }

      if (e.key === "Escape") {
        if (overlay) {
          setOverlay(null);
          focusSearch();
        } else if (toolsOpen) {
          closeTools();
        } else {
          api.hideWindow("esc");
        }
        return;
      }

      // Overlays (save form / result / tool editor) handle their own keys.
      if (overlay) return;

      // Let editable fields (e.g. the Saved item's name/tags) handle their own
      // typing/arrows/Enter — only the search input feeds the global nav.
      const target = e.target as HTMLElement;
      if (
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        target !== inputRef.current
      ) {
        return;
      }

      // --- Left nav navigation ---
      if (zone === "nav") {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const i = NAV.findIndex((n) => n.id === section);
          goSection(NAV[Math.min(i + 1, NAV.length - 1)].id);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const i = NAV.findIndex((n) => n.id === section);
          goSection(NAV[Math.max(i - 1, 0)].id);
        } else if (e.key === "ArrowRight" || e.key === "Enter") {
          e.preventDefault();
          setZone("list");
          focusSearch();
        }
        return;
      }

      // --- Tools sidebar navigation ---
      if (toolsOpen && zone === "tools") {
        if (result) {
          // Showing a tool result: Enter copies a transformation (if any),
          // ←/Backspace goes back to the tool list.
          if (e.key === "Enter") {
            e.preventDefault();
            if (result.ok && result.result != null) copyAndClose(result.result);
          } else if (e.key === "ArrowLeft" || e.key === "Backspace") {
            e.preventDefault();
            setResult(null);
          }
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setToolSel((s) => Math.min(s + 1, sortedTools.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setToolSel((s) => Math.max(s - 1, 0));
        } else if (e.key === "ArrowLeft") {
          // Going back to the items closes (disables) the tools sidebar.
          e.preventDefault();
          closeTools();
        } else if (e.key === "Enter") {
          e.preventDefault();
          const t = sortedTools[toolSel];
          if (t) execTool(t);
        }
        return;
      }

      // --- Main list navigation ---
      // ← moves focus to the left nav (one step left from the items).
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setZone("nav");
        return;
      }
      if (section === "settings") return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel((s) => Math.min(s + 1, itemsLen - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel((s) => Math.max(s - 1, 0));
      } else if (e.key === "ArrowRight" && activeContent && sortedTools.length > 0) {
        e.preventDefault();
        openTools();
      } else if (e.key === "Enter" && activeContent) {
        e.preventDefault();
        copyAndClose(activeContent);
      } else if (
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        document.activeElement !== inputRef.current
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setQuery((q) => q + e.key);
      }
    },
    [
      section,
      overlay,
      toolsOpen,
      zone,
      result,
      itemsLen,
      activeContent,
      sortedTools,
      toolSel,
      inputRef,
      setSel,
      setQuery,
      setToolSel,
      setResult,
      setZone,
      setOverlay,
      goSection,
      openTools,
      closeTools,
      focusSearch,
      copyAndClose,
      execTool,
      togglePin,
    ]
  );
}
