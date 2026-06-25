use rusqlite::Connection;
use serde::Serialize;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

/// A single clipboard history entry.
#[derive(Debug, Serialize, Clone)]
pub struct Clip {
    pub id: i64,
    pub content: String,
    pub created_at: i64,
    pub pinned: bool,
    /// "text" or "image". Image clips store a `data:image/png;base64,…` URL
    /// in `content`; everything else is plain text.
    pub kind: String,
}

/// A user-saved item: a clip promoted with a name, description and tags.
#[derive(Debug, Serialize, Clone)]
pub struct SavedItem {
    pub id: i64,
    pub content: String,
    pub name: String,
    pub description: String,
    /// Comma-separated tags (UI splits/joins on commas).
    pub tags: String,
    pub created_at: i64,
    /// Folder this item belongs to, or None when unfiled.
    pub folder_id: Option<i64>,
}

/// A named collection that groups saved items (e.g. "Dados Pessoais").
#[derive(Debug, Serialize, Clone)]
pub struct Folder {
    pub id: i64,
    pub name: String,
    pub created_at: i64,
}

const DEFAULT_HISTORY_LIMIT: i64 = 200;

/// Thread-safe wrapper around the SQLite connection held in Tauri state.
pub struct Db(pub Mutex<Connection>);

fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

impl Db {
    pub fn open(path: &std::path::Path) -> anyhow::Result<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS clips (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                pinned INTEGER NOT NULL DEFAULT 0,
                kind TEXT NOT NULL DEFAULT 'text'
            );
            CREATE INDEX IF NOT EXISTS idx_clips_created ON clips(created_at DESC);

