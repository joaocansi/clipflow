//! Tauri commands backing the frontend `api.ts` wrappers. Thin adapters over
//! the `db` / `tools` / `clipboard` modules; each maps domain errors to strings.

use std::sync::Arc;

use crate::clipboard;
use crate::db::{self, Clip, Db};
use crate::error::{e, CmdResult};
use crate::themes::{self, Theme};
use crate::tools::{self, Tool, ToolRun};

// ---- clipboard history ----

#[tauri::command]
pub fn list_clips(db: tauri::State<Arc<Db>>, limit: Option<i64>) -> CmdResult<Vec<Clip>> {
    e(db.list(limit.unwrap_or(200)))
}

#[tauri::command]
pub fn search_clips(
    db: tauri::State<Arc<Db>>,
    query: String,
    limit: Option<i64>,
) -> CmdResult<Vec<Clip>> {
    if query.trim().is_empty() {
        return e(db.list(limit.unwrap_or(200)));
    }
    e(db.search(&query, limit.unwrap_or(200)))
}

#[tauri::command]
pub fn delete_clip(db: tauri::State<Arc<Db>>, id: i64) -> CmdResult<()> {
    e(db.delete(id))
}

#[tauri::command]
pub fn clear_clips(db: tauri::State<Arc<Db>>) -> CmdResult<()> {
    e(db.clear())
}

#[tauri::command]
pub fn toggle_pin(db: tauri::State<Arc<Db>>, id: i64) -> CmdResult<()> {
    e(db.toggle_pin(id))
}

/// Copy a clip back to the clipboard (and persist it as the newest clip).
/// An image data URL is restored as a real image, not as text.
#[tauri::command]
pub fn copy_clip(db: tauri::State<Arc<Db>>, content: String) -> CmdResult<()> {
    e(clipboard::set_clipboard(&content))?;
    let kind = if content.starts_with("data:image/") {
        "image"
    } else {
        "text"
    };
    let _ = db.insert(&content, kind);
    Ok(())
}

// ---- saved items ----

#[tauri::command]
pub fn list_saved(db: tauri::State<Arc<Db>>, limit: Option<i64>) -> CmdResult<Vec<db::SavedItem>> {
    e(db.list_saved(limit.unwrap_or(500)))
}

#[tauri::command]
pub fn search_saved(
    db: tauri::State<Arc<Db>>,
    query: String,
    limit: Option<i64>,
) -> CmdResult<Vec<db::SavedItem>> {
    if query.trim().is_empty() {
        return e(db.list_saved(limit.unwrap_or(500)));
    }
    e(db.search_saved(&query, limit.unwrap_or(500)))
}

#[tauri::command]
pub fn save_item(
    db: tauri::State<Arc<Db>>,
    content: String,
    name: String,
    description: String,
    tags: String,
    folder_id: Option<i64>,
) -> CmdResult<i64> {
    e(db.save_item(&content, &name, &description, &tags, folder_id))
}

#[tauri::command]
pub fn set_saved_folder(
    db: tauri::State<Arc<Db>>,
    id: i64,
    folder_id: Option<i64>,
) -> CmdResult<()> {
    e(db.set_saved_folder(id, folder_id))
}

// ---- folders ----

#[tauri::command]
pub fn list_folders(db: tauri::State<Arc<Db>>) -> CmdResult<Vec<db::Folder>> {
    e(db.list_folders())
}

#[tauri::command]
pub fn create_folder(db: tauri::State<Arc<Db>>, name: String) -> CmdResult<i64> {
    e(db.create_folder(name.trim()))
}

#[tauri::command]
pub fn rename_folder(db: tauri::State<Arc<Db>>, id: i64, name: String) -> CmdResult<()> {
    e(db.rename_folder(id, name.trim()))
}

#[tauri::command]
pub fn delete_folder(db: tauri::State<Arc<Db>>, id: i64) -> CmdResult<()> {
    e(db.delete_folder(id))
}

#[tauri::command]
pub fn update_saved(
    db: tauri::State<Arc<Db>>,
    id: i64,
    name: String,
    description: String,
    tags: String,
) -> CmdResult<()> {
    e(db.update_saved(id, &name, &description, &tags))
}

#[tauri::command]
pub fn delete_saved(db: tauri::State<Arc<Db>>, id: i64) -> CmdResult<()> {
    e(db.delete_saved(id))
}

// ---- settings ----

#[tauri::command]
pub fn get_setting(db: tauri::State<Arc<Db>>, key: String) -> CmdResult<Option<String>> {
    e(db.get_setting(&key))
}

#[tauri::command]
pub fn set_setting(db: tauri::State<Arc<Db>>, key: String, value: String) -> CmdResult<()> {
    e(db.set_setting(&key, &value))
}

#[tauri::command]
pub fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// ---- tools ----

#[tauri::command]
pub fn list_tools() -> CmdResult<Vec<Tool>> {
    e(tools::list_tools())
}

#[tauri::command]
pub fn save_tool(tool: Tool) -> CmdResult<()> {
    e(tools::save_tool(&tool))
}

#[tauri::command]
pub fn delete_tool(id: String) -> CmdResult<()> {
    e(tools::delete_tool(&id))
}

#[tauri::command]
pub fn run_tool(id: String, input: String) -> CmdResult<ToolRun> {
    e(tools::run_tool(&id, &input))
}

// ---- themes ----

#[tauri::command]
pub fn list_themes() -> CmdResult<Vec<Theme>> {
    e(themes::list_themes())
}
