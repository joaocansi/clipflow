use crate::db::Db;
use arboard::Clipboard;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

/// Spawn a background thread that polls the system clipboard and persists
/// new text entries, emitting `clip-added` so the UI can refresh live.
pub fn start_monitor(app: AppHandle) {
    thread::spawn(move || {
        let mut clipboard = match Clipboard::new() {
            Ok(c) => c,
            Err(e) => {
                eprintln!("[clipflow] clipboard init failed: {e}");
                return;
            }
        };
        let mut last = String::new();
        loop {
            if let Ok(text) = clipboard.get_text() {
                if !text.is_empty() && text != last {
                    last = text.clone();
                    let db = app.state::<Arc<Db>>();
                    match db.insert(&text) {
                        Ok(Some(_)) => {
                            let _ = app.emit("clip-added", ());
                        }
                        Ok(None) => {}
                        Err(e) => eprintln!("[clipflow] insert failed: {e}"),
                    }
                }
            }
            thread::sleep(Duration::from_millis(600));
        }
    });
}

/// Write text to the system clipboard. Updates `last` implicitly on next poll.
pub fn set_clipboard(text: &str) -> anyhow::Result<()> {
    let mut clipboard = Clipboard::new()?;
    clipboard.set_text(text.to_string())?;
    Ok(())
}