            CREATE TABLE IF NOT EXISTS saved_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                name TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                tags TEXT NOT NULL DEFAULT '',
                created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_saved_created ON saved_items(created_at DESC);

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );",
        )?;
        // Migrations for databases created before these columns existed.
        // CREATE TABLE IF NOT EXISTS leaves old tables untouched, so add the
        // columns here and ignore the error when they are already present.
        let _ = conn.execute(
            "ALTER TABLE clips ADD COLUMN kind TEXT NOT NULL DEFAULT 'text'",
            [],
        );
        let _ = conn.execute("ALTER TABLE saved_items ADD COLUMN folder_id INTEGER", []);
        Ok(Db(Mutex::new(conn)))
    }

    // ---- settings (key/value) ----

    pub fn get_setting(&self, key: &str) -> anyhow::Result<Option<String>> {
        let conn = self.0.lock().unwrap();
        Ok(conn
            .query_row("SELECT value FROM settings WHERE key = ?1", [key], |r| {
                r.get(0)
            })
            .ok())
    }

    pub fn set_setting(&self, key: &str, value: &str) -> anyhow::Result<()> {
        let conn = self.0.lock().unwrap();
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            rusqlite::params![key, value],
        )?;
        Ok(())
    }

    fn history_limit(conn: &Connection) -> i64 {
        conn.query_row(
            "SELECT value FROM settings WHERE key = 'history_limit'",
            [],
            |r| r.get::<_, String>(0),
        )
        .ok()
        .and_then(|v| v.parse::<i64>().ok())
        .filter(|n| *n > 0)
        .unwrap_or(DEFAULT_HISTORY_LIMIT)
    }

    /// Insert a clip of the given kind ("text" or "image"), skipping if it is
    /// identical to the most recent one. Returns the row id if inserted, None
    /// if it was a duplicate.
    pub fn insert(&self, content: &str, kind: &str) -> anyhow::Result<Option<i64>> {
        if content.trim().is_empty() {
            return Ok(None);
        }
        let conn = self.0.lock().unwrap();
        let last: Option<String> = conn
            .query_row(
                "SELECT content FROM clips ORDER BY created_at DESC, id DESC LIMIT 1",
                [],
                |r| r.get(0),
            )
            .ok();
        if last.as_deref() == Some(content) {
            return Ok(None);
        }
        conn.execute(
            "INSERT INTO clips (content, created_at, pinned, kind) VALUES (?1, ?2, 0, ?3)",
            rusqlite::params![content, now(), kind],
        )?;
        let id = conn.last_insert_rowid();
        // Trim unpinned history beyond the configured limit (newest kept).
        let limit = Self::history_limit(&conn);
        conn.execute(
            "DELETE FROM clips WHERE pinned = 0 AND id NOT IN (
                 SELECT id FROM clips WHERE pinned = 0
                 ORDER BY created_at DESC, id DESC LIMIT ?1
             )",
            [limit],
        )?;
        Ok(Some(id))
    }

    fn map_clip(r: &rusqlite::Row) -> rusqlite::Result<Clip> {
        Ok(Clip {
            id: r.get(0)?,
            content: r.get(1)?,
            created_at: r.get(2)?,
            pinned: r.get::<_, i64>(3)? != 0,
            kind: r.get(4)?,
        })
    }

    pub fn list(&self, limit: i64) -> anyhow::Result<Vec<Clip>> {
        let conn = self.0.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, content, created_at, pinned, kind FROM clips
             ORDER BY pinned DESC, created_at DESC, id DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map([limit], Self::map_clip)?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    pub fn search(&self, query: &str, limit: i64) -> anyhow::Result<Vec<Clip>> {
        let conn = self.0.lock().unwrap();
        let like = format!("%{}%", query);
        let mut stmt = conn.prepare(
            "SELECT id, content, created_at, pinned, kind FROM clips
             WHERE content LIKE ?1
             ORDER BY pinned DESC, created_at DESC, id DESC LIMIT ?2",
        )?;
        let rows = stmt.query_map(rusqlite::params![like, limit], Self::map_clip)?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    pub fn delete(&self, id: i64) -> anyhow::Result<()> {
        let conn = self.0.lock().unwrap();
        conn.execute("DELETE FROM clips WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn clear(&self) -> anyhow::Result<()> {
        let conn = self.0.lock().unwrap();
        conn.execute("DELETE FROM clips WHERE pinned = 0", [])?;
        Ok(())
    }

    pub fn toggle_pin(&self, id: i64) -> anyhow::Result<()> {
        let conn = self.0.lock().unwrap();
        conn.execute("UPDATE clips SET pinned = 1 - pinned WHERE id = ?1", [id])?;
        Ok(())
    }

    // ---- saved items ----

    fn map_saved(r: &rusqlite::Row) -> rusqlite::Result<SavedItem> {
        Ok(SavedItem {
            id: r.get(0)?,
            content: r.get(1)?,
            name: r.get(2)?,
            description: r.get(3)?,
            tags: r.get(4)?,
            created_at: r.get(5)?,
            folder_id: r.get(6)?,
        })
    }

    pub fn save_item(
        &self,
        content: &str,
        name: &str,
        description: &str,
        tags: &str,
        folder_id: Option<i64>,
    ) -> anyhow::Result<i64> {
        let conn = self.0.lock().unwrap();
        conn.execute(
            "INSERT INTO saved_items (content, name, description, tags, created_at, folder_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![content, name, description, tags, now(), folder_id],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn update_saved(
        &self,
        id: i64,
        name: &str,
        description: &str,
        tags: &str,
    ) -> anyhow::Result<()> {
        let conn = self.0.lock().unwrap();
        conn.execute(
            "UPDATE saved_items SET name = ?2, description = ?3, tags = ?4 WHERE id = ?1",
            rusqlite::params![id, name, description, tags],
        )?;
        Ok(())
    }

    pub fn delete_saved(&self, id: i64) -> anyhow::Result<()> {
        let conn = self.0.lock().unwrap();
        conn.execute("DELETE FROM saved_items WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn list_saved(&self, limit: i64) -> anyhow::Result<Vec<SavedItem>> {
        let conn = self.0.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, content, name, description, tags, created_at, folder_id FROM saved_items
             ORDER BY created_at DESC, id DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map([limit], Self::map_saved)?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    pub fn search_saved(&self, query: &str, limit: i64) -> anyhow::Result<Vec<SavedItem>> {
        let conn = self.0.lock().unwrap();
        let like = format!("%{}%", query);
        let mut stmt = conn.prepare(
            "SELECT id, content, name, description, tags, created_at, folder_id FROM saved_items
             WHERE name LIKE ?1 OR description LIKE ?1 OR tags LIKE ?1 OR content LIKE ?1
             ORDER BY created_at DESC, id DESC LIMIT ?2",
        )?;
        let rows = stmt.query_map(rusqlite::params![like, limit], Self::map_saved)?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    /// Move a saved item into a folder (or out of any folder when None).
    pub fn set_saved_folder(&self, id: i64, folder_id: Option<i64>) -> anyhow::Result<()> {
        let conn = self.0.lock().unwrap();
        conn.execute(
            "UPDATE saved_items SET folder_id = ?2 WHERE id = ?1",
            rusqlite::params![id, folder_id],
        )?;
        Ok(())
    }

    // ---- folders ----

    pub fn list_folders(&self) -> anyhow::Result<Vec<Folder>> {
        let conn = self.0.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, created_at FROM folders ORDER BY name COLLATE NOCASE ASC",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(Folder {
                id: r.get(0)?,
                name: r.get(1)?,
                created_at: r.get(2)?,
            })
        })?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    pub fn create_folder(&self, name: &str) -> anyhow::Result<i64> {
        let conn = self.0.lock().unwrap();
        conn.execute(
            "INSERT INTO folders (name, created_at) VALUES (?1, ?2)",
            rusqlite::params![name, now()],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn rename_folder(&self, id: i64, name: &str) -> anyhow::Result<()> {
        let conn = self.0.lock().unwrap();
        conn.execute(
            "UPDATE folders SET name = ?2 WHERE id = ?1",
            rusqlite::params![id, name],
        )?;
        Ok(())
    }

    /// Delete a folder. Its items are kept but become unfiled (folder_id NULL).
    pub fn delete_folder(&self, id: i64) -> anyhow::Result<()> {
        let conn = self.0.lock().unwrap();
        conn.execute("UPDATE saved_items SET folder_id = NULL WHERE folder_id = ?1", [id])?;
        conn.execute("DELETE FROM folders WHERE id = ?1", [id])?;
        Ok(())
    }
}
