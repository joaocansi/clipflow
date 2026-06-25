import { invoke } from "@tauri-apps/api/core";

export interface Clip {
  id: number;
  content: string;
  created_at: number;
  pinned: boolean;
  /** "text" or "image" (image content is a `data:image/…;base64,` URL). */
  kind: string;
}

export interface SavedItem {
  id: number;
  content: string;
  name: string;
  description: string;
  /** Comma-separated tags. */
  tags: string;
  created_at: number;
  /** Folder this item belongs to, or null when unfiled. */
  folder_id: number | null;
}

/** A named collection that groups saved items. */
export interface Folder {
  id: number;
  name: string;
  created_at: number;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  /** Regex string; when it matches the clip, the tool is suggested first. */
  match: string;
  /** Shell command run with the tool's folder as the working directory. */
  run: string;
  /** File (relative to the tool folder) the command writes its JSON output to. */
  output_file: string;
}

/** Outcome of running a tool (mirrors the backend `ToolRun`). */
export interface ToolRun {
  ok: boolean;
  /** Transformation to copy to the clipboard (success with output). */
  result: string | null;
  /** Info message for action-only tools (success, nothing to copy). */
  message: string | null;
  /** Error message (failure). */
  error: string | null;
}

/** A color theme. Field names map 1:1 to the `--cf-*` CSS variables. */
export interface Theme {
  id: string;
  name: string;
  panel: string;
  surface: string;
  text: string;
  text_dim: string;
  border: string;
  selection: string;
  hover: string;
  accent: string;
  accent_soft: string;
  accent_text: string;
}

export const api = {
  listClips: (limit?: number) => invoke<Clip[]>("list_clips", { limit }),
  searchClips: (query: string, limit?: number) =>
    invoke<Clip[]>("search_clips", { query, limit }),
  deleteClip: (id: number) => invoke<void>("delete_clip", { id }),
  clearClips: () => invoke<void>("clear_clips"),
  togglePin: (id: number) => invoke<void>("toggle_pin", { id }),
  copyClip: (content: string) => invoke<void>("copy_clip", { content }),

  listSaved: (limit?: number) => invoke<SavedItem[]>("list_saved", { limit }),
  searchSaved: (query: string, limit?: number) =>
    invoke<SavedItem[]>("search_saved", { query, limit }),
  saveItem: (
    content: string,
    name: string,
    description: string,
    tags: string,
    folderId: number | null
  ) => invoke<number>("save_item", { content, name, description, tags, folderId }),
  updateSaved: (id: number, name: string, description: string, tags: string) =>
    invoke<void>("update_saved", { id, name, description, tags }),
  deleteSaved: (id: number) => invoke<void>("delete_saved", { id }),
  setSavedFolder: (id: number, folderId: number | null) =>
    invoke<void>("set_saved_folder", { id, folderId }),

  listFolders: () => invoke<Folder[]>("list_folders"),
  createFolder: (name: string) => invoke<number>("create_folder", { name }),
  renameFolder: (id: number, name: string) =>
    invoke<void>("rename_folder", { id, name }),
  deleteFolder: (id: number) => invoke<void>("delete_folder", { id }),

  getSetting: (key: string) => invoke<string | null>("get_setting", { key }),
  setSetting: (key: string, value: string) =>
    invoke<void>("set_setting", { key, value }),
  appVersion: () => invoke<string>("app_version"),

  listTools: () => invoke<Tool[]>("list_tools"),
  saveTool: (tool: Tool) => invoke<void>("save_tool", { tool }),
  deleteTool: (id: string) => invoke<void>("delete_tool", { id }),
  runTool: (id: string, input: string) =>
    invoke<ToolRun>("run_tool", { id, input }),

  listThemes: () => invoke<Theme[]>("list_themes"),

  hideWindow: (reason?: string) => invoke<void>("hide_window", { reason }),
};
