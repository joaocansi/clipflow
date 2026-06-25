import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { api, Clip, SavedItem, Tool } from "./api";
import { runTool, toolMatches, ToolResult } from "./runTool";
import { BLANK_TOOL } from "./constants";
import type { Overlay, Section, Zone } from "./types";
import { useClipboardData } from "./hooks/useClipboardData";
import { useThemes } from "./hooks/useThemes";
import { useHideOnBlur } from "./hooks/useHideOnBlur";
import { useGlobalKeydown } from "./hooks/useGlobalKeydown";
import { useKeyboardNav } from "./hooks/useKeyboardNav";
import { Sidebar } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { FolderBar, FolderFilter } from "./components/FolderBar";
import { ClipList } from "./components/ClipList";
import { HistoryDetail } from "./components/HistoryDetail";
import { SavedDetail } from "./components/SavedDetail";
import { SaveForm } from "./components/SaveForm";
import { SettingsView } from "./components/SettingsView";
import { ToolsSidebar } from "./components/ToolsSidebar";
import { Footer } from "./components/Footer";
import { ToolEditor } from "./ToolEditor";

export default function App() {
  const [section, setSection] = useState<Section>("history");
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);

  // Right tools sidebar (disabled until an item is selected and Ctrl+T pressed).
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolSel, setToolSel] = useState(0);
  // Focus zone for keyboard navigation: left nav ← list ← tools.
  const [zone, setZone] = useState<Zone>("list");

  const [overlay, setOverlay] = useState<Overlay>(null);
  const [result, setResult] = useState<ToolResult | null>(null);
  const [resultTool, setResultTool] = useState<Tool | null>(null);
  const [editing, setEditing] = useState<Tool | null>(null);

  // Replays the entrance animation on every open.
  const [openCount, setOpenCount] = useState(0);

  const { clips, saved, tools, folders, reloadClips, reloadSaved, reloadTools, reloadFolders } =
    useClipboardData();
  const { themes, themeId, setThemeId, isLight } = useThemes();

  // Active folder filter for the Saved section.
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const shownAtRef = useRef(0);
  const sectionRef = useRef<Section>(section);
  sectionRef.current = section;

  const focusSearch = useCallback(() => {
    let tries = 0;
    const tick = () => {
      inputRef.current?.focus();
      if (document.activeElement !== inputRef.current && tries++ < 10) {
        requestAnimationFrame(tick);
      }
    };
    tick();
  }, []);

  // Window lifecycle events.
  useEffect(() => {
    const un1 = listen("clip-added", () => {
      if (sectionRef.current === "history") reloadClips("");
    });
    const un2 = listen("window-shown", () => {
      shownAtRef.current = Date.now();
      setOpenCount((n) => n + 1);
      setSection("history");
      setQuery("");
      setOverlay(null);
      setToolsOpen(false);
      setZone("list");
      setSel(0);
      setFolderFilter("all");
      reloadClips("");
      reloadSaved("");
      reloadTools();
      reloadFolders();
      focusSearch();
    });
    return () => {
      un1.then((f) => f());
      un2.then((f) => f());
    };
  }, [reloadClips, reloadSaved, reloadTools, reloadFolders, focusSearch]);

  // Reload the active list when the query or section changes. The reload is
  // debounced so typing in the search box doesn't fire an IPC round-trip +
  // SQLite query on every keystroke; selection resets immediately.
  useEffect(() => {
    setSel(0);
    const id = window.setTimeout(() => {
      if (section === "history") reloadClips(query);
      else if (section === "saved") reloadSaved(query);
    }, 120);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, section]);

  // Saved items narrowed to the active folder filter, plus per-folder counts.
  const visibleSaved = useMemo(() => {
    if (folderFilter === "all") return saved;
    if (folderFilter === "none") return saved.filter((s) => s.folder_id == null);
    return saved.filter((s) => s.folder_id === folderFilter);
  }, [saved, folderFilter]);

  const folderCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of saved) {
      const key = s.folder_id == null ? "none" : String(s.folder_id);
      c[key] = (c[key] ?? 0) + 1;
    }
    return c;
  }, [saved]);

  const items: (Clip | SavedItem)[] =
    section === "history" ? clips : section === "saved" ? visibleSaved : [];
  const active = items[sel];
  const activeContent = active?.content;
  const toolsEnabled = !!activeContent;

  // Keep the selected row in view.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${sel}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [sel, items.length]);

  // Keep the selected tool in view while navigating the tools sidebar.
  useEffect(() => {
    if (zone !== "tools") return;
    const el = toolsRef.current?.querySelector(`[data-tool="${toolSel}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [toolSel, zone]);

  // While in the nav zone, keep keyboard focus on the active nav button.
  useEffect(() => {
    if (zone !== "nav") return;
    const el = navRef.current?.querySelector(
      `[data-nav="${section}"]`
    ) as HTMLElement | null;
    el?.focus();
  }, [zone, section]);

  const sortedTools = useMemo(() => {
    if (!activeContent) return [];
    const matched = tools.filter((t) => toolMatches(t, activeContent));
    const rest = tools.filter((t) => !toolMatches(t, activeContent));
    return [...matched, ...rest];
  }, [tools, activeContent]);

  const suggestedIds = useMemo(
    () =>
      new Set(
        activeContent
          ? tools.filter((t) => toolMatches(t, activeContent)).map((t) => t.id)
          : []
      ),
    [tools, activeContent]
  );

  const copyAndClose = useCallback(async (content: string) => {
    await api.copyClip(content);
    await api.hideWindow("copy-and-close");
  }, []);

  const togglePin = useCallback(() => {
    if (section === "history" && active) {
      api.togglePin((active as Clip).id).then(() => reloadClips(query));
    }
  }, [section, active, reloadClips, query]);

  const selectFolder = useCallback((f: FolderFilter) => {
    setFolderFilter(f);
    setSel(0);
  }, []);

  const createFolder = useCallback(
    async (name: string) => {
      const id = await api.createFolder(name);
      await reloadFolders();
      setFolderFilter(id);
      setSel(0);
    },
    [reloadFolders]
  );

  const deleteFolder = useCallback(
    async (id: number) => {
      await api.deleteFolder(id);
      await Promise.all([reloadFolders(), reloadSaved(query)]);
      setFolderFilter("all");
      setSel(0);
    },
    [reloadFolders, reloadSaved, query]
  );

  const goSection = useCallback((id: Section) => {
    setSection(id);
    setOverlay(null);
    setToolsOpen(false);
    setSel(0);
    setResult(null);
  }, []);

  const navigate = useCallback(
    (id: Section) => {
      goSection(id);
      setZone("list");
      focusSearch();
    },
    [goSection, focusSearch]
  );

  const openTools = useCallback(() => {
    if (!activeContent) return;
    setToolsOpen(true);
    setToolSel(0);
    setZone("tools");
    setResult(null);
  }, [activeContent]);

  const closeTools = useCallback(() => {
    setToolsOpen(false);
    setZone("list");
    setResult(null);
    focusSearch();
  }, [focusSearch]);

  const execTool = useCallback(
    async (tool: Tool) => {
      if (!activeContent) return;
      const r = await runTool(tool, activeContent);
      setResult(r);
      setResultTool(tool);
    },
    [activeContent]
  );

  const onKeyDown = useKeyboardNav({
    section,
    overlay,
    toolsOpen,
    zone,
    result,
    activeContent,
    sortedTools,
    toolSel,
    itemsLen: items.length,
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
  });

  useGlobalKeydown(onKeyDown);
  useHideOnBlur({ overlay, focusSearch, shownAtRef });

  const onScrimMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) api.hideWindow("scrim-click");
  };

  return (
    <div
      key={openCount}
      className="flex h-screen w-screen items-center justify-center bg-transparent"
      onMouseDown={onScrimMouseDown}
    >
      <div className="cf-panel cf-shadow flex h-[560px] w-[920px] overflow-hidden rounded-2xl border border-[var(--cf-border)] bg-[var(--cf-panel)] text-[var(--cf-text)]">
        <Sidebar
          section={section}
          zone={zone}
          navRef={navRef}
          onNavigate={navigate}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          {section !== "settings" && (
            <SearchBar
              section={section}
              query={query}
              onQueryChange={setQuery}
              inputRef={inputRef}
              onNewTool={() => {
                setEditing({ ...BLANK_TOOL });
                setOverlay("editTool");
              }}
            />
          )}

          {overlay === "editTool" && editing ? (
            <ToolEditor
              tool={editing}
              sample={activeContent ?? ""}
              onClose={() => {
                setOverlay(null);
                focusSearch();
              }}
              onSaved={async () => {
                await reloadTools();
                setOverlay(null);
                focusSearch();
              }}
            />
          ) : overlay === "save" && activeContent ? (
            <SaveForm
              content={activeContent}
              folders={folders}
              defaultFolderId={typeof folderFilter === "number" ? folderFilter : null}
              onCancel={() => {
                setOverlay(null);
                focusSearch();
              }}
              onSaved={async (folderId) => {
                await reloadSaved("");
                setOverlay(null);
                setSection("saved");
                setQuery("");
                setFolderFilter(folderId ?? "all");
                setSel(0);
                focusSearch();
              }}
            />
          ) : section === "settings" ? (
            <SettingsView
              active={zone === "list"}
              themes={themes}
              themeId={themeId}
              onSelectTheme={setThemeId}
              onClearedHistory={() => reloadClips("")}
              onExit={() => setZone("nav")}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              {section === "saved" && (
                <FolderBar
                  folders={folders}
                  selected={folderFilter}
                  counts={folderCounts}
                  onSelect={selectFolder}
                  onCreate={createFolder}
                  onDelete={deleteFolder}
                />
              )}
              <div className="flex min-h-0 flex-1">
                <ClipList
                  items={items}
                  section={section}
                  sel={sel}
                  zone={zone}
                  light={isLight}
                  listRef={listRef}
                  onSelect={setSel}
                  onActivate={copyAndClose}
                />

              <div className="flex w-1/2 flex-col">
                {active ? (
                  section === "history" ? (
                    <HistoryDetail
                      clip={active as Clip}
                      light={isLight}
                      onPinToggle={togglePin}
                      onDelete={() =>
                        api.deleteClip((active as Clip).id).then(() => reloadClips(query))
                      }
                      onSave={() => setOverlay("save")}
                      onTools={openTools}
                      toolsEnabled={toolsEnabled}
                    />
                  ) : (
                    <SavedDetail
                      key={(active as SavedItem).id}
                      item={active as SavedItem}
                      folders={folders}
                      onMove={async (fid) => {
                        await api.setSavedFolder((active as SavedItem).id, fid);
                        await reloadSaved(query);
                      }}
                      onUpdated={() => reloadSaved(query)}
                      onDelete={() =>
                        api.deleteSaved((active as SavedItem).id).then(() => reloadSaved(query))
                      }
                      onTools={openTools}
                      toolsEnabled={toolsEnabled}
                    />
                  )
                ) : (
                  <p className="p-4 text-sm text-[var(--cf-text-dim)]">Selecione um item.</p>
                )}
                </div>
              </div>
            </div>
          )}

          <Footer section={section} zone={zone} toolsOpen={toolsOpen} />
        </main>

        {toolsOpen && (
          <ToolsSidebar
            result={result}
            resultTool={resultTool}
            sortedTools={sortedTools}
            toolSel={toolSel}
            zone={zone}
            suggestedIds={suggestedIds}
            toolsRef={toolsRef}
            onClose={closeTools}
            onExec={execTool}
            onSetToolSel={setToolSel}
            onClearResult={() => setResult(null)}
            onCopyResult={copyAndClose}
          />
        )}
      </div>
    </div>
  );
}
