import { useCallback, useEffect, useState } from "react";
import { api, Clip, Folder, SavedItem, Tool } from "../api";

/**
 * Owns the three data collections (history clips, saved items, tools) and the
 * functions to (re)load them. Loads everything once on mount; callers trigger
 * reloads on query/section changes and window events.
 */
export function useClipboardData() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  const reloadClips = useCallback(async (q: string) => {
    const list = q.trim() ? await api.searchClips(q) : await api.listClips();
    setClips(list);
  }, []);

  const reloadSaved = useCallback(async (q: string) => {
    const list = q.trim() ? await api.searchSaved(q) : await api.listSaved();
    setSaved(list);
  }, []);

  const reloadTools = useCallback(async () => {
    setTools(await api.listTools());
  }, []);

  const reloadFolders = useCallback(async () => {
    setFolders(await api.listFolders());
  }, []);

  useEffect(() => {
    reloadClips("");
    reloadSaved("");
    reloadTools();
    reloadFolders();
  }, [reloadClips, reloadSaved, reloadTools, reloadFolders]);

  return {
    clips,
    saved,
    tools,
    folders,
    reloadClips,
    reloadSaved,
    reloadTools,
    reloadFolders,
  };
}
