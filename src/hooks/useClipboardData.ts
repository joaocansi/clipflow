import { useCallback, useEffect, useState } from "react";
import { api, Clip, SavedItem, Tool } from "../api";

/**
 * Owns the three data collections (history clips, saved items, tools) and the
 * functions to (re)load them. Loads everything once on mount; callers trigger
 * reloads on query/section changes and window events.
 */
export function useClipboardData() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);

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

  useEffect(() => {
    reloadClips("");
    reloadSaved("");
    reloadTools();
  }, [reloadClips, reloadSaved, reloadTools]);

  return { clips, saved, tools, reloadClips, reloadSaved, reloadTools };
}
